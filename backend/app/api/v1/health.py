from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.ml.inference import ml_engine
from app.ai.gemini_client import gemini_client
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["Health Checks"])

@router.get("")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "AI Autonomous SOC",
        "version": "1.0.0"
    }

@router.get("/db")
def health_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "HEALTHY", "database": "CONNECTED"}
    except Exception as e:
        return {"status": "UNHEALTHY", "error": "Database connection failed"}

@router.get("/ml")
def health_ml():
    is_ready = ml_engine.is_loaded
    return {
        "status": "HEALTHY" if is_ready else "DEGRADED",
        "ml_engine_loaded": is_ready,
        "active_model": ml_engine.metadata.get("active_model_name", "RandomForest") if is_ready else "None"
    }

@router.get("/ai")
def health_ai():
    is_ready = gemini_client.is_available
    return {
        "status": "CONFIGURED" if is_ready else "UNCONFIGURED",
        "gemini_api_key_present": bool(settings.GEMINI_API_KEY),
        "model": gemini_client.model_name
    }
