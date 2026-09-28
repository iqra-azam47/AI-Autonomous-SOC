import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class RuleMatch(BaseModel):
    rule_id: str
    rule_name: str
    severity: str # LOW, MEDIUM, HIGH, CRITICAL
    category: str
    mitre_technique_id: str
    mitre_name: str
    evidence: str
    confidence: float

class RuleEngine:
    # Signatures for web attacks
    SQLI_PATTERNS = [
        re.compile(r"(\%27)|(\')|(\-\-)|(\%23)|(#)", re.IGNORECASE),
        re.compile(r"\b(union|select|insert|update|delete|drop|truncate)\b", re.IGNORECASE),
        re.compile(r"(\bor\b|\band\b)\s+[\d\w]+\s*=\s*[\d\w]+", re.IGNORECASE)
    ]
    XSS_PATTERNS = [
        re.compile(r"<script.*?>", re.IGNORECASE),
        re.compile(r"javascript:", re.IGNORECASE),
        re.compile(r"onload\s*=", re.IGNORECASE),
        re.compile(r"onerror\s*=", re.IGNORECASE)
    ]
    TRAVERSAL_PATTERNS = [
        re.compile(r"\.\./|\.\.\\", re.IGNORECASE),
        re.compile(r"/etc/passwd|win\.ini|boot\.ini", re.IGNORECASE)
    ]

    @classmethod
    def evaluate_event(cls, event: Dict[str, Any]) -> List[RuleMatch]:
        matches: List[RuleMatch] = []
        raw = str(event.get("raw_log", "") or "")
        msg = str(event.get("message", "") or "")
        combined_text = f"{raw} {msg}".lower()
        
        event_type = str(event.get("event_type", "")).upper()
        status = str(event.get("status", "")).upper()
        dst_port = event.get("destination_port")
        src_bytes = float(event.get("src_bytes", 0) or 0)
        failed_logins = int(event.get("failed_logins", 0) or 0)
        count_10s = int(event.get("count_10s", 1) or 1)

        # 1. Brute Force Rule
        if ("AUTH_FAILURE" in event_type or status == "FAILURE") and (failed_logins >= 3 or count_10s >= 5 or "brute" in combined_text):
            matches.append(RuleMatch(
                rule_id="RULE-BRUTE-01",
                rule_name="Multiple Authentication Failures / Brute Force",
                severity="HIGH",
                category="BRUTE_FORCE",
                mitre_technique_id="T1110",
                mitre_name="Brute Force",
                evidence=f"Detected {max(failed_logins, count_10s)} failed authentications in short succession from {event.get('source_ip')}",
                confidence=0.92
            ))

        # 2. Port Scanning Rule
        if "PORT_SCAN" in event_type or count_10s >= 20 or "syn scan" in combined_text or "scan" in combined_text:
            matches.append(RuleMatch(
                rule_id="RULE-SCAN-01",
                rule_name="Rapid Port Scan Activity",
                severity="MEDIUM",
                category="PORT_SCAN",
                mitre_technique_id="T1046",
                mitre_name="Network Service Scanning",
                evidence=f"Rapid probe connection volume ({count_10s} attempts/10s) to port {dst_port}",
                confidence=0.88
            ))

        # 3. Web Attacks (SQLi, XSS, Path Traversal)
        for pattern in cls.SQLI_PATTERNS:
            if pattern.search(combined_text) or "sqli" in combined_text:
                matches.append(RuleMatch(
                    rule_id="RULE-WEB-SQLI",
                    rule_name="SQL Injection Pattern Detected",
                    severity="HIGH",
                    category="WEB_ATTACK",
                    mitre_technique_id="T1190",
                    mitre_name="Exploit Public-Facing Application",
                    evidence=f"SQL query manipulation payload identified in request to port {dst_port}",
                    confidence=0.95
                ))
                break

        for pattern in cls.TRAVERSAL_PATTERNS:
            if pattern.search(combined_text) or "traversal" in combined_text:
                matches.append(RuleMatch(
                    rule_id="RULE-WEB-TRAVERSAL",
                    rule_name="Directory Traversal / Arbitrary File Read",
                    severity="HIGH",
                    category="WEB_ATTACK",
                    mitre_technique_id="T1190",
                    mitre_name="Exploit Public-Facing Application",
                    evidence=f"Directory traversal path sequence detected in request payload",
                    confidence=0.90
                ))
                break

        # 4. Privilege Escalation Rule
        username = str(event.get("username", "")).lower()
        if "PRIVILEGE" in event_type or "sudo" in combined_text or "privilege escalation" in combined_text or (username in ["root", "administrator"] and status == "SUCCESS" and "elevation" in combined_text):
            matches.append(RuleMatch(
                rule_id="RULE-PRIV-01",
                rule_name="Unauthorized Privilege Escalation Attempt",
                severity="CRITICAL",
                category="PRIVILEGE_ESCALATION",
                mitre_technique_id="T1068",
                mitre_name="Exploitation for Privilege Escalation",
                evidence=f"Privilege alteration command observed for user {username} on asset {event.get('asset_name', 'target')}",
                confidence=0.94
            ))

        # 5. Data Exfiltration Outbound Volume
        if src_bytes > 500000 or "exfil" in combined_text or "data exfiltration" in combined_text:
            matches.append(RuleMatch(
                rule_id="RULE-EXFIL-01",
                rule_name="Anomalous High-Volume Outbound Data Exfiltration",
                severity="CRITICAL",
                category="DATA_EXFILTRATION",
                mitre_technique_id="T1048",
                mitre_name="Exfiltration Over Alternative Protocol",
                evidence=f"Massive outbound transfer detected: {int(src_bytes):,} bytes transmitted to {event.get('destination_ip', 'external')}",
                confidence=0.96
            ))

        # 6. Suspicious Login
        if "SUSPICIOUS_LOGIN" in event_type or "suspicious login" in combined_text:
            matches.append(RuleMatch(
                rule_id="RULE-LOGIN-01",
                rule_name="Anomalous Geolocation or Off-Hours Authentication",
                severity="MEDIUM",
                category="SUSPICIOUS_LOGIN",
                mitre_technique_id="T1078",
                mitre_name="Valid Accounts",
                evidence=f"Authentication succeeded from unaccustomed source IP {event.get('source_ip')}",
                confidence=0.85
            ))

        return matches

rule_engine = RuleEngine()
