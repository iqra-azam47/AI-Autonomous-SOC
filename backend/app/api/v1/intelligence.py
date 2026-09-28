from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import ThreatIntelligenceResponse
from app.api.deps import get_current_user, User
from app.intelligence.service import threat_intel_service

router = APIRouter(prefix="/intelligence", tags=["Threat Intelligence"])

@router.get("/ip/{ip_address}", response_model=ThreatIntelligenceResponse)
async def get_ip_reputation(
    ip_address: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_ip = ip_address.strip()
    report = await threat_intel_service.get_ip_intelligence(db, clean_ip)
    return report
