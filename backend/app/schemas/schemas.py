import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# -------------------------------------------------------------
# Auth & User Schemas
# -------------------------------------------------------------
class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role_name: str = "ANALYST" # ADMIN, ANALYST, VIEWER

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role_name: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str]
    role_name: str
    is_active: bool
    last_login: Optional[datetime.datetime]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

# -------------------------------------------------------------
# Asset Schemas
# -------------------------------------------------------------
class AssetCreate(BaseModel):
    asset_name: str
    ip_address: str
    hostname: Optional[str] = None
    os: Optional[str] = None
    asset_type: Optional[str] = "SERVER"
    criticality: str = "MEDIUM" # LOW, MEDIUM, HIGH, CRITICAL
    owner: Optional[str] = None

class AssetResponse(BaseModel):
    id: str
    asset_name: str
    ip_address: str
    hostname: Optional[str]
    os: Optional[str]
    asset_type: Optional[str]
    criticality: str
    owner: Optional[str]
    status: str
    event_count: Optional[int] = 0
    alert_count: Optional[int] = 0
    incident_count: Optional[int] = 0
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Event & Normalization Schemas
# -------------------------------------------------------------
class NormalizedEventInput(BaseModel):
    timestamp: Optional[datetime.datetime] = None
    source_ip: str
    destination_ip: Optional[str] = None
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = "TCP"
    username: Optional[str] = None
    asset_name: Optional[str] = None
    event_type: str
    action: Optional[str] = "LOG"
    status: Optional[str] = "SUCCESS"
    message: Optional[str] = None
    raw_log: Optional[str] = None
    source_type: Optional[str] = "REAL_UPLOAD"

class EventResponse(BaseModel):
    id: str
    timestamp: datetime.datetime
    source_ip: str
    destination_ip: Optional[str]
    source_port: Optional[int]
    destination_port: Optional[int]
    protocol: Optional[str]
    username: Optional[str]
    asset_id: Optional[str]
    asset_name: Optional[str] = None
    event_type: str
    action: Optional[str]
    status: Optional[str]
    message: Optional[str]
    raw_log: Optional[str]
    source_type: str
    prediction: Optional[str] = None
    confidence: Optional[float] = None
    attack_category: Optional[str] = None
    anomaly_score: Optional[float] = None
    is_anomaly: Optional[bool] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Alert Schemas
# -------------------------------------------------------------
class AlertResponse(BaseModel):
    id: str
    event_id: Optional[str]
    title: str
    description: Optional[str]
    severity: str # LOW, MEDIUM, HIGH, CRITICAL
    confidence: float
    risk_score: float
    detection_type: str # ML_SUPERVISED, ANOMALY_DETECTION, RULE_MATCH, CORRELATED
    status: str # NEW, ACKNOWLEDGED, INVESTIGATING, RESOLVED, FALSE_POSITIVE
    source_ip: Optional[str]
    asset_id: Optional[str]
    asset_name: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class AlertStatusUpdate(BaseModel):
    status: str # NEW, ACKNOWLEDGED, INVESTIGATING, RESOLVED, FALSE_POSITIVE

# -------------------------------------------------------------
# Incident Schemas
# -------------------------------------------------------------
class IncidentResponse(BaseModel):
    id: str
    incident_number: str
    title: str
    description: Optional[str]
    severity: str
    risk_score: float
    confidence: float
    status: str
    source_ip: Optional[str]
    primary_asset_id: Optional[str]
    primary_asset_name: Optional[str] = None
    assigned_to: Optional[str]
    assigned_to_name: Optional[str] = None
    first_seen: datetime.datetime
    last_seen: datetime.datetime
    events_count: Optional[int] = 0
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class MitreMappingItem(BaseModel):
    technique_id: str
    name: str
    tactic: str
    evidence: Optional[str] = None

class AnalystNoteResponse(BaseModel):
    id: str
    user_id: str
    username: str
    note: str
    created_at: datetime.datetime

class AIInvestigationResponse(BaseModel):
    id: str
    incident_id: str
    requested_by_name: Optional[str]
    summary: str
    evidence_analysis: Optional[str]
    attack_progression: Optional[str]
    mitre_analysis: Optional[str]
    recommended_actions: Optional[str]
    limitations: Optional[str]
    model_name: str
    created_at: datetime.datetime

class IncidentDetailResponse(BaseModel):
    incident: IncidentResponse
    events: List[EventResponse]
    mitre_techniques: List[MitreMappingItem]
    notes: List[AnalystNoteResponse]
    latest_investigation: Optional[AIInvestigationResponse] = None
    risk_factors: List[str] = []

class IncidentStatusUpdate(BaseModel):
    status: str # OPEN, INVESTIGATING, CONTAINED, RESOLVED, FALSE_POSITIVE

class IncidentSeverityUpdate(BaseModel):
    severity: str # LOW, MEDIUM, HIGH, CRITICAL

class IncidentAssignUpdate(BaseModel):
    assigned_to_id: Optional[str]

class AnalystNoteCreate(BaseModel):
    note: str

class SimulateContainmentRequest(BaseModel):
    containment_type: str = "ISOLATE_HOST" # ISOLATE_HOST, BLOCK_IP, REVOKE_CREDENTIALS
    reason: str

# -------------------------------------------------------------
# Threat Intelligence Schemas
# -------------------------------------------------------------
class ThreatIntelligenceResponse(BaseModel):
    indicator_type: str
    indicator_value: str
    source: str
    reputation: str # CLEAN, SUSPICIOUS, MALICIOUS
    country: Optional[str]
    asn: Optional[str]
    isp: Optional[str]
    confidence: float
    total_events: int = 0
    total_alerts: int = 0
    total_incidents: int = 0
    is_private_ip: bool = False
    checked_at: Optional[datetime.datetime]
    integration_configured: bool = True

# -------------------------------------------------------------
# MITRE ATT&CK Schemas
# -------------------------------------------------------------
class MitreTechniqueResponse(BaseModel):
    id: str
    technique_id: str
    name: str
    tactic: str
    description: Optional[str]
    associated_incidents_count: int = 0

# -------------------------------------------------------------
# AI Agent & Chat Schemas
# -------------------------------------------------------------
class AIChatRequest(BaseModel):
    message: str
    incident_id: Optional[str] = None

class AIChatResponse(BaseModel):
    reply: str
    context_used: List[Dict[str, Any]] = []
    model_name: str

# -------------------------------------------------------------
# Simulations Schemas
# -------------------------------------------------------------
class SimulationStartRequest(BaseModel):
    scenario: str # BRUTE_FORCE, PORT_SCAN, SUSPICIOUS_LOGIN, WEB_ATTACK, PRIVILEGE_ESCALATION, DATA_EXFILTRATION

class SimulationRunResponse(BaseModel):
    id: str
    scenario: str
    status: str
    started_by_name: Optional[str]
    events_generated: int
    alerts_generated: int
    incidents_generated: int
    started_at: datetime.datetime
    completed_at: Optional[datetime.datetime]
    results_summary: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# ML Lab & Models Schemas
# -------------------------------------------------------------
class ModelVersionResponse(BaseModel):
    id: str
    name: str
    version: str
    algorithm: str
    dataset_name: str
    features: List[str]
    accuracy: Optional[float]
    precision: Optional[float]
    recall: Optional[float]
    f1_score: Optional[float]
    roc_auc: Optional[float]
    false_positive_rate: Optional[float]
    is_active: bool
    trained_at: datetime.datetime

    class Config:
        from_attributes = True

class MLInferenceTestRequest(BaseModel):
    source_ip: str = "192.168.1.105"
    destination_ip: str = "10.0.0.5"
    source_port: int = 49210
    destination_port: int = 22
    protocol: str = "TCP"
    event_type: str = "AUTH_FAILURE"
    status: str = "FAILURE"
    duration: float = 0.5
    src_bytes: int = 150
    dst_bytes: int = 0
    count_10s: int = 25
    failed_logins: int = 8

class MLInferenceTestResponse(BaseModel):
    prediction: str # NORMAL, SUSPICIOUS, MALICIOUS
    confidence: float
    attack_category: str
    anomaly_score: float
    is_anomaly: bool
    risk_score: float
    risk_factors: List[str]

# -------------------------------------------------------------
# Ingestion Summary Schemas
# -------------------------------------------------------------
class IngestionSummaryResponse(BaseModel):
    records_uploaded: int
    valid_records: int
    invalid_records: int
    events_created: int
    alerts_generated: int
    incidents_generated: int
    errors: List[str] = []

# -------------------------------------------------------------
# Audit Logs & Settings Schemas
# -------------------------------------------------------------
class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str]
    username: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str]
    ip_address: Optional[str]
    result: str
    details: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class SettingsResponse(BaseModel):
    risk_threshold_low: int
    risk_threshold_medium: int
    risk_threshold_high: int
    gemini_configured: bool
    abuseipdb_configured: bool
    virustotal_configured: bool
    data_retention_days: int = 90
    model_version_active: str
