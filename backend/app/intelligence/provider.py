from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel

class ThreatIntelReport(BaseModel):
    indicator_type: str
    indicator_value: str
    source: str
    reputation: str # CLEAN, SUSPICIOUS, MALICIOUS
    country: Optional[str] = None
    asn: Optional[str] = None
    isp: Optional[str] = None
    confidence: float = 0.0
    raw_response: Optional[str] = None
    integration_configured: bool = True

class ThreatIntelligenceProvider(ABC):
    @abstractmethod
    async def lookup_ip(self, ip: str) -> ThreatIntelReport:
        pass
