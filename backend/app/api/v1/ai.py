from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import AIInvestigationResponse, AIChatRequest, AIChatResponse
from app.api.deps import get_current_user, require_roles, User
from app.ai.investigator import agentic_investigator
from app.ai.chat import soc_chat_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/ai", tags=["AI SOC Analyst"])

@router.post("/investigate/{incident_id}", response_model=AIInvestigationResponse)
async def run_ai_investigation(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ANALYST"]))
):
    investigation = await agentic_investigator.investigate_incident(
        db=db,
        incident_id=incident_id,
        requested_by_user_id=current_user.id
    )

    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI investigation is temporarily unavailable. Ensure GEMINI_API_KEY is configured in server environment or review the evidence manually."
        )

    audit_service.log_action(
        db=db,
        action="ai_investigation",
        resource_type="incident",
        resource_id=incident_id,
        user_id=current_user.id,
        result="SUCCESS",
        details={"investigation_id": investigation.id, "model": investigation.model_name}
    )

    return AIInvestigationResponse(
        id=investigation.id,
        incident_id=investigation.incident_id,
        requested_by_name=current_user.username,
        summary=investigation.summary,
        evidence_analysis=investigation.evidence_analysis,
        attack_progression=investigation.attack_progression,
        mitre_analysis=investigation.mitre_analysis,
        recommended_actions=investigation.recommended_actions,
        limitations=investigation.limitations,
        model_name=investigation.model_name,
        created_at=investigation.created_at
    )

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_soc_ai(
    req: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_msg = req.message.strip()
    if not clean_msg:
        raise HTTPException(status_code=400, detail="Query message cannot be empty")

    response = await soc_chat_service.chat(
        db=db,
        user_query=clean_msg,
        incident_id=req.incident_id
    )
    return response
