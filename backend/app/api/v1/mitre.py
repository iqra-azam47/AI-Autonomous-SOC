from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import MitreTechnique, IncidentMitreTechnique, Incident
from app.schemas.schemas import MitreTechniqueResponse
from app.api.deps import get_current_user, User

router = APIRouter(prefix="/mitre", tags=["MITRE ATT&CK"])

@router.get("/techniques", response_model=List[MitreTechniqueResponse])
def list_mitre_techniques(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    techniques = db.query(MitreTechnique).order_by(MitreTechnique.technique_id.asc()).all()
    results = []
    for t in techniques:
        inc_count = db.query(IncidentMitreTechnique).filter(IncidentMitreTechnique.technique_id == t.id).count()
        results.append(MitreTechniqueResponse(
            id=t.id,
            technique_id=t.technique_id,
            name=t.name,
            tactic=t.tactic,
            description=t.description,
            associated_incidents_count=inc_count
        ))
    return results

@router.get("/techniques/{technique_id}")
def get_technique_details(technique_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(MitreTechnique).filter((MitreTechnique.id == technique_id) | (MitreTechnique.technique_id == technique_id.upper())).first()
    if not t:
        raise HTTPException(status_code=404, detail="MITRE Technique not found")

    mappings = (
        db.query(IncidentMitreTechnique)
        .filter(IncidentMitreTechnique.technique_id == t.id)
        .order_by(IncidentMitreTechnique.created_at.desc())
        .all()
    )

    incidents = []
    for m in mappings:
        inc = m.incident
        incidents.append({
            "incident_number": inc.incident_number,
            "title": inc.title,
            "severity": inc.severity,
            "risk_score": inc.risk_score,
            "status": inc.status,
            "evidence": m.evidence,
            "mapped_at": m.created_at.isoformat()
        })

    return {
        "technique": MitreTechniqueResponse(
            id=t.id,
            technique_id=t.technique_id,
            name=t.name,
            tactic=t.tactic,
            description=t.description,
            associated_incidents_count=len(incidents)
        ),
        "associated_incidents": incidents
    }
