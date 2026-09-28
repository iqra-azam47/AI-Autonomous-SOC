import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.models import Event, Asset, MLPrediction, Anomaly
from app.schemas.schemas import EventResponse
from app.api.deps import get_current_user, User

router = APIRouter(prefix="/events", tags=["Security Events"])

@router.get("")
def list_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    source_ip: Optional[str] = None,
    destination_ip: Optional[str] = None,
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    prediction: Optional[str] = None,
    search: Optional[str] = None
):
    query = db.query(Event)

    if source_ip:
        query = query.filter(Event.source_ip.ilike(f"%{source_ip}%"))
    if destination_ip:
        query = query.filter(Event.destination_ip.ilike(f"%{destination_ip}%"))
    if event_type:
        query = query.filter(Event.event_type == event_type.upper())
    if status:
        query = query.filter(Event.status == status.upper())
    if prediction:
        query = query.join(Event.ml_prediction).filter(MLPrediction.prediction == prediction.upper())
    if search:
        query = query.filter(
            or_(
                Event.message.ilike(f"%{search}%"),
                Event.username.ilike(f"%{search}%"),
                Event.source_ip.ilike(f"%{search}%")
            )
        )

    total = query.count()
    events = (
        query.order_by(Event.timestamp.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for e in events:
        items.append({
            "id": e.id,
            "timestamp": e.timestamp,
            "source_ip": e.source_ip,
            "destination_ip": e.destination_ip,
            "source_port": e.source_port,
            "destination_port": e.destination_port,
            "protocol": e.protocol,
            "username": e.username,
            "asset_id": e.asset_id,
            "asset_name": e.asset.asset_name if e.asset else None,
            "event_type": e.event_type,
            "action": e.action,
            "status": e.status,
            "message": e.message,
            "raw_log": e.raw_log,
            "source_type": e.source_type,
            "prediction": e.ml_prediction.prediction if e.ml_prediction else "NORMAL",
            "confidence": e.ml_prediction.confidence if e.ml_prediction else 0.0,
            "attack_category": e.ml_prediction.attack_category if e.ml_prediction else "NORMAL",
            "anomaly_score": e.anomaly.anomaly_score if e.anomaly else 0.0,
            "is_anomaly": e.anomaly.is_anomaly if e.anomaly else False,
            "created_at": e.created_at
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.get("/{event_id}", response_model=EventResponse)
def get_event_detail(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    e = db.query(Event).filter(Event.id == event_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Event not found")

    return EventResponse(
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
    )
