import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str  # ID token obtained by the frontend from Google Sign-In


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str
    purpose: str = "registration"  # "registration" | "password_reset"


class ResendOTPRequest(BaseModel):
    email: EmailStr
    purpose: str = "registration"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str = Field(min_length=8, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    is_verified: bool
    profile_completed: bool
    auth_provider: str
    created_at: datetime.datetime
