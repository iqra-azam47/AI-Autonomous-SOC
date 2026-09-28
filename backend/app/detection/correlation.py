from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class CorrelationResult(BaseModel):
    is_correlated: bool
    pattern_name: Optional[str] = None
    confidence: float = 0.0
    risk_boost: float = 0.0
    mitre_technique_ids: List[str] = []
    evidence: Optional[str] = None
    correlated_event_ids: List[str] = []

class CorrelationEngine:
    @staticmethod
    def correlate_event_window(current_event: Dict[str, Any], recent_events: List[Dict[str, Any]]) -> CorrelationResult:
        """
        Analyzes the sequence of events from the same source IP / asset over a sliding window.
        """
        if not recent_events:
            return CorrelationResult(is_correlated=False)

        all_events = recent_events + [current_event]
        event_types = [str(e.get("event_type", "")).upper() for e in all_events]
        actions = [str(e.get("action", "")).upper() for e in all_events]
        statuses = [str(e.get("status", "")).upper() for e in all_events]
        categories = [str(e.get("attack_category", "")).upper() for e in all_events]

        event_ids = [str(e.get("id")) for e in all_events if e.get("id")]

        # Pattern 1: Brute Force -> Success -> Privilege Escalation
        has_failed = any("AUTH_FAILURE" in et or ("AUTH" in et and st == "FAILURE") for et, st in zip(event_types, statuses))
        has_success = any("AUTH_SUCCESS" in et or ("AUTH" in et and st == "SUCCESS") for et, st in zip(event_types, statuses))
        has_priv = any("PRIVILEGE" in et or cat == "PRIVILEGE_ESCALATION" for et, cat in zip(event_types, categories))

        if has_failed and has_success and has_priv:
            return CorrelationResult(
                is_correlated=True,
                pattern_name="Multi-Stage Account Compromise with Privilege Escalation",
                confidence=0.96,
                risk_boost=35.0,
                mitre_technique_ids=["T1110", "T1078", "T1068"],
                evidence="Observed brute-force authentication attempts followed by successful logon and privilege elevation command.",
                correlated_event_ids=event_ids
            )

        # Pattern 2: Port Scanning -> Web Exploit / Access
        has_scan = any("PORT_SCAN" in et or cat == "PORT_SCAN" for et, cat in zip(event_types, categories))
        has_web = any("WEB_ATTACK" in et or cat == "WEB_ATTACK" for et, cat in zip(event_types, categories))

        if has_scan and has_web:
            return CorrelationResult(
                is_correlated=True,
                pattern_name="Network Reconnaissance followed by Web Exploitation",
                confidence=0.92,
                risk_boost=25.0,
                mitre_technique_ids=["T1046", "T1190"],
                evidence="Reconnaissance port scanning activity correlated directly with targeted web application exploits.",
                correlated_event_ids=event_ids
            )

        # Pattern 3: Unauthorized Access -> High-Volume Data Exfiltration
        has_exfil = any("DATA_EXFILTRATION" in et or cat == "DATA_EXFILTRATION" for et, cat in zip(event_types, categories))

        if (has_success or has_priv) and has_exfil:
            return CorrelationResult(
                is_correlated=True,
                pattern_name="Compromised Session to Data Exfiltration Pipeline",
                confidence=0.98,
                risk_boost=40.0,
                mitre_technique_ids=["T1078", "T1048"],
                evidence="Authenticated session initiated anomalous, high-volume outbound data transmission.",
                correlated_event_ids=event_ids
            )

        # Pattern 4: Multiple Failed Logins (> 3)
        failed_count = sum(1 for et, st in zip(event_types, statuses) if "AUTH_FAILURE" in et or st == "FAILURE")
        if failed_count >= 3:
            return CorrelationResult(
                is_correlated=True,
                pattern_name="Repeated Authentication Attack Campaign",
                confidence=0.88,
                risk_boost=20.0,
                mitre_technique_ids=["T1110"],
                evidence=f"Cluster of {failed_count} persistent authentication failures from source IP {current_event.get('source_ip')}.",
                correlated_event_ids=event_ids
            )

        return CorrelationResult(is_correlated=False)

correlation_engine = CorrelationEngine()
