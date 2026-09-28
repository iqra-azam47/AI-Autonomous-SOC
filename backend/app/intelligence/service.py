import ipaddress
import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import ThreatIntelligence, Event, Alert, Incident
from app.intelligence.abuseipdb import AbuseIPDBProvider
from app.intelligence.virustotal import VirusTotalProvider
from app.intelligence.provider import ThreatIntelReport
from app.schemas.schemas import ThreatIntelligenceResponse

class ThreatIntelligenceService:
    def __init__(self):
        self.abuseipdb = AbuseIPDBProvider()
        self.virustotal = VirusTotalProvider()

    @staticmethod
    def is_private_or_internal(ip_str: str) -> bool:
        try:
            ip = ipaddress.ip_address(ip_str)
            return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
        except ValueError:
            return False

    async def get_ip_intelligence(self, db: Session, ip_address: str) -> ThreatIntelligenceResponse:
        # Count local security telemetry related to this IP
        event_count = db.query(Event).filter(Event.source_ip == ip_address).count()
        alert_count = db.query(Alert).filter(Alert.source_ip == ip_address).count()
        incident_count = db.query(Incident).filter(Incident.source_ip == ip_address).count()

        is_priv = self.is_private_or_internal(ip_address)

        # Requirement 16 & 73: Never send internal private IP space to external APIs
        if is_priv:
            return ThreatIntelligenceResponse(
                indicator_type="IP",
                indicator_value=ip_address,
                source="Internal Network (RFC 1918)",
                reputation="SUSPICIOUS" if (alert_count > 0 or incident_count > 0) else "CLEAN",
                country="Internal",
                asn="Private LAN",
                isp="Local Infrastructure",
                confidence=0.85 if alert_count > 0 else 0.0,
                total_events=event_count,
                total_alerts=alert_count,
                total_incidents=incident_count,
                is_private_ip=True,
                checked_at=datetime.datetime.now(datetime.timezone.utc),
                integration_configured=True
            )

        # Check Cache in DB (cache valid for 24 hours)
        now = datetime.datetime.now(datetime.timezone.utc)
        cache_cutoff = now - datetime.timedelta(hours=24)
        
        cached = (
            db.query(ThreatIntelligence)
            .filter(
                ThreatIntelligence.indicator_value == ip_address,
                ThreatIntelligence.indicator_type == "IP"
            )
            .first()
        )

        if cached and cached.checked_at and cached.checked_at.replace(tzinfo=datetime.timezone.utc) > cache_cutoff:
            return ThreatIntelligenceResponse(
                indicator_type=cached.indicator_type,
                indicator_value=cached.indicator_value,
                source=cached.source,
                reputation=cached.reputation,
                country=cached.country,
                asn=cached.asn,
                isp=cached.isp,
                confidence=cached.confidence,
                total_events=event_count,
                total_alerts=alert_count,
                total_incidents=incident_count,
                is_private_ip=False,
                checked_at=cached.checked_at,
                integration_configured=True
            )

        # Query Provider (AbuseIPDB)
        report: ThreatIntelReport = await self.abuseipdb.lookup_ip(ip_address)

        # Save or update cache
        if cached:
            cached.source = report.source
            cached.reputation = report.reputation
            cached.country = report.country
            cached.asn = report.asn
            cached.isp = report.isp
            cached.confidence = report.confidence
            cached.raw_response = report.raw_response
            cached.checked_at = now
        else:
            cached = ThreatIntelligence(
                indicator_type="IP",
                indicator_value=ip_address,
                source=report.source,
                reputation=report.reputation,
                country=report.country,
                asn=report.asn,
                isp=report.isp,
                confidence=report.confidence,
                raw_response=report.raw_response,
                checked_at=now
            )
            db.add(cached)
            
        try:
            db.commit()
            db.refresh(cached)
        except Exception:
            db.rollback()

        return ThreatIntelligenceResponse(
            indicator_type=cached.indicator_type,
            indicator_value=cached.indicator_value,
            source=cached.source,
            reputation=cached.reputation,
            country=cached.country,
            asn=cached.asn,
            isp=cached.isp,
            confidence=cached.confidence,
            total_events=event_count,
            total_alerts=alert_count,
            total_incidents=incident_count,
            is_private_ip=False,
            checked_at=cached.checked_at,
            integration_configured=report.integration_configured
        )

threat_intel_service = ThreatIntelligenceService()
