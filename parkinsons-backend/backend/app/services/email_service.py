"""
Email service using SMTP (works with Gmail via App Password, or any SMTP provider).

If EMAIL_ENABLED is False (no SMTP credentials configured in .env), emails are
logged to the EmailLog table with status="skipped" and printed to console instead
of failing the request - so the rest of the app keeps working during development
before you've set up real email credentials.
"""

import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import EmailLog

logger = logging.getLogger("email_service")


def _send_smtp(to_email: str, subject: str, html_body: str, attachment_path: str | None = None) -> tuple[bool, str | None]:
    if not settings.EMAIL_ENABLED:
        logger.info(f"[EMAIL DISABLED] Would send '{subject}' to {to_email}")
        return False, "Email not configured (set SMTP_USER/SMTP_PASSWORD in .env)"

    try:
        msg = MIMEMultipart()
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        if attachment_path:
            with open(attachment_path, "rb") as f:
                part = MIMEApplication(f.read(), Name="report.pdf")
                part["Content-Disposition"] = 'attachment; filename="report.pdf"'
                msg.attach(part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())

        return True, None
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False, str(e)


def _log_email(db: Session, user_id: int | None, to_email: str, subject: str, purpose: str, success: bool, error: str | None):
    log = EmailLog(
        user_id=user_id,
        email_to=to_email,
        subject=subject,
        purpose=purpose,
        status="sent" if success else ("skipped" if error and "not configured" in error else "failed"),
        error_message=error,
    )
    db.add(log)
    db.commit()


def send_otp_email(db: Session, user_id: int, to_email: str, otp_code: str, purpose_label: str = "verify your account"):
    subject = "Your verification code"
    body = f"""
    <div style="font-family: sans-serif; max-width: 480px;">
        <h2>Parkinson Disease Detection</h2>
        <p>Use the code below to {purpose_label}:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">{otp_code}</div>
        <p>This code expires in {settings.OTP_EXPIRE_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
    </div>
    """
    success, error = _send_smtp(to_email, subject, body)
    _log_email(db, user_id, to_email, subject, "otp", success, error)
    return success


def send_password_reset_email(db: Session, user_id: int, to_email: str, reset_token: str):
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    subject = "Reset your password"
    body = f"""
    <div style="font-family: sans-serif; max-width: 480px;">
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password. This link expires in 30 minutes.</p>
        <p><a href="{reset_link}">{reset_link}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    success, error = _send_smtp(to_email, subject, body)
    _log_email(db, user_id, to_email, subject, "password_reset", success, error)
    return success


def send_welcome_email(db: Session, user_id: int, to_email: str, name: str = ""):
    subject = "Welcome to Parkinson Disease Detection"
    body = f"""
    <div style="font-family: sans-serif; max-width: 480px;">
        <h2>Welcome{', ' + name if name else ''}!</h2>
        <p>Your account has been created and verified. Complete your patient profile to start using the screening tool.</p>
    </div>
    """
    success, error = _send_smtp(to_email, subject, body)
    _log_email(db, user_id, to_email, subject, "welcome", success, error)
    return success


def send_report_email(db: Session, user_id: int, to_email: str, pdf_path: str, predicted_label: str, confidence: float):
    subject = "Your Parkinson's Screening Report"
    body = f"""
    <div style="font-family: sans-serif; max-width: 480px;">
        <h2>Your Screening Report is Ready</h2>
        <p><b>Result:</b> {predicted_label.capitalize()}</p>
        <p><b>Confidence:</b> {confidence}%</p>
        <p>Your full report is attached as a PDF.</p>
        <p style="color:#8a6d00; background:#fff8e1; padding:8px; font-size: 13px;">
            This is an AI-assisted screening estimate, not a medical diagnosis.
            Please consult a neurologist for clinical evaluation.
        </p>
    </div>
    """
    success, error = _send_smtp(to_email, subject, body, attachment_path=pdf_path)
    _log_email(db, user_id, to_email, subject, "report", success, error)
    return success
