import logging
import time

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.rate_limit import limiter
from app import database
from app.routers import auth, profile, samples, history, feedback

# ---------- Logging ----------
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("app")

# ---------- App ----------
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "Production backend for AI-assisted Parkinson's disease screening from "
        "handwriting/drawing analysis. Includes authentication, patient profiles, "
        "screening workflow, PDF reporting, and feedback.\n\n"
        "**Disclaimer:** this API produces screening estimates, not medical diagnoses."
    ),
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Request logging middleware ----------

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)")
    return response


# ---------- Exception handlers ----------

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# ---------- Startup ----------

@app.on_event("startup")
def on_startup():
    database.init_db()
    logger.info(f"{settings.APP_NAME} started (env={settings.ENV}, email_enabled={settings.EMAIL_ENABLED})")


# ---------- Health check ----------

@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "env": settings.ENV}


# ---------- Routers ----------
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(samples.router)
app.include_router(history.router)
app.include_router(feedback.router)
