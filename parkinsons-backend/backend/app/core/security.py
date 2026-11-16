"""
Security utilities: bcrypt password hashing, JWT access/refresh token creation and
verification. Keep all crypto/token logic centralized here.
"""

import datetime
import secrets
import uuid

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


# ---------- Password hashing ----------
# Using the bcrypt library directly (not passlib) - passlib's bcrypt wrapper has
# known incompatibilities with recent bcrypt releases (>=4.1).
#
# bcrypt has a hard 72-byte input limit; we truncate defensively so very long
# passwords don't raise an error (they're still plenty strong within that limit).

def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:72]
    hashed = bcrypt.hashpw(pw_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pw_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))


# ---------- JWT tokens ----------

def create_access_token(subject: str, extra_claims: dict | None = None) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "type": "access", "exp": expire, "iat": datetime.datetime.utcnow()}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str) -> tuple[str, str, datetime.datetime]:
    """Returns (token, jti, expires_at). The jti is stored in DB so we can revoke it."""
    jti = uuid.uuid4().hex
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": subject, "type": "refresh", "jti": jti, "exp": expire, "iat": datetime.datetime.utcnow()}
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti, expire


def decode_token(token: str) -> dict:
    """Raises JWTError if invalid/expired."""
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def generate_otp(length: int = 6) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(length))


def generate_password_reset_token(subject: str) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
    payload = {"sub": subject, "type": "password_reset", "exp": expire, "iat": datetime.datetime.utcnow()}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
