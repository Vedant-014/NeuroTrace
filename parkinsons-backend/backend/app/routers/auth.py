import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token, decode_token,
)
from app.database import get_db, User, RefreshToken, LoginHistory, AuditLog
from app.schemas.auth import (
    SignUpRequest, LoginRequest, GoogleLoginRequest, OTPVerifyRequest, ResendOTPRequest,
    ForgotPasswordRequest, ResetPasswordRequest, RefreshTokenRequest, LogoutRequest,
    TokenResponse, UserOut,
)
from app.services.otp_service import create_otp, verify_otp
from app.services.email_service import send_otp_email, send_password_reset_email, send_welcome_email

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("auth")


def _issue_tokens(db: Session, user: User, device_info: str | None = None) -> TokenResponse:
    access_token = create_access_token(subject=str(user.id))
    refresh_token, jti, expires_at = create_refresh_token(subject=str(user.id))
    db.add(RefreshToken(user_id=user.id, jti=jti, expires_at=expires_at, device_info=device_info))
    db.commit()
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def _record_login(db: Session, user_id: int, request: Request, success: bool, method: str = "local"):
    db.add(LoginHistory(
        user_id=user_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        success=success,
        method=method,
    ))
    db.commit()


def _audit(db: Session, user_id: int | None, action: str, detail: str = "", request: Request | None = None):
    db.add(AuditLog(
        user_id=user_id,
        action=action,
        detail=detail,
        ip_address=request.client.host if request and request.client else None,
    ))
    db.commit()


# ---------- Sign up ----------

@router.post("/signup", response_model=dict)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def sign_up(request: Request, payload: SignUpRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        auth_provider="local",
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    otp_code = create_otp(db, user.id, purpose="registration")
    background_tasks.add_task(send_otp_email, db, user.id, user.email, otp_code, "verify your account")
    _audit(db, user.id, "signup", request=request)

    return {"message": "Account created. Check your email for the OTP verification code.", "email": user.email}


# ---------- OTP verification ----------

@router.post("/verify-otp", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def verify_otp_endpoint(request: Request, payload: OTPVerifyRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_otp(db, user.id, payload.purpose, payload.otp_code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

    if payload.purpose == "registration":
        user.is_verified = True
        db.commit()
        background_tasks.add_task(send_welcome_email, db, user.id, user.email)

    _audit(db, user.id, f"otp_verified:{payload.purpose}", request=request)
    return _issue_tokens(db, user, device_info=request.headers.get("user-agent"))


@router.post("/resend-otp", response_model=dict)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def resend_otp(request: Request, payload: ResendOTPRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp_code = create_otp(db, user.id, purpose=payload.purpose)
    background_tasks.add_task(send_otp_email, db, user.id, user.email, otp_code)
    return {"message": "OTP resent"}


# ---------- Login ----------

@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        if user:
            _record_login(db, user.id, request, success=False)
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please verify OTP first.")

    _record_login(db, user.id, request, success=True)
    return _issue_tokens(db, user, device_info=request.headers.get("user-agent"))


# ---------- Google OAuth login ----------

@router.post("/google", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def google_login(request: Request, payload: GoogleLoginRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Google login is not configured on this server. Set GOOGLE_CLIENT_ID in .env.",
        )

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        idinfo = google_id_token.verify_oauth2_token(
            payload.id_token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    google_id = idinfo["sub"]
    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()
        if user:
            # existing local account signing in with Google for the first time - link it
            user.google_id = google_id
            user.auth_provider = "google"
        else:
            user = User(email=email, google_id=google_id, auth_provider="google", is_verified=True)
            db.add(user)
            db.commit()
            db.refresh(user)
            background_tasks.add_task(send_welcome_email, db, user.id, user.email)
        db.commit()

    _record_login(db, user.id, request, success=True, method="google")
    return _issue_tokens(db, user, device_info=request.headers.get("user-agent"))


# ---------- Forgot / reset password ----------

@router.post("/forgot-password", response_model=dict)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def forgot_password(request: Request, payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return a generic success message, even if the user doesn't exist,
    # so this endpoint can't be used to enumerate registered emails.
    if user:
        otp_code = create_otp(db, user.id, purpose="password_reset")
        background_tasks.add_task(send_otp_email, db, user.id, user.email, otp_code, "reset your password")
    return {"message": "If that email is registered, a password reset code has been sent."}


@router.post("/reset-password", response_model=dict)
@limiter.limit(settings.RATE_LIMIT_AUTH)
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_otp(db, user.id, "password_reset", payload.otp_code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

    user.hashed_password = hash_password(payload.new_password)
    # Revoke all existing refresh tokens - force re-login everywhere after a password reset
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update({"revoked": True})
    db.commit()

    _audit(db, user.id, "password_reset", request=request)
    return {"message": "Password reset successful. Please log in again."}


# ---------- Refresh token ----------

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        decoded = decode_token(payload.refresh_token)
        if decoded.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    jti = decoded.get("jti")
    stored = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if not stored or stored.revoked or stored.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token is invalid, expired, or revoked")

    user = db.query(User).filter(User.id == int(decoded["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Rotate: revoke the old refresh token, issue a new pair
    stored.revoked = True
    db.commit()
    return _issue_tokens(db, user)


# ---------- Logout ----------

@router.post("/logout", response_model=dict)
def logout(payload: LogoutRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        decoded = decode_token(payload.refresh_token)
        jti = decoded.get("jti")
        db.query(RefreshToken).filter(RefreshToken.jti == jti, RefreshToken.user_id == current_user.id).update({"revoked": True})
        db.commit()
    except JWTError:
        pass  # already invalid - logout is a no-op in that case, not an error
    return {"message": "Logged out successfully"}


# ---------- Current user ----------

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
