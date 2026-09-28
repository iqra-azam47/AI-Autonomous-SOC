import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import (
    Incident, Event, Asset, User, AnalystNote, AIInvestigation,
    IncidentMitreTechnique, MitreTechnique, IncidentEvent
)
from app.schemas.schemas import (
    IncidentResponse, IncidentDetailResponse, IncidentStatusUpdate,
    IncidentSeverityUpdate, IncidentAssignUpdate, AnalystNoteCreate,
    AnalystNoteResponse, EventResponse, MitreMappingItem, AIInvestigationResponse,
    SimulateContainmentRequest
)
from app.api.deps import get_current_user, require_roles
from app.services.audit_service import audit_service
from app.services.incident_service import incident_service

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("")
def list_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    severity: Optional[str] = None,
    status: Optional[str] = None,
    source_ip: Optional[str] = None,
    assigned_to: Optional[str] = None
):
    query = db.query(Incident)

    if severity:
        query = query.filter(Incident.severity == severity.upper())
    if status:
        query = query.filter(Incident.status == status.upper())
    if source_ip:
        query = query.filter(Incident.source_ip.ilike(f"%{source_ip}%"))
    if assigned_to:
        query = query.filter(Incident.assigned_to == assigned_to)

    total = query.count()
    incidents = (
        query.order_by(Incident.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for inc in incidents:
        items.append(IncidentResponse(
            id=inc.id,
            incident_number=inc.incident_number,
            title=inc.title,
            description=inc.description,
            severity=inc.severity,
            risk_score=inc.risk_score,
            confidence=inc.confidence,
            status=inc.status,
            source_ip=inc.source_ip,
            primary_asset_id=inc.primary_asset_id,
            primary_asset_name=inc.primary_asset.asset_name if inc.primary_asset else None,
            assigned_to=inc.assigned_to,
            assigned_to_name=inc.assignee.username if inc.assignee else None,
            first_seen=inc.first_seen,
            last_seen=inc.last_seen,
            events_count=len(inc.incident_events),
            created_at=inc.created_at,
            updated_at=inc.updated_at
        ))

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident_detail(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Lookup by UUID or human-readable incident number (e.g. INC-1001)
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id)).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Associated events
    events = (
        db.query(Event)
        .join(Event.incident_links)
        .filter(Event.incident_links.any(incident_id=inc.id))
        .order_by(Event.timestamp.asc())
        .all()
    )
    event_responses = []
    for e in events:
        event_responses.append(EventResponse(
            id=e.id,
            timestamp=e.timestamp,
            source_ip=e.source_ip,
            destination_ip=e.destination_ip,
            source_port=e.source_port,
            destination_port=e.destination_port,
            protocol=e.protocol,
            username=e.username,
            asset_id=e.asset_id,
            asset_name=e.asset.asset_name if e.asset else None,
            event_type=e.event_type,
            action=e.action,
            status=e.status,
            message=e.message,
            raw_log=e.raw_log,
            source_type=e.source_type,
            prediction=e.ml_prediction.prediction if e.ml_prediction else "NORMAL",
            confidence=e.ml_prediction.confidence if e.ml_prediction else 0.0,
            attack_category=e.ml_prediction.attack_category if e.ml_prediction else "NORMAL",
            anomaly_score=e.anomaly.anomaly_score if e.anomaly else 0.0,
            is_anomaly=e.anomaly.is_anomaly if e.anomaly else False,
            created_at=e.created_at
        ))

    # MITRE mappings
    mitre_items = []
    for m in inc.mitre_mappings:
        t = m.technique
        mitre_items.append(MitreMappingItem(
            technique_id=t.technique_id,
            name=t.name,
            tactic=t.tactic,
            evidence=m.evidence
        ))

    # Notes
    notes_list = []
    for n in sorted(inc.notes, key=lambda x: x.created_at, reverse=True):
        notes_list.append(AnalystNoteResponse(
            id=n.id,
            user_id=n.user_id,
            username=n.user.username if n.user else "Analyst",
            note=n.note,
            created_at=n.created_at
        ))

    # Latest AI investigation
    latest_inv = (
        db.query(AIInvestigation)
        .filter(AIInvestigation.incident_id == inc.id)
        .order_by(AIInvestigation.created_at.desc())
        .first()
    )
    inv_response = None
    if latest_inv:
        inv_response = AIInvestigationResponse(
            id=latest_inv.id,
            incident_id=latest_inv.incident_id,
            requested_by_name=latest_inv.user.username if latest_inv.user else "System",
            summary=latest_inv.summary,
            evidence_analysis=latest_inv.evidence_analysis,
            attack_progression=latest_inv.attack_progression,
            mitre_analysis=latest_inv.mitre_analysis,
            recommended_actions=latest_inv.recommended_actions,
            limitations=latest_inv.limitations,
            model_name=latest_inv.model_name,
            created_at=latest_inv.created_at
        )

    # Derive risk factor list from severity and characteristics
    risk_factors = [
        f"Base deterministic risk score: {inc.risk_score}/100",
        f"Assessed threat severity: {inc.severity}",
        f"Primary asset impacted: {inc.primary_asset.asset_name if inc.primary_asset else 'Unassigned'}",
        f"Total correlated security events: {len(events)}"
    ]

    return IncidentDetailResponse(
        incident=IncidentResponse(
            id=inc.id,
            incident_number=inc.incident_number,
            title=inc.title,
            description=inc.description,
            severity=inc.severity,
            risk_score=inc.risk_score,
            confidence=inc.confidence,
            status=inc.status,
            source_ip=inc.source_ip,
            primary_asset_id=inc.primary_asset_id,
            primary_asset_name=inc.primary_asset.asset_name if inc.primary_asset else None,
            assigned_to=inc.assigned_to,
            assigned_to_name=inc.assignee.username if inc.assignee else None,
            first_seen=inc.first_seen,
            last_seen=inc.last_seen,
            events_count=len(events),
            created_at=inc.created_at,
            updated_at=inc.updated_at
        ),
        events=event_responses,
        mitre_techniques=mitre_items,
        notes=notes_list,
        latest_investigation=inv_response,
        risk_factors=risk_factors
    )

@router.patch("/{incident_id}/status")
def update_incident_status(
    incident_id: str,
    req: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ANALYST"]))
):
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id)).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_status = inc.status
    inc.status = req.status.upper()
    inc.updated_at = datetime.datetime.now(datetime.timezone.utc)

    audit_service.log_action(
        db=db,
        action="incident_status_change",
        resource_type="incident",
        resource_id=inc.id,
        user_id=current_user.id,
        details={"old_status": old_status, "new_status": inc.status}
    )

    db.commit()
    db.refresh(inc)
    return {"message": "Status updated", "status": inc.status}

@router.patch("/{incident_id}/severity")
def update_incident_severity(
    incident_id: str,
    req: IncidentSeverityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ANALYST"]))
):
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id)).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_sev = inc.severity
    inc.severity = req.severity.upper()
    inc.updated_at = datetime.datetime.now(datetime.timezone.utc)

    audit_service.log_action(
        db=db,
        action="incident_severity_change",
        resource_type="incident",
        resource_id=inc.id,
        user_id=current_user.id,
        details={"old_severity": old_sev, "new_severity": inc.severity}
    )

    db.commit()
    db.refresh(inc)
    return {"message": "Severity updated", "severity": inc.severity}

@router.patch("/{incident_id}/assign")
def assign_incident(
    incident_id: str,
    req: IncidentAssignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ANALYST"]))
):
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id)).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    assignee = None
    if req.assigned_to_id:
        assignee = db.query(User).filter(User.id == req.assigned_to_id).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Assignee user not found")

    inc.assigned_to = assignee.id if assignee else None
    inc.updated_at = datetime.datetime.now(datetime.timezone.utc)

    audit_service.log_action(
        db=db,
        action="incident_assignment",
        resource_type="incident",
        resource_id=inc.id,
        user_id=current_user.id,
        details={"assigned_to": assignee.username if assignee else "Unassigned"}
    )

    db.commit()
    db.refresh(inc)
    return {"message": "Assignment updated", "assigned_to": assignee.username if assignee else None}

@router.post("/{incident_id}/notes", response_model=AnalystNoteResponse)
def add_analyst_note(
    incident_id: str,
    req: AnalystNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ANALYST"]))
):
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id)).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    note = AnalystNote(
        incident_id=inc.id,
        user_id=current_user.id,
        note=req.note
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return AnalystNoteResponse(
        id=note.id,
        user_id=note.user_id,
        username=current_user.username,
        note=note.note,
        created_at=note.created_at
    )

@router.post("/{incident_id}/contain")
def trigger_simulated_containment(
    incident_id: str,
    req: SimulateContainmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ANALYST"]))
):
    inc = db.query(Incident).filter((Incident.id == incident_id) | (Incident.incident_number == incident_id)).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    result = incident_service.simulate_containment(
        db=db,
        incident_id=inc.id,
        user_id=current_user.id,
        containment_type=req.containment_type,
        reason=req.reason
    )
    return result
