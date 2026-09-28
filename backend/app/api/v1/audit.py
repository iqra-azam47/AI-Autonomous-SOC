from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogResponse
from app.api.deps import require_roles

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("/logs")
def list_audit_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["ADMIN", "ANALYST", "VIEWER"])),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[str] = None
):
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    total = query.count()
    logs = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for l in logs:
        items.append(AuditLogResponse(
            id=l.id,
            user_id=l.user_id,
            username=l.user.username if l.user else "System / Automated",
            action=l.action,
            resource_type=l.resource_type,
            resource_id=l.resource_id,
            ip_address=l.ip_address,
            result=l.result,
            details=l.details,
            created_at=l.created_at
        ))

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }
