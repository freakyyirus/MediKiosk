"""
MediKiosk — Main FastAPI Application Entry Point.

AI-Powered Clinical History & Document Digitization Platform
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import close_db, init_db
from app.middleware.error_handler import register_exception_handlers
from app.middleware.logging_mw import LoggingMiddleware
from app.routers import health, patients, sessions, physician, auth, voice, documents, summaries, abdm, consent, advanced

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("medikiosk")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle — startup and shutdown events."""
    # Startup
    logger.info("🏥 MediKiosk API starting up...")
    logger.info(f"   Environment: {settings.app_env}")
    logger.info(f"   Debug: {settings.app_debug}")

    # Initialize database tables (dev only — use Alembic in production)
    if settings.app_env == "development":
        try:
            await init_db()
            logger.info("   Database tables initialized")
        except Exception as exc:
            logger.warning("⚠️  DB init skipped (no local Postgres): %s", exc)

    logger.info("✅ MediKiosk API ready!")

    yield

    # Shutdown
    logger.info("🛑 MediKiosk API shutting down...")
    await close_db()
    logger.info("👋 Goodbye!")


# Create FastAPI application
app = FastAPI(
    title="MediKiosk API",
    description=(
        "AI-Powered Clinical History & Document Digitization Platform. "
        "Built for Smart India Hackathon 2026."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

# ---- Middleware ----

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response logging
app.add_middleware(LoggingMiddleware)

# Exception handlers
register_exception_handlers(app)

# ---- Routers ----

# Health checks (no prefix)
app.include_router(health.router)

# API v1 routes
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(sessions.router)
app.include_router(physician.router)
app.include_router(voice.router)
app.include_router(documents.router)
app.include_router(summaries.router)
app.include_router(abdm.router)
app.include_router(consent.router)
app.include_router(advanced.router)


# ---- Root ----

@app.get("/", tags=["Root"])
async def root():
    """API root — basic info."""
    return {
        "name": "MediKiosk API",
        "version": "1.0.0",
        "description": "AI-Powered Clinical History & Document Digitization Platform",
        "docs": "/docs",
        "health": "/health",
    }
