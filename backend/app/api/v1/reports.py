from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user, User
from app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/incident/{incident_id}")
def get_incident_report(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        report = report_service.generate_incident_report(db, incident_id)
        return report
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.get("/activity")
def get_activity_report(
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return report_service.generate_security_activity_report(db, hours)

@router.get("/ml")
def get_ml_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return report_service.generate_ml_evaluation_report(db)
