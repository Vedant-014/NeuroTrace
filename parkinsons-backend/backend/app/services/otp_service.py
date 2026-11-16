import datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_otp
from app.database import OTPVerification


def create_otp(db: Session, user_id: int, purpose: str) -> str:
    """Invalidate any previous unused OTPs for this purpose, then create a fresh one."""
    db.query(OTPVerification).filter(
        OTPVerification.user_id == user_id,
        OTPVerification.purpose == purpose,
        OTPVerification.is_used == False,  # noqa: E712
    ).update({"is_used": True})

    code = generate_otp(settings.OTP_LENGTH)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    otp = OTPVerification(user_id=user_id, otp_code=code, purpose=purpose, expires_at=expires_at)
    db.add(otp)
    db.commit()
    return code


def verify_otp(db: Session, user_id: int, purpose: str, code: str) -> bool:
    otp = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.user_id == user_id,
            OTPVerification.purpose == purpose,
            OTPVerification.otp_code == code,
            OTPVerification.is_used == False,  # noqa: E712
        )
        .order_by(OTPVerification.created_at.desc())
        .first()
    )
    if not otp:
        return False
    if otp.expires_at < datetime.datetime.utcnow():
        return False

    otp.is_used = True
    db.commit()
    return True
