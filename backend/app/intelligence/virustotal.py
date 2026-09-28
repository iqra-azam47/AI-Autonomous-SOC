import json
import logging
import httpx
from app.core.config import settings
from app.intelligence.provider import ThreatIntelligenceProvider, ThreatIntelReport

logger = logging.getLogger("soc.intel.virustotal")

class VirusTotalProvider(ThreatIntelligenceProvider):
    BASE_URL = "https://www.virustotal.com/api/v3/ip_addresses"

    async def lookup_ip(self, ip: str) -> ThreatIntelReport:
        api_key = settings.VIRUSTOTAL_API_KEY
        if not api_key:
            return ThreatIntelReport(
                indicator_type="IP",
                indicator_value=ip,
                source="VirusTotal",
                reputation="CLEAN",
                confidence=0.0,
                integration_configured=False,
                raw_response=json.dumps({"message": "VirusTotal API key not configured in environment"})
            )

        headers = {
            "x-apikey": api_key,
            "Accept": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.BASE_URL}/{ip}", headers=headers)
                if resp.status_code == 200:
                    data = resp.json().get("data", {}).get("attributes", {})
                    stats = data.get("last_analysis_stats", {})
                    malicious_count = stats.get("malicious", 0)
                    suspicious_count = stats.get("suspicious", 0)

                    if malicious_count > 3:
                        rep = "MALICIOUS"
                    elif malicious_count > 0 or suspicious_count > 2:
                        rep = "SUSPICIOUS"
                    else:
                        rep = "CLEAN"

                    confidence = min(1.0, (malicious_count * 0.2) + (suspicious_count * 0.1))

                    return ThreatIntelReport(
                        indicator_type="IP",
                        indicator_value=ip,
                        source="VirusTotal",
                        reputation=rep,
                        country=data.get("country"),
                        asn=str(data.get("asn")),
                        isp=data.get("as_owner"),
                        confidence=confidence,
                        raw_response=json.dumps(stats),
                        integration_configured=True
                    )
                else:
                    logger.warning("VirusTotal responded with status %d", resp.status_code)
        except Exception as e:
            logger.error("Error querying VirusTotal: %s", str(e))

        return ThreatIntelReport(
            indicator_type="IP",
            indicator_value=ip,
            source="VirusTotal",
            reputation="CLEAN",
            confidence=0.0,
            integration_configured=True,
            raw_response=json.dumps({"error": "Failed to reach VirusTotal"})
        )
