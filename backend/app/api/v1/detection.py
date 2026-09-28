from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Anomaly, Event, Alert
from app.api.deps import get_current_user, User
from app.core.config import settings

router = APIRouter(prefix="/detection", tags=["Detection Pipeline"])

@router.get("/rules")
def get_detection_rules(current_user: User = Depends(get_current_user)):
    rules = [
        {
            "id": "RULE-BRUTE-01",
            "name": "Multiple Authentication Failures / Brute Force",
            "category": "BRUTE_FORCE",
            "severity": "HIGH",
            "mitre_id": "T1110",
            "mitre_name": "Brute Force",
            "condition": "failed_logins >= 3 or auth attempts >= 5 in 10s window",
            "status": "ACTIVE"
        },
        {
            "id": "RULE-SCAN-01",
            "name": "Rapid Port Scan Activity",
            "category": "PORT_SCAN",
            "severity": "MEDIUM",
            "mitre_id": "T1046",
            "mitre_name": "Network Service Scanning",
            "condition": "distinct ports > 5 or connection rate > 20 pkts/10s",
            "status": "ACTIVE"
        },
        {
            "id": "RULE-WEB-SQLI",
            "name": "SQL Injection Pattern Detected",
            "category": "WEB_ATTACK",
            "severity": "HIGH",
            "mitre_id": "T1190",
            "mitre_name": "Exploit Public-Facing Application",
            "condition": "matches SQL manipulation regex or union/select syntax in payload",
            "status": "ACTIVE"
        },
        {
            "id": "RULE-WEB-TRAVERSAL",
            "name": "Directory Traversal / Arbitrary File Read",
            "category": "WEB_ATTACK",
            "severity": "HIGH",
            "mitre_id": "T1190",
            "mitre_name": "Exploit Public-Facing Application",
            "condition": "matches ../ or ..\\ or system file identifiers in URI/payload",
            "status": "ACTIVE"
        },
        {
            "id": "RULE-PRIV-01",
            "name": "Unauthorized Privilege Escalation Attempt",
            "category": "PRIVILEGE_ESCALATION",
            "severity": "CRITICAL",
            "mitre_id": "T1068",
            "mitre_name": "Exploitation for Privilege Escalation",
            "condition": "sudo/su execution by non-standard user or UID 0 elevation",
            "status": "ACTIVE"
        },
        {
            "id": "RULE-EXFIL-01",
            "name": "Anomalous High-Volume Outbound Data Exfiltration",
            "category": "DATA_EXFILTRATION",
            "severity": "CRITICAL",
            "mitre_id": "T1048",
            "mitre_name": "Exfiltration Over Alternative Protocol",
            "condition": "outbound transfer volume > 500,000 bytes over non-standard port",
            "status": "ACTIVE"
        },
        {
            "id": "RULE-LOGIN-01",
            "name": "Anomalous Geolocation or Off-Hours Authentication",
            "category": "SUSPICIOUS_LOGIN",
            "severity": "MEDIUM",
            "mitre_id": "T1078",
            "mitre_name": "Valid Accounts",
            "condition": "logon succeeded from unaccustomed source IP or unrecognized ASN",
            "status": "ACTIVE"
        }
    ]
    return rules

@router.get("/correlation")
def get_correlation_rules(current_user: User = Depends(get_current_user)):
    patterns = [
        {
            "id": "CORR-01",
            "name": "Multi-Stage Account Compromise with Privilege Escalation",
            "chain": "AUTH_FAILURE (>=3) -> AUTH_SUCCESS -> PRIVILEGE_ACCESS",
            "mitre_techniques": ["T1110", "T1078", "T1068"],
            "risk_boost": 35.0,
            "window_minutes": 15,
            "status": "ACTIVE"
        },
        {
            "id": "CORR-02",
            "name": "Network Reconnaissance followed by Web Exploitation",
            "chain": "PORT_SCAN -> WEB_ATTACK (SQLi/Traversal)",
            "mitre_techniques": ["T1046", "T1190"],
            "risk_boost": 25.0,
            "window_minutes": 15,
            "status": "ACTIVE"
        },
        {
            "id": "CORR-03",
            "name": "Compromised Session to Data Exfiltration Pipeline",
            "chain": "AUTH_SUCCESS / PRIVILEGE_ACCESS -> DATA_EXFILTRATION (>500KB)",
            "mitre_techniques": ["T1078", "T1048"],
            "risk_boost": 40.0,
            "window_minutes": 15,
            "status": "ACTIVE"
        },
        {
            "id": "CORR-04",
            "name": "Repeated Authentication Attack Campaign",
            "chain": "Cluster of persistent authentication failures from same IP",
            "mitre_techniques": ["T1110"],
            "risk_boost": 20.0,
            "window_minutes": 15,
            "status": "ACTIVE"
        }
    ]
    return patterns

@router.get("/anomalies")
def get_recent_anomalies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    anomalies = (
        db.query(Anomaly)
        .join(Anomaly.event)
        .order_by(Anomaly.created_at.desc())
        .limit(30)
        .all()
    )
    results = []
    for a in anomalies:
        e = a.event
        results.append({
            "id": a.id,
            "anomaly_score": a.anomaly_score,
            "is_anomaly": a.is_anomaly,
            "timestamp": e.timestamp.isoformat(),
            "source_ip": e.source_ip,
            "destination_ip": e.destination_ip,
            "asset_name": e.asset.asset_name if e.asset else "Unassigned",
            "event_type": e.event_type,
            "message": e.message
        })
    return results

@router.get("/risk")
def get_risk_engine_parameters(current_user: User = Depends(get_current_user)):
    return {
        "formula": "Deterministic Multi-Factor Scoring (ML + Anomaly + Rules + Correlation + Asset Criticality + Threat Intel)",
        "scale": "0 - 100",
        "thresholds": {
            "low": {"min": 0, "max": settings.RISK_THRESHOLD_LOW - 1, "label": "LOW"},
            "medium": {"min": settings.RISK_THRESHOLD_LOW, "max": settings.RISK_THRESHOLD_MEDIUM - 1, "label": "MEDIUM"},
            "high": {"min": settings.RISK_THRESHOLD_MEDIUM, "max": settings.RISK_THRESHOLD_HIGH - 1, "label": "HIGH"},
            "critical": {"min": settings.RISK_THRESHOLD_HIGH, "max": 100, "label": "CRITICAL"}
        },
        "weights": {
            "supervised_ml_max": 30.0,
            "isolation_forest_anomaly_max": 20.0,
            "rules_engine_max": 35.0,
            "correlation_pattern_max": 25.0,
            "asset_criticality_max": 15.0,
            "threat_intelligence_max": 20.0
        }
    }
