"""
Centralized application settings, loaded from environment variables (.env).
Never hardcode secrets - everything sensitive comes from here.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


def _get_bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


class Settings:
    # --- App ---
    APP_NAME: str = "Parkinson Disease Detection API"
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = _get_bool("DEBUG", True)

    # --- Database ---
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'parkinsons_app.db'}")

    # --- JWT ---
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_INSECURE_DEV_ONLY_SECRET")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

    # --- OTP ---
    OTP_EXPIRE_MINUTES: int = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
    OTP_LENGTH: int = 6

    # --- Google OAuth ---
    # Create these at https://console.cloud.google.com/apis/credentials
    # The frontend gets a Google ID token from Google Sign-In and sends it to us;
    # we verify it server-side against this client ID.
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    # --- Email (SMTP) ---
    # For Gmail: use an "App Password", not your normal password
    # (https://myaccount.google.com/apppasswords). Requires 2FA enabled on the account.
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", SMTP_USER)
    EMAIL_ENABLED: bool = _get_bool("EMAIL_ENABLED", bool(SMTP_USER and SMTP_PASSWORD))

    # --- File upload validation ---
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
    ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
    ALLOWED_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg"}

    # --- Rate limiting ---
    RATE_LIMIT_AUTH: str = os.getenv("RATE_LIMIT_AUTH", "5/minute")
    RATE_LIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "60/minute")

    # --- CORS ---
    ALLOWED_ORIGINS: list = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")

    # --- Frontend URL (for links in emails) ---
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")


settings = Settings()
