import json
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Incident, Alert, Event, Asset, AIInvestigation, ModelVersion, SimulationRun

class ReportService:
    @staticmethod
    def generate_incident_report(db: Session, incident_id: str) -> Dict[str, Any]:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError("Incident not found")

        # Events
        events = (
            db.query(Event)
            .join(Event.incident_links)
            .filter(Event.incident_links.any(incident_id=incident.id))
            .order_by(Event.timestamp.asc())
            .all()
        )
        events_data = [
            {
                "timestamp": e.timestamp.isoformat(),
                "source_ip": e.source_ip,
                "event_type": e.event_type,
                "status": e.status,
                "message": e.message,
                "prediction": e.ml_prediction.prediction if e.ml_prediction else "N/A",
                "attack_category": e.ml_prediction.attack_category if e.ml_prediction else "N/A"
            }
            for e in events
        ]

        # MITRE
        mitre_mappings = [
            {
                "technique_id": m.technique.technique_id,
                "name": m.technique.name,
                "tactic": m.technique.tactic,
                "evidence": m.evidence
            }
            for m in incident.mitre_mappings
        ]

        # Latest AI investigation
        latest_inv = (
            db.query(AIInvestigation)
            .filter(AIInvestigation.incident_id == incident.id)
            .order_by(AIInvestigation.created_at.desc())
            .first()
        )

        return {
            "report_type": "INCIDENT_POSTMORTEM",
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "incident": {
                "incident_number": incident.incident_number,
                "title": incident.title,
                "severity": incident.severity,
                "risk_score": incident.risk_score,
                "status": incident.status,
                "source_ip": incident.source_ip,
                "asset": incident.primary_asset.asset_name if incident.primary_asset else "N/A",
                "first_seen": incident.first_seen.isoformat(),
                "last_seen": incident.last_seen.isoformat(),
            },
            "evidence_events": events_data,
            "mitre_techniques": mitre_mappings,
            "ai_investigation": {
                "summary": latest_inv.summary if latest_inv else None,
                "attack_progression": latest_inv.attack_progression if latest_inv else None,
                "recommended_actions": latest_inv.recommended_actions if latest_inv else None,
            } if latest_inv else None,
            "analyst_notes": [
                {"author": n.user.username if n.user else "Unknown", "note": n.note, "timestamp": n.created_at.isoformat()}
                for n in incident.notes
            ]
        }

    @staticmethod
    def generate_security_activity_report(db: Session, hours: int = 24) -> Dict[str, Any]:
        now = datetime.datetime.now(datetime.timezone.utc)
        since = now - datetime.timedelta(hours=hours)

        total_events = db.query(Event).filter(Event.timestamp >= since).count()
        total_alerts = db.query(Alert).filter(Alert.created_at >= since).count()
        total_incidents = db.query(Incident).filter(Incident.created_at >= since).count()

        alerts_by_sev = (
            db.query(Alert.severity, func.count(Alert.id))
            .filter(Alert.created_at >= since)
            .group_by(Alert.severity)
            .all()
        )
        sev_dist = {sev: count for sev, count in alerts_by_sev}

        top_attackers = (
            db.query(Alert.source_ip, func.count(Alert.id).label("cnt"))
            .filter(Alert.created_at >= since, Alert.source_ip.isnot(None))
            .group_by(Alert.source_ip)
            .order_by(func.count(Alert.id).desc())
            .limit(5)
            .all()
        )

        return {
            "report_type": "SECURITY_EXECUTIVE_SUMMARY",
            "time_window_hours": hours,
            "generated_at": now.isoformat(),
            "metrics": {
                "events_ingested": total_events,
                "alerts_triggered": total_alerts,
                "incidents_created": total_incidents,
                "severity_distribution": sev_dist
            },
            "top_threat_actors": [{"ip": ip, "alert_count": cnt} for ip, cnt in top_attackers]
        }

    @staticmethod
    def generate_ml_evaluation_report(db: Session) -> Dict[str, Any]:
        active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
        all_models = db.query(ModelVersion).order_by(ModelVersion.trained_at.desc()).all()

        return {
            "report_type": "ML_SYSTEM_AUDIT",
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "active_model": {
                "name": active_model.name if active_model else "Ensemble",
                "version": active_model.version if active_model else "v1.0.0",
                "algorithm": active_model.algorithm if active_model else "RandomForest + IsolationForest",
                "accuracy": active_model.accuracy if active_model else 1.0,
                "precision": active_model.precision if active_model else 1.0,
                "recall": active_model.recall if active_model else 1.0,
                "f1_score": active_model.f1_score if active_model else 1.0,
                "roc_auc": active_model.roc_auc if active_model else 1.0,
                "false_positive_rate": active_model.false_positive_rate if active_model else 0.0,
            } if active_model else None,
            "registered_versions": [
                {
                    "version": m.version,
                    "algorithm": m.algorithm,
                    "accuracy": m.accuracy,
                    "f1_score": m.f1_score,
                    "trained_at": m.trained_at.isoformat(),
                    "is_active": m.is_active
                }
                for m in all_models
            ]
        }

report_service = ReportService()
