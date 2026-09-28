import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.schemas.schemas import IngestionSummaryResponse
from app.api.deps import get_current_user, require_roles, User
from app.services.ingestion_service import ingestion_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/ingestion", tags=["Log Ingestion"])

ALLOWED_EXTENSIONS = {".csv", ".json", ".txt", ".log"}

@router.post("/upload", response_model=IngestionSummaryResponse)
async def upload_log_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ANALYST"]))
):
    # 1. Filename & extension validation
    filename = file.filename or "unknown.log"
    # Prevent path traversal
    clean_filename = os.path.basename(filename)
    _, ext = os.path.splitext(clean_filename.lower())
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. File size limit
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB"
        )

    # 3. Process ingestion pipeline
    summary = await ingestion_service.ingest_file(
        db=db,
        content_bytes=content,
        filename=clean_filename
    )

    # 4. Audit logging
    audit_service.log_action(
        db=db,
        action="log_upload",
        resource_type="ingestion",
        user_id=current_user.id,
        result="SUCCESS" if summary.events_created > 0 else "FAILURE",
        details={
            "filename": clean_filename,
            "records_uploaded": summary.records_uploaded,
            "events_created": summary.events_created,
            "alerts_generated": summary.alerts_generated,
            "incidents_generated": summary.incidents_generated
        }
    )

    return summary
