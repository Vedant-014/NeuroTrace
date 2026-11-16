# Parkinson Disease Detection — Backend (v2, production-extended)

This extends the original screening backend with authentication, patient profiles,
email delivery, feedback, and security hardening — without breaking the original
handwriting-analysis pipeline.

## What was tested and confirmed working in this environment

Real end-to-end tests were run (not just written) for:
- Sign up → OTP generated and stored → verify OTP → tokens issued
- Login with correct/incorrect password
- `GET /auth/me` with a valid access token
- Profile creation
- Sample upload (accepted) and upload with an invalid file type (correctly rejected with 400)
- `GET /history`
- Feedback submission
- Refresh token rotation
- Unauthenticated access correctly blocked (401)
- Rate limiting: 6 rapid login attempts → 5 processed, 6th returned 429
- Admin-only feedback endpoint correctly blocks a non-admin user (403)
- Email logging correctly records `status="skipped"` when SMTP isn't configured (dev mode)

**Not testable here** (need your real credentials): actual email delivery (needs SMTP
credentials) and Google login (needs a real Google OAuth Client ID + a real Google ID
token from a frontend). Both are fully implemented and will work once configured.

## What changed structurally

```
app/
  core/
    config.py       - all settings, loaded from .env
    security.py      - bcrypt password hashing, JWT create/verify
    deps.py           - get_current_user / get_current_verified_user / require_admin
    rate_limit.py     - slowapi limiter
  routers/
    auth.py            - signup, login, google, otp, forgot/reset password, refresh, logout
    profile.py          - patient profile CRUD
    samples.py           - upload + analyze (now auth-protected, validated)
    history.py            - list/filter/search/delete records, PDF download
    feedback.py             - submit + admin view
  services/
    email_service.py         - SMTP sending (OTP, reset, welcome, report)
    otp_service.py             - OTP generate/verify
  schemas/                       - pydantic request/response models, split by domain
  database.py                     - all models: User, RefreshToken, OTPVerification,
                                     LoginHistory, AuditLog, EmailLog, PatientProfile,
                                     Sample, Report, Feedback
  main.py                          - app wiring, CORS, logging, exception handlers
```

The original `Patient` model was replaced by `PatientProfile`, now linked 1:1 to a
`User` account instead of being created ad hoc via API. `Sample`/`Report` and the ML
pipeline (`ml/`) are unchanged in behavior - just now scoped to the logged-in user.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:
1. **Required**: generate a real `JWT_SECRET_KEY`:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
2. **Optional but recommended for full functionality**:
   - `SMTP_USER` / `SMTP_PASSWORD` — for Gmail, create an App Password at
     https://myaccount.google.com/apppasswords (requires 2FA enabled on the account).
     Without this, the app still works — OTPs/emails are just logged instead of sent
     (check the `email_logs` table or server console during dev).
   - `GOOGLE_CLIENT_ID` — create an OAuth Client ID at
     https://console.cloud.google.com/apis/credentials, type "Web application".
     Your frontend uses this same client ID for Google Sign-In and sends the resulting
     `id_token` to `POST /auth/google`.

## Train the ML models (same as before, unchanged)

```bash
cd ml
python train_cnn.py --dataset_root /path/to/your/dataset --drawing_type spiral
python train_classical.py --dataset_root /path/to/your/dataset --drawing_type spiral
```

## Run

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs

## Typical flow

1. `POST /auth/signup` → OTP sent to email (or logged, if SMTP not configured)
2. `POST /auth/verify-otp` → returns access + refresh tokens
3. `POST /profile` → complete patient profile (required before analysis)
4. `POST /samples` → upload spiral/wave drawing
5. `POST /samples/{id}/analyze` → runs the model, saves report, emails PDF in background
6. `GET /history` → view past samples/reports (supports `?drawing_type=`, `?predicted_label=`, `?search=`)
7. `GET /reports/{id}/pdf` → download report
8. `POST /feedback` → rate the experience

## Security notes

- Passwords hashed with bcrypt (direct library, not the outdated `passlib` wrapper — avoids a known compatibility bug with bcrypt ≥4.1).
- Access tokens short-lived (30 min default); refresh tokens are stored server-side by `jti` so they can be revoked (logout, password reset revokes all sessions).
- Rate limiting on all auth endpoints (5/minute by default) to slow brute-force attempts.
- File uploads validated by extension and content-type, and size-capped (10MB default), streamed in chunks rather than loaded fully into memory.
- All actions logged to `audit_logs`; all logins to `login_history`; all outbound emails to `email_logs`.
- Every user can only see/modify their own samples, reports, and profile — enforced at the query level (`WHERE user_id = current_user.id`), not just at the UI layer.

## Known limitation to flag in your report

Frontend integration: the existing frontend (built earlier) calls `/patients/...`
endpoints directly, which no longer exist — patient records are now created via
profile completion after login, not a standalone endpoint. The frontend will need an
update to add login/signup screens and switch from `patientId`-based calls to using
the JWT-authenticated `/profile`, `/samples`, `/history` endpoints. Say the word and
I'll do that update next.
