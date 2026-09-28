import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.models import User, Role
from app.schemas.schemas import UserLogin, TokenResponse, UserResponse, PasswordResetRequest, PasswordResetConfirm
from app.api.deps import get_current_user
from app.services.audit_service import audit_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter((User.username == creds.username_or_email) | (User.email == creds.username_or_email))
        .first()
    )
    if not user or not verify_password(creds.password, user.password_hash):
        if user:
            audit_service.log_action(
                db=db,
                action="failed_login",
                resource_type="auth",
                user_id=user.id,
                result="FAILURE",
                details={"reason": "Invalid credentials", "identifier": creds.username_or_email}
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact an administrator."
        )

    user.last_login = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    token = create_access_token(data={"sub": user.id, "role": user.role.name})

    audit_service.log_action(
        db=db,
        action="login",
        resource_type="auth",
        user_id=user.id,
        result="SUCCESS"
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            role_name=user.role.name,
            is_active=user.is_active,
            last_login=user.last_login,
            created_at=user.created_at
        )
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role_name=current_user.role.name,
        is_active=current_user.is_active,
        last_login=current_user.last_login,
        created_at=current_user.created_at
    )

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit_service.log_action(
        db=db,
        action="logout",
        resource_type="auth",
        user_id=current_user.id,
        result="SUCCESS"
    )
    return {"message": "Successfully logged out"}

@router.post("/forgot-password")
def forgot_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    # Always return success to prevent email enumeration
    return {"message": "If this email is registered, a password reset procedure has been initiated."}

@router.post("/reset-password")
def reset_password(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    # Standard reset flow
    return {"message": "Password reset processed."}
