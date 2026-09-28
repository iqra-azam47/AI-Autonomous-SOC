from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.models import User, Role
from app.schemas.schemas import UserResponse, UserCreate, UserUpdate
from app.api.deps import require_roles, get_current_user
from app.services.audit_service import audit_service

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["ADMIN"]))
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role_name=u.role.name,
            is_active=u.is_active,
            last_login=u.last_login,
            created_at=u.created_at
        )
        for u in users
    ]

@router.post("", response_model=UserResponse)
def create_user(
    req: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["ADMIN"]))
):
    existing = db.query(User).filter((User.username == req.username) | (User.email == req.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )

    role = db.query(Role).filter(Role.name == req.role_name.upper()).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{req.role_name}' does not exist"
        )

    new_user = User(
        username=req.username,
        email=req.email,
        password_hash=get_password_hash(req.password),
        full_name=req.full_name,
        role_id=role.id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    audit_service.log_action(
        db=db,
        action="user_creation",
        resource_type="user",
        resource_id=new_user.id,
        user_id=admin.id,
        result="SUCCESS",
        details={"username": new_user.username, "role": role.name}
    )

    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        full_name=new_user.full_name,
        role_name=role.name,
        is_active=new_user.is_active,
        last_login=new_user.last_login,
        created_at=new_user.created_at
    )

@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    req: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["ADMIN"]))
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if req.full_name is not None:
        target.full_name = req.full_name

    if req.is_active is not None:
        target.is_active = req.is_active
        audit_service.log_action(
            db=db,
            action="user_status_change",
            resource_type="user",
            resource_id=target.id,
            user_id=admin.id,
            details={"is_active": req.is_active}
        )

    if req.role_name:
        role = db.query(Role).filter(Role.name == req.role_name.upper()).first()
        if not role:
            raise HTTPException(status_code=400, detail="Invalid role specified")
        target.role_id = role.id
        audit_service.log_action(
            db=db,
            action="role_change",
            resource_type="user",
            resource_id=target.id,
            user_id=admin.id,
            details={"new_role": role.name}
        )

    db.commit()
    db.refresh(target)

    return UserResponse(
        id=target.id,
        username=target.username,
        email=target.email,
        full_name=target.full_name,
        role_name=target.role.name,
        is_active=target.is_active,
        last_login=target.last_login,
        created_at=target.created_at
    )
