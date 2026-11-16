import datetime
import os

from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# =========================================================================
# Auth
# =========================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # nullable: Google-only accounts have no password
    auth_provider = Column(String, default="local")  # "local" | "google"
    google_id = Column(String, unique=True, nullable=True, index=True)

    is_verified = Column(Boolean, default=False)  # email OTP verified
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    profile_completed = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    profile = relationship("PatientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    samples = relationship("Sample", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    otp_codes = relationship("OTPVerification", back_populates="user", cascade="all, delete-orphan")
    feedback_items = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    login_history = relationship("LoginHistory", back_populates="user", cascade="all, delete-orphan")
    batch_reports = relationship("BatchReport", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    """Stored so refresh tokens can be revoked (e.g. on logout / password reset)."""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    jti = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    device_info = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="refresh_tokens")


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    otp_code = Column(String, nullable=False)
    purpose = Column(String, nullable=False)  # "registration" | "password_reset"
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="otp_codes")


class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    success = Column(Boolean, default=True)
    method = Column(String, default="local")  # "local" | "google"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="login_history")


class AuditLog(Base):
    """General audit trail for sensitive actions (upload, analyze, delete, profile update, etc.)."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    detail = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    email_to = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    purpose = Column(String, nullable=False)  # "otp" | "password_reset" | "report" | "welcome"
    status = Column(String, default="pending")  # "pending" | "sent" | "failed"
    error_message = Column(String, nullable=True)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)


# =========================================================================
# Patient profile (medical intake) - one-to-one with User
# =========================================================================

class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    full_name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    phone_number = Column(String, nullable=True)
    address = Column(String, nullable=True)

    existing_diseases = Column(Text, nullable=True)
    family_history_parkinsons = Column(Boolean, default=False)
    current_medications = Column(Text, nullable=True)
    medical_history = Column(Text, nullable=True)
    smoking_status = Column(String, nullable=True)       # "never" | "former" | "current"
    alcohol_consumption = Column(String, nullable=True)   # "none" | "occasional" | "regular"
    exercise_habits = Column(String, nullable=True)       # "sedentary" | "light" | "moderate" | "active"
    additional_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="profile")


# =========================================================================
# Parkinson's detection domain models
# =========================================================================

class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_path = Column(String, nullable=False)
    drawing_type = Column(String, default="handwriting")
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="samples")
    report = relationship("Report", back_populates="sample", uselist=False, cascade="all, delete-orphan")


class BatchReport(Base):
    """
    Aggregated result across a batch of samples (e.g. 5 spiral + 5 wave drawings
    uploaded together). Final label is decided by MAJORITY VOTE across the
    individual per-sample Reports linked to this batch, not by averaging
    confidence and thresholding - a single unusual drawing can't flip the
    result on its own, which is the whole point of doing a batch in the first
    place.
    """
    __tablename__ = "batch_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    final_label = Column(String, nullable=False)  # "parkinson" | "healthy" - majority vote winner
    votes_parkinson = Column(Integer, nullable=False)
    votes_healthy = Column(Integer, nullable=False)
    total_samples = Column(Integer, nullable=False)

    avg_confidence = Column(Float, nullable=False)
    avg_cnn_score = Column(Float, nullable=True)
    avg_classical_score = Column(Float, nullable=True)
    avg_tremor_index = Column(Float, nullable=True)
    avg_smoothness_score = Column(Float, nullable=True)
    severity_band = Column(String, nullable=False)

    pdf_path = Column(String, nullable=True)
    emailed_at = Column(DateTime, nullable=True)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="batch_reports")
    reports = relationship("Report", back_populates="batch_report")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False, unique=True)
    batch_report_id = Column(Integer, ForeignKey("batch_reports.id"), nullable=True)

    predicted_label = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    severity_band = Column(String, nullable=False)
    cnn_score = Column(Float)
    classical_score = Column(Float)
    tremor_index = Column(Float)
    smoothness_score = Column(Float)
    pdf_path = Column(String, nullable=True)
    emailed_at = Column(DateTime, nullable=True)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

    sample = relationship("Sample", back_populates="report")
    batch_report = relationship("BatchReport", back_populates="reports")


# =========================================================================
# Feedback
# =========================================================================

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=True)      # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="feedback_items")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
