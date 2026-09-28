import uuid
import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, DateTime, Text, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Role(Base):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), unique=True, nullable=False, index=True) # ADMIN, ANALYST, VIEWER
    description = Column(String(255), nullable=True)

    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=True)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    role = relationship("Role", back_populates="users")
    assigned_incidents = relationship("Incident", back_populates="assignee", foreign_keys="Incident.assigned_to")
    notes = relationship("AnalystNote", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    asset_name = Column(String(150), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    hostname = Column(String(150), nullable=True)
    os = Column(String(100), nullable=True)
    asset_type = Column(String(100), nullable=True) # SERVER, WORKSTATION, FIREWALL, CLOUD_INSTANCE
    criticality = Column(String(20), nullable=False, default="MEDIUM", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    owner = Column(String(100), nullable=True)
    status = Column(String(50), default="ACTIVE") # ACTIVE, MAINTENANCE, DECOMMISSIONED
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    events = relationship("Event", back_populates="asset")
    incidents = relationship("Incident", back_populates="primary_asset")

class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, nullable=False, index=True)
    source_ip = Column(String(45), nullable=False, index=True)
    destination_ip = Column(String(45), nullable=True, index=True)
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, nullable=True)
    protocol = Column(String(20), default="TCP")
    username = Column(String(100), nullable=True, index=True)
    asset_id = Column(String(36), ForeignKey("assets.id"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False, index=True) # AUTH_FAILURE, PORT_SCAN, etc.
    action = Column(String(50), default="LOG") # ALLOW, BLOCK, DENY, LOG
    status = Column(String(50), default="SUCCESS") # SUCCESS, FAILURE, ERROR
    message = Column(Text, nullable=True)
    raw_log = Column(Text, nullable=True)
    normalized_data = Column(Text, nullable=True) # JSON representation
    source_type = Column(String(50), default="REAL_UPLOAD") # REAL_UPLOAD, SIMULATION, SEED_DATA
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    asset = relationship("Asset", back_populates="events")
    ml_prediction = relationship("MLPrediction", back_populates="event", uselist=False, cascade="all, delete-orphan")
    anomaly = relationship("Anomaly", back_populates="event", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="event")
    incident_links = relationship("IncidentEvent", back_populates="event")

class MLPrediction(Base):
    __tablename__ = "ml_predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, unique=True, index=True)
    model_version_id = Column(String(36), ForeignKey("model_versions.id"), nullable=True)
    prediction = Column(String(50), nullable=False, index=True) # NORMAL, SUSPICIOUS, MALICIOUS
    confidence = Column(Float, nullable=False)
    attack_category = Column(String(100), nullable=True, index=True) # BRUTE_FORCE, PORT_SCAN, etc.
    prediction_time = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    event = relationship("Event", back_populates="ml_prediction")
    model_version = relationship("ModelVersion", back_populates="predictions")

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, unique=True, index=True)
    anomaly_score = Column(Float, nullable=False)
    is_anomaly = Column(Boolean, default=False, nullable=False, index=True)
    model_version_id = Column(String(36), ForeignKey("model_versions.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    event = relationship("Event", back_populates="anomaly")
    model_version = relationship("ModelVersion", back_populates="anomalies")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False, index=True) # LOW, MEDIUM, HIGH, CRITICAL
    confidence = Column(Float, default=0.8)
    risk_score = Column(Float, nullable=False, index=True)
    detection_type = Column(String(50), nullable=False, index=True) # ML_SUPERVISED, ANOMALY_DETECTION, RULE_MATCH, CORRELATED
    status = Column(String(50), default="NEW", index=True) # NEW, ACKNOWLEDGED, INVESTIGATING, RESOLVED, FALSE_POSITIVE
    source_ip = Column(String(45), nullable=True, index=True)
    asset_id = Column(String(36), ForeignKey("assets.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    event = relationship("Event", back_populates="alerts")
    asset = relationship("Asset")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_number = Column(String(50), unique=True, nullable=False, index=True) # INC-1001
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False, index=True) # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Float, nullable=False, index=True)
    confidence = Column(Float, default=0.85)
    status = Column(String(50), default="OPEN", index=True) # OPEN, INVESTIGATING, CONTAINED, RESOLVED, FALSE_POSITIVE
    source_ip = Column(String(45), nullable=True, index=True)
    primary_asset_id = Column(String(36), ForeignKey("assets.id"), nullable=True, index=True)
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    first_seen = Column(DateTime, nullable=False)
    last_seen = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    primary_asset = relationship("Asset", back_populates="incidents")
    assignee = relationship("User", back_populates="assigned_incidents", foreign_keys=[assigned_to])
    incident_events = relationship("IncidentEvent", back_populates="incident", cascade="all, delete-orphan")
    mitre_mappings = relationship("IncidentMitreTechnique", back_populates="incident", cascade="all, delete-orphan")
    notes = relationship("AnalystNote", back_populates="incident", cascade="all, delete-orphan")
    ai_investigations = relationship("AIInvestigation", back_populates="incident", cascade="all, delete-orphan")

class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    relationship_type = Column(String(50), default="CORRELATED_FLOW") # TRIGGER, CORRELATED_FLOW, SUPPORTING_EVIDENCE
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    incident = relationship("Incident", back_populates="incident_events")
    event = relationship("Event", back_populates="incident_links")

class ThreatIntelligence(Base):
    __tablename__ = "threat_intelligence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    indicator_type = Column(String(50), nullable=False, index=True) # IP, DOMAIN, HASH, URL
    indicator_value = Column(String(255), nullable=False, unique=True, index=True)
    source = Column(String(100), default="AbuseIPDB")
    reputation = Column(String(50), default="CLEAN", index=True) # CLEAN, SUSPICIOUS, MALICIOUS
    country = Column(String(100), nullable=True)
    asn = Column(String(100), nullable=True)
    isp = Column(String(150), nullable=True)
    confidence = Column(Float, default=0.0)
    raw_response = Column(Text, nullable=True) # JSON string
    checked_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

class MitreTechnique(Base):
    __tablename__ = "mitre_techniques"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    technique_id = Column(String(50), unique=True, nullable=False, index=True) # T1110
    name = Column(String(150), nullable=False)
    tactic = Column(String(100), nullable=False, index=True) # Credential Access, etc.
    description = Column(Text, nullable=True)

    incident_mappings = relationship("IncidentMitreTechnique", back_populates="technique")

class IncidentMitreTechnique(Base):
    __tablename__ = "incident_mitre_techniques"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    technique_id = Column(String(36), ForeignKey("mitre_techniques.id"), nullable=False, index=True)
    evidence = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    incident = relationship("Incident", back_populates="mitre_mappings")
    technique = relationship("MitreTechnique", back_populates="incident_mappings")

class AnalystNote(Base):
    __tablename__ = "analyst_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    incident = relationship("Incident", back_populates="notes")
    user = relationship("User", back_populates="notes")

class AIInvestigation(Base):
    __tablename__ = "ai_investigations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    requested_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    summary = Column(Text, nullable=False)
    evidence_analysis = Column(Text, nullable=True)
    attack_progression = Column(Text, nullable=True)
    mitre_analysis = Column(Text, nullable=True)
    recommended_actions = Column(Text, nullable=True)
    limitations = Column(Text, nullable=True)
    model_name = Column(String(100), default="gemini-2.5-flash")
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    incident = relationship("Incident", back_populates="ai_investigations")
    user = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False, index=True)
    resource_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    result = Column(String(50), default="SUCCESS") # SUCCESS, FAILURE
    details = Column(Text, nullable=True) # JSON string
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False, index=True)

    user = relationship("User", back_populates="audit_logs")

class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scenario = Column(String(100), nullable=False, index=True)
    started_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="RUNNING") # RUNNING, COMPLETED, FAILED
    events_generated = Column(Integer, default=0)
    alerts_generated = Column(Integer, default=0)
    incidents_generated = Column(Integer, default=0)
    started_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    results = Column(Text, nullable=True) # JSON summary

    user = relationship("User")

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False, index=True)
    algorithm = Column(String(100), nullable=False)
    dataset_name = Column(String(150), nullable=False)
    features = Column(Text, nullable=False) # JSON array of feature names
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    roc_auc = Column(Float, nullable=True)
    false_positive_rate = Column(Float, nullable=True)
    artifact_path = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=False, nullable=False, index=True)
    trained_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    predictions = relationship("MLPrediction", back_populates="model_version")
    anomalies = relationship("Anomaly", back_populates="model_version")

# Multi-column composite indexes for performance optimization
Index("ix_events_src_dest", Event.source_ip, Event.destination_ip)
Index("ix_events_type_status", Event.event_type, Event.status)
Index("ix_alerts_status_severity", Alert.status, Alert.severity)
Index("ix_incidents_status_severity", Incident.status, Incident.severity)
