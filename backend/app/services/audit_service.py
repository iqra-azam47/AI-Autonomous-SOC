import json
import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import AuditLog

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        resource_type: str,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        result: str = "SUCCESS",
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            result=result,
            details=json.dumps(details) if details else None,
            created_at=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(audit_entry)
        try:
            db.commit()
            db.refresh(audit_entry)
        except Exception:
            db.rollback()
        return audit_entry

audit_service = AuditService()
