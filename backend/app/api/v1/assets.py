from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Asset, Event, Alert, Incident
from app.schemas.schemas import AssetResponse, AssetCreate
from app.api.deps import get_current_user, require_roles, User

router = APIRouter(prefix="/assets", tags=["Assets"])

@router.get("", response_model=List[AssetResponse])
def list_assets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assets = db.query(Asset).order_by(Asset.criticality.desc(), Asset.asset_name.asc()).all()
    results = []
    for a in assets:
        ev_count = db.query(Event).filter(Event.asset_id == a.id).count()
        al_count = db.query(Alert).filter(Alert.asset_id == a.id).count()
        inc_count = db.query(Incident).filter(Incident.primary_asset_id == a.id).count()
        results.append(AssetResponse(
            id=a.id,
            asset_name=a.asset_name,
            ip_address=a.ip_address,
            hostname=a.hostname,
            os=a.os,
            asset_type=a.asset_type,
            criticality=a.criticality,
            owner=a.owner,
            status=a.status,
            event_count=ev_count,
            alert_count=al_count,
            incident_count=inc_count,
            created_at=a.created_at
        ))
    return results

@router.post("", response_model=AssetResponse)
def create_asset(
    req: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ANALYST"]))
):
    existing = db.query(Asset).filter((Asset.ip_address == req.ip_address) | (Asset.asset_name == req.asset_name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset name or IP address already registered")

    new_asset = Asset(
        asset_name=req.asset_name,
        ip_address=req.ip_address,
        hostname=req.hostname,
        os=req.os,
        asset_type=req.asset_type,
        criticality=req.criticality.upper(),
        owner=req.owner,
        status="ACTIVE"
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)

    return AssetResponse(
        id=new_asset.id,
        asset_name=new_asset.asset_name,
        ip_address=new_asset.ip_address,
        hostname=new_asset.hostname,
        os=new_asset.os,
        asset_type=new_asset.asset_type,
        criticality=new_asset.criticality,
        owner=new_asset.owner,
        status=new_asset.status,
        event_count=0,
        alert_count=0,
        incident_count=0,
        created_at=new_asset.created_at
    )

@router.get("/{asset_id}")
def get_asset_detail(asset_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Asset).filter((Asset.id == asset_id) | (Asset.ip_address == asset_id)).first()
    if not a:
        raise HTTPException(status_code=404, detail="Asset not found")

    recent_events = (
        db.query(Event)
        .filter(Event.asset_id == a.id)
        .order_by(Event.timestamp.desc())
        .limit(10)
        .all()
    )
    ev_count = db.query(Event).filter(Event.asset_id == a.id).count()
    al_count = db.query(Alert).filter(Alert.asset_id == a.id).count()
    inc_count = db.query(Incident).filter(Incident.primary_asset_id == a.id).count()

    return {
        "asset": AssetResponse(
            id=a.id,
            asset_name=a.asset_name,
            ip_address=a.ip_address,
            hostname=a.hostname,
            os=a.os,
            asset_type=a.asset_type,
            criticality=a.criticality,
            owner=a.owner,
            status=a.status,
            event_count=ev_count,
            alert_count=al_count,
            incident_count=inc_count,
            created_at=a.created_at
        ),
        "recent_events": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "event_type": e.event_type,
                "status": e.status,
                "source_ip": e.source_ip,
                "message": e.message
            }
            for e in recent_events
        ]
    }
