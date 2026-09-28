import json
import logging
import httpx
from app.core.config import settings
from app.intelligence.provider import ThreatIntelligenceProvider, ThreatIntelReport

logger = logging.getLogger("soc.intel.abuseipdb")

class AbuseIPDBProvider(ThreatIntelligenceProvider):
    BASE_URL = "https://api.abuseipdb.com/api/v2/check"

    async def lookup_ip(self, ip: str) -> ThreatIntelReport:
        api_key = settings.ABUSEIPDB_API_KEY
        if not api_key:
            return ThreatIntelReport(
                indicator_type="IP",
                indicator_value=ip,
                source="AbuseIPDB",
                reputation="CLEAN",
                confidence=0.0,
                integration_configured=False,
                raw_response=json.dumps({"message": "AbuseIPDB API key not configured in environment"})
            )

        headers = {
            "Accept": "application/json",
            "Key": api_key
        }
        params = {
            "ipAddress": ip,
            "maxAgeInDays": 90,
            "verbose": True
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(self.BASE_URL, headers=headers, params=params)
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    abuse_score = data.get("abuseConfidenceScore", 0)
                    if abuse_score > 50:
                        rep = "MALICIOUS"
                    elif abuse_score > 15:
                        rep = "SUSPICIOUS"
                    else:
                        rep = "CLEAN"

                    return ThreatIntelReport(
                        indicator_type="IP",
                        indicator_value=ip,
                        source="AbuseIPDB",
                        reputation=rep,
                        country=data.get("countryCode"),
                        isp=data.get("isp"),
                        confidence=float(abuse_score) / 100.0,
                        raw_response=json.dumps(data),
                        integration_configured=True
                    )
                else:
                    logger.warning("AbuseIPDB responded with status %d: %s", resp.status_code, resp.text)
        except Exception as e:
            logger.error("Error connecting to AbuseIPDB: %s", str(e))

        return ThreatIntelReport(
            indicator_type="IP",
            indicator_value=ip,
            source="AbuseIPDB",
            reputation="CLEAN",
            confidence=0.0,
            integration_configured=True,
            raw_response=json.dumps({"error": "Failed to reach external provider"})
        )
