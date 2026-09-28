from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.models import ModelVersion, User
from app.schemas.schemas import SettingsResponse
from app.api.deps import get_current_user, require_roles
from app.ai.gemini_client import gemini_client

router = APIRouter(prefix="/settings", tags=["System Settings"])

@router.get("", response_model=SettingsResponse)
def get_system_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    active_m = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    active_ver = active_m.version if active_m else "v1.0.0"

    return SettingsResponse(
        risk_threshold_low=settings.RISK_THRESHOLD_LOW,
        risk_threshold_medium=settings.RISK_THRESHOLD_MEDIUM,
        risk_threshold_high=settings.RISK_THRESHOLD_HIGH,
        gemini_configured=bool(settings.GEMINI_API_KEY),
        abuseipdb_configured=bool(settings.ABUSEIPDB_API_KEY),
        virustotal_configured=bool(settings.VIRUSTOTAL_API_KEY),
        data_retention_days=90,
        model_version_active=active_ver
    )
