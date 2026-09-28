import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Alert, Event, Asset, Incident
from app.schemas.schemas import AlertResponse, AlertStatusUpdate
from app.api.deps import get_current_user, require_roles, User
from app.services.audit_service import audit_service
from app.services.incident_service import incident_service

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("")
def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    severity: Optional[str] = None,
    status: Optional[str] = None,
    detection_type: Optional[str] = None,
    source_ip: Optional[str] = None,
    min_risk: Optional[float] = None
):
    query = db.query(Alert)

    if severity:
        query = query.filter(Alert.severity == severity.upper())
    if status:
        query = query.filter(Alert.status == status.upper())
    if detection_type:
        query = query.filter(Alert.detection_type == detection_type.upper())
    if source_ip:
        query = query.filter(Alert.source_ip.ilike(f"%{source_ip}%"))
    if min_risk is not None:
        query = query.filter(Alert.risk_score >= min_risk)

    total = query.count()
    alerts = (
        query.order_by(Alert.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for a in alerts:
        items.append(AlertResponse(
            id=a.id,
            event_id=a.event_id,
            title=a.title,
            description=a.description,
            severity=a.severity,
            confidence=a.confidence,
            risk_score=a.risk_score,
            detection_type=a.detection_type,
            status=a.status,
            source_ip=a.source_ip,
            asset_id=a.asset_id,
            asset_name=a.asset.asset_name if a.asset else None,
            created_at=a.created_at,
            updated_at=a.updated_at
        ))

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertResponse(
        id=a.id,
        event_id=a.event_id,
        title=a.title,
        description=a.description,
        severity=a.severity,
        confidence=a.confidence,
        risk_score=a.risk_score,
        detection_type=a.detection_type,
        status=a.status,
        source_ip=a.source_ip,
        asset_id=a.asset_id,
        asset_name=a.asset.asset_name if a.asset else None,
        created_at=a.created_at,
        updated_at=a.updated_at
    )

@router.patch("/{alert_id}/status", response_model=AlertResponse)
def update_alert_status(
    alert_id: str,
    req: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ANALYST"]))
):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")

    old_status = a.status
    a.status = req.status.upper()
    a.updated_at = datetime.datetime.now(datetime.timezone.utc)
    
    audit_service.log_action(
        db=db,
        action="alert_status_change",
        resource_type="alert",
        resource_id=a.id,
        user_id=current_user.id,
        details={"old_status": old_status, "new_status": a.status}
    )

    db.commit()
    db.refresh(a)

    return AlertResponse(
        id=a.id,
        event_id=a.event_id,
        title=a.title,
        description=a.description,
        severity=a.severity,
        confidence=a.confidence,
        risk_score=a.risk_score,
        detection_type=a.detection_type,
        status=a.status,
        source_ip=a.source_ip,
        asset_id=a.asset_id,
        asset_name=a.asset.asset_name if a.asset else None,
        created_at=a.created_at,
        updated_at=a.updated_at
    )

@router.post("/{alert_id}/escalate")
def escalate_alert_to_incident(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ANALYST"]))
):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Generate incident
    inc_num = incident_service.generate_next_incident_number(db)
    new_inc = Incident(
        incident_number=inc_num,
        title=f"Manual Escalation: {a.title}",
        description=a.description or "Escalated manually by security analyst from alert",
        severity=a.severity,
        risk_score=a.risk_score,
        confidence=a.confidence,
        status="OPEN",
        source_ip=a.source_ip,
        primary_asset_id=a.asset_id,
        assigned_to=current_user.id,
        first_seen=a.created_at,
        last_seen=a.created_at,
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(new_inc)
    db.flush()

    if a.event_id:
        from app.models.models import IncidentEvent
        db.add(IncidentEvent(
            incident_id=new_inc.id,
            event_id=a.event_id,
            relationship_type="TRIGGER"
        ))

    a.status = "INVESTIGATING"

    audit_service.log_action(
        db=db,
        action="alert_escalation_to_incident",
        resource_type="incident",
        resource_id=new_inc.id,
        user_id=current_user.id,
        details={"alert_id": a.id, "incident_number": new_inc.incident_number}
    )

    db.commit()
    db.refresh(new_inc)

    return {"message": "Alert escalated to incident", "incident_id": new_inc.id, "incident_number": new_inc.incident_number}
