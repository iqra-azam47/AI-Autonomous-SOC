import json
import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.models import (
    Incident, Event, Asset, Alert, ThreatIntelligence,
    MitreTechnique, IncidentMitreTechnique, AIInvestigation
)
from app.ai.gemini_client import gemini_client
from app.intelligence.service import threat_intel_service

SYSTEM_INVESTIGATOR_PROMPT = """You are an expert autonomous SOC Level-3 Security Analyst and Incident Investigator.
You analyze concrete telemetry from enterprise security events, ML predictions, anomaly detectors, and threat intelligence.

RULES & CONSTRAINTS:
1. Ground your entire analysis strictly in the verified evidence provided.
2. DO NOT invent events, IPs, ports, timestamps, or system activities that are not in the context.
3. Explicitly distinguish between:
   - [OBSERVED EVIDENCE]: Concrete verified logs and network parameters
   - [SYSTEM-DERIVED INFERENCE]: ML predictions, anomaly scores, and rule engine matches
   - [AI HYPOTHESIS]: Your expert analytical assessment of attacker objectives and progression
   - [RECOMMENDED ACTION]: Concrete defensive steps and simulated containment
4. State any uncertainties, gaps, or limitations in the log telemetry clearly.
5. Never propose real destructive commands. Focus on safe host isolation, credential revocation, and log preservation.

You must format your response with the following exact markdown headers:
## 1. Executive Summary
## 2. Evidence Considered
## 3. Attack Progression & Kill Chain
## 4. Detection & ML Analysis
## 5. Potential MITRE ATT&CK Techniques
## 6. Affected Assets & Blast Radius
## 7. Deterministic Risk Interpretation
## 8. Recommended Investigation Steps
## 9. Recommended Containment (Simulated)
## 10. Limitations & Uncertainty
"""

class AgenticInvestigator:
    @staticmethod
    async def gather_incident_context(db: Session, incident: Incident) -> Dict[str, Any]:
        """
        Controlled retrieval tools gathering verified SOC telemetry.
        """
        # 1. Related events
        events_query = (
            db.query(Event)
            .join(Event.incident_links)
            .filter(Event.incident_links.any(incident_id=incident.id))
            .order_by(Event.timestamp.asc())
            .all()
        )
        events_data = []
        for e in events_query:
            events_data.append({
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "source_ip": e.source_ip,
                "destination_ip": e.destination_ip,
                "source_port": e.source_port,
                "destination_port": e.destination_port,
                "protocol": e.protocol,
                "event_type": e.event_type,
                "action": e.action,
                "status": e.status,
                "message": e.message,
                "username": e.username,
                "ml_prediction": e.ml_prediction.prediction if e.ml_prediction else "N/A",
                "ml_confidence": e.ml_prediction.confidence if e.ml_prediction else None,
                "attack_category": e.ml_prediction.attack_category if e.ml_prediction else "N/A",
                "is_anomaly": e.anomaly.is_anomaly if e.anomaly else False,
                "anomaly_score": e.anomaly.anomaly_score if e.anomaly else None,
            })

        # 2. Asset details
        asset_info = None
        if incident.primary_asset:
            a = incident.primary_asset
            asset_info = {
                "name": a.asset_name,
                "ip": a.ip_address,
                "os": a.os,
                "type": a.asset_type,
                "criticality": a.criticality,
                "owner": a.owner,
            }

        # 3. IP Intelligence
        threat_intel = None
        if incident.source_ip:
            ti = await threat_intel_service.get_ip_intelligence(db, incident.source_ip)
            threat_intel = {
                "ip": ti.indicator_value,
                "reputation": ti.reputation,
                "country": ti.country,
                "isp": ti.isp,
                "confidence": ti.confidence,
                "is_private": ti.is_private_ip,
            }

        # 4. MITRE ATT&CK mappings
        mitre_list = []
        mappings = db.query(IncidentMitreTechnique).filter(IncidentMitreTechnique.incident_id == incident.id).all()
        for m in mappings:
            t = m.technique
            mitre_list.append({
                "technique_id": t.technique_id,
                "name": t.name,
                "tactic": t.tactic,
                "evidence": m.evidence
            })

        # 5. Historical incidents
        historical_incidents = (
            db.query(Incident)
            .filter(
                Incident.id != incident.id,
                (Incident.source_ip == incident.source_ip) | (Incident.primary_asset_id == incident.primary_asset_id)
            )
            .limit(5)
            .all()
        )
        history = [
            {"id": h.incident_number, "title": h.title, "severity": h.severity, "status": h.status}
            for h in historical_incidents
        ]

        return {
            "incident": {
                "number": incident.incident_number,
                "title": incident.title,
                "severity": incident.severity,
                "risk_score": incident.risk_score,
                "confidence": incident.confidence,
                "source_ip": incident.source_ip,
                "first_seen": incident.first_seen.isoformat(),
                "last_seen": incident.last_seen.isoformat(),
            },
            "asset": asset_info,
            "events": events_data,
            "threat_intelligence": threat_intel,
            "mitre_techniques": mitre_list,
            "prior_history": history
        }

    @classmethod
    async def investigate_incident(cls, db: Session, incident_id: str, requested_by_user_id: Optional[str] = None) -> Optional[AIInvestigation]:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return None

        context = await cls.gather_incident_context(db, incident)

        prompt = f"""Investigate the following security incident using the verified telemetry below:

INCIDENT METADATA:
{json.dumps(context['incident'], indent=2)}

TARGET ASSET:
{json.dumps(context['asset'], indent=2)}

THREAT INTELLIGENCE:
{json.dumps(context['threat_intelligence'], indent=2)}

MITRE ATT&CK TECHNIQUES:
{json.dumps(context['mitre_techniques'], indent=2)}

RELATED SECURITY EVENTS TIMELINE:
{json.dumps(context['events'], indent=2)}

PRIOR INCIDENT HISTORY FOR THIS IP / ASSET:
{json.dumps(context['prior_history'], indent=2)}

Generate a complete, thorough, professional SOC investigation report according to your system instructions.
"""

        # Call Gemini
        raw_analysis = await gemini_client.generate_content(
            system_instruction=SYSTEM_INVESTIGATOR_PROMPT,
            prompt=prompt
        )

        if not raw_analysis:
            # If Gemini is not configured or unavailable, return None so the API reports the honest error
            return None

        # Parse sections from generated markdown
        sections = cls._extract_sections(raw_analysis)

        investigation = AIInvestigation(
            incident_id=incident.id,
            requested_by=requested_by_user_id,
            summary=sections.get("Executive Summary", raw_analysis[:300]),
            evidence_analysis=sections.get("Evidence Considered", "Detailed evidence logged in events."),
            attack_progression=sections.get("Attack Progression & Kill Chain", "Sequence reconstructed from telemetry."),
            mitre_analysis=sections.get("Potential MITRE ATT&CK Techniques", "Mapped according to behavioral indicators."),
            recommended_actions=sections.get("Recommended Investigation Steps", "Execute credential rotation and network review."),
            limitations=sections.get("Limitations & Uncertainty", "Log telemetry constrained to observed sensors."),
            model_name=gemini_client.model_name
        )

        db.add(investigation)
        try:
            db.commit()
            db.refresh(investigation)
        except Exception:
            db.rollback()
            raise

        return investigation

    @staticmethod
    def _extract_sections(markdown_text: str) -> Dict[str, str]:
        sections = {}
        current_title = "Executive Summary"
        current_lines = []

        for line in markdown_text.splitlines():
            if line.startswith("## "):
                if current_lines:
                    sections[current_title] = "\n".join(current_lines).strip()
                    current_lines = []
                # Remove number prefix if present, e.g. "## 1. Executive Summary" -> "Executive Summary"
                raw_h = line.replace("## ", "").strip()
                if "." in raw_h:
                    parts = raw_h.split(".", 1)
                    current_title = parts[1].strip() if len(parts) > 1 else raw_h
                else:
                    current_title = raw_h
            else:
                current_lines.append(line)

        if current_lines:
            sections[current_title] = "\n".join(current_lines).strip()

        return sections

agentic_investigator = AgenticInvestigator()
