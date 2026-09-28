import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import SimulationRun, User
from app.schemas.schemas import SimulationStartRequest, SimulationRunResponse
from app.api.deps import get_current_user, require_roles
from app.services.simulation_service import simulation_service

router = APIRouter(prefix="/simulations", tags=["Simulation Lab"])

@router.post("/run", response_model=SimulationRunResponse)
async def run_simulation_scenario(
    req: SimulationStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ANALYST"]))
):
    try:
        result = await simulation_service.run_scenario(
            db=db,
            scenario=req.scenario,
            started_by_user_id=current_user.id
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.get("/history", response_model=List[SimulationRunResponse])
def get_simulation_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100)
):
    runs = (
        db.query(SimulationRun)
        .order_by(SimulationRun.started_at.desc())
        .limit(limit)
        .all()
    )
    results = []
    for r in runs:
        results.append(SimulationRunResponse(
            id=r.id,
            scenario=r.scenario,
            status=r.status,
            started_by_name=r.user.username if r.user else "System",
            events_generated=r.events_generated,
            alerts_generated=r.alerts_generated,
            incidents_generated=r.incidents_generated,
            started_at=r.started_at,
            completed_at=r.completed_at,
            results_summary=json.loads(r.results) if r.results else None
        ))
    return results

@router.get("/{run_id}", response_model=SimulationRunResponse)
def get_simulation_run(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    r = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Simulation run not found")

    return SimulationRunResponse(
        id=r.id,
        scenario=r.scenario,
        status=r.status,
        started_by_name=r.user.username if r.user else "System",
        events_generated=r.events_generated,
        alerts_generated=r.alerts_generated,
        incidents_generated=r.incidents_generated,
        started_at=r.started_at,
        completed_at=r.completed_at,
        results_summary=json.loads(r.results) if r.results else None
    )
