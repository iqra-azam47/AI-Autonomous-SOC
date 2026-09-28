import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import (
    Incident, Event, Alert, IncidentEvent, Asset,
    MitreTechnique, IncidentMitreTechnique, AnalystNote, User
)
from app.services.audit_service import audit_service
from app.detection.rules import RuleMatch
from app.detection.correlation import CorrelationResult

class IncidentService:
    @staticmethod
    def generate_next_incident_number(db: Session) -> str:
        count = db.query(Incident).count()
        return f"INC-{1001 + count}"

    @classmethod
    def process_detection_for_incident(
        cls,
        db: Session,
        event: Event,
        alert: Alert,
        risk_score: float,
        severity: str,
        confidence: float,
        rule_matches: List[RuleMatch],
        correlation_result: CorrelationResult
    ) -> Optional[Incident]:
        """
        Evaluates whether an alert warrants incident creation or escalation.
        Applies deduplication within a 30-minute sliding window.
        """
        # Only create/escalate incidents for MEDIUM, HIGH, or CRITICAL alerts, or correlated attacks
        if severity == "LOW" and not correlation_result.is_correlated and risk_score < 40.0:
            return None

        now = datetime.datetime.now(datetime.timezone.utc)
        time_window = now - datetime.timedelta(minutes=30)

        # Check for open incident with same source_ip and asset within window
        existing_incident = (
            db.query(Incident)
            .filter(
                Incident.source_ip == event.source_ip,
                Incident.status.in_(["OPEN", "INVESTIGATING"]),
                Incident.last_seen >= time_window
            )
            .first()
        )

        if existing_incident:
            # Escalate or append to existing incident
            existing_incident.last_seen = now
            if risk_score > existing_incident.risk_score:
                existing_incident.risk_score = risk_score
                existing_incident.severity = severity
            
            # Link event if not already linked
            already_linked = (
                db.query(IncidentEvent)
                .filter(
                    IncidentEvent.incident_id == existing_incident.id,
                    IncidentEvent.event_id == event.id
                )
                .first()
            )
            if not already_linked:
                inc_event = IncidentEvent(
                    incident_id=existing_incident.id,
                    event_id=event.id,
                    relationship_type="CORRELATED_FLOW"
                )
                db.add(inc_event)
                
            cls._map_mitre_techniques(db, existing_incident.id, rule_matches, correlation_result)
            db.commit()
            db.refresh(existing_incident)
            return existing_incident

        # Otherwise, create a new incident
        inc_number = cls.generate_next_incident_number(db)
        title = alert.title
        if correlation_result.is_correlated and correlation_result.pattern_name:
            title = f"{correlation_result.pattern_name} - {event.source_ip}"

        new_incident = Incident(
            incident_number=inc_number,
            title=title,
            description=alert.description or f"Automated detection pipeline triggered for {event.source_ip}",
            severity=severity,
            risk_score=risk_score,
            confidence=confidence,
            status="OPEN",
            source_ip=event.source_ip,
            primary_asset_id=event.asset_id,
            first_seen=event.timestamp,
            last_seen=event.timestamp,
            created_at=now
        )
        db.add(new_incident)
        db.flush()

        # Link trigger event
        inc_event = IncidentEvent(
            incident_id=new_incident.id,
            event_id=event.id,
            relationship_type="TRIGGER"
        )
        db.add(inc_event)

        # Also link any correlated prior events from sliding window
        if correlation_result.is_correlated and correlation_result.correlated_event_ids:
            for eid in correlation_result.correlated_event_ids:
                if eid != event.id:
                    db.add(IncidentEvent(
                        incident_id=new_incident.id,
                        event_id=eid,
                        relationship_type="SUPPORTING_EVIDENCE"
                    ))

        cls._map_mitre_techniques(db, new_incident.id, rule_matches, correlation_result)

        db.commit()
        db.refresh(new_incident)
        return new_incident

    @staticmethod
    def _map_mitre_techniques(
        db: Session,
        incident_id: str,
        rule_matches: List[RuleMatch],
        correlation_result: CorrelationResult
    ):
        technique_ids = set()
        evidence_dict = {}

        for rm in rule_matches:
            if rm.mitre_technique_id:
                technique_ids.add(rm.mitre_technique_id)
                evidence_dict[rm.mitre_technique_id] = rm.evidence

        if correlation_result.is_correlated:
            for tid in correlation_result.mitre_technique_ids:
                technique_ids.add(tid)
                if tid not in evidence_dict:
                    evidence_dict[tid] = correlation_result.evidence or "Correlated pattern identified"

        for tid in technique_ids:
            technique = db.query(MitreTechnique).filter(MitreTechnique.technique_id == tid).first()
            if technique:
                already_mapped = (
                    db.query(IncidentMitreTechnique)
                    .filter(
                        IncidentMitreTechnique.incident_id == incident_id,
                        IncidentMitreTechnique.technique_id == technique.id
                    )
                    .first()
                )
                if not already_mapped:
                    db.add(IncidentMitreTechnique(
                        incident_id=incident_id,
                        technique_id=technique.id,
                        evidence=evidence_dict.get(tid, "Automated detection correlation")
                    ))

    @staticmethod
    def simulate_containment(
        db: Session,
        incident_id: str,
        user_id: str,
        containment_type: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Executes human-approved simulated containment with audit trail and safety guarantee.
        """
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident {incident_id} not found")

        incident.status = "CONTAINED"
        incident.updated_at = datetime.datetime.now(datetime.timezone.utc)

        # Add analyst note explaining containment
        user = db.query(User).filter(User.id == user_id).first()
        username = user.username if user else "SOC Analyst"
        
        note_text = (
            f"**[SIMULATED CONTAINMENT ACTION]**\n"
            f"- Action: `{containment_type}`\n"
            f"- Justification: {reason}\n"
            f"- Operator: {username}\n"
            f"- *Status: SIMULATION ONLY — no real network or firewall action was performed.*"
        )
        note = AnalystNote(
            incident_id=incident.id,
            user_id=user_id,
            note=note_text
        )
        db.add(note)

        # Audit log
        audit_service.log_action(
            db=db,
            action="simulated_containment",
            resource_type="incident",
            resource_id=incident.id,
            user_id=user_id,
            result="SUCCESS",
            details={
                "incident_number": incident.incident_number,
                "containment_type": containment_type,
                "reason": reason,
                "safety_notice": "SIMULATION ONLY — no real network devices were touched."
            }
        )

        db.commit()
        db.refresh(incident)

        return {
            "status": "CONTAINED",
            "incident_number": incident.incident_number,
            "message": "SIMULATION ONLY — containment recorded successfully in audit log and incident timeline.",
            "is_simulation_only": True
        }

incident_service = IncidentService()
