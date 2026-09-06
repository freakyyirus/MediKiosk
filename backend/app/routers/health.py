"""
Health check endpoints.

Provides live dependency checks (PostgreSQL, Redis, optional MinIO), uptime
tracking, and session metrics. Every check is defensive: if a dependency is
unreachable the endpoint reports "degraded" instead of crashing.
"""

import logging
import time
from datetime import UTC, date, datetime

from fastapi import APIRouter
from sqlalchemy import func, select, text

from app.config import get_settings
from app.database import async_session_factory, engine
from app.models.session import Session
from app.redis_client import get_redis

logger = logging.getLogger("medikiosk.health")
router = APIRouter(tags=["Health"])

START_TIME = time.time()


async def check_database() -> tuple[str, int]:
    """Ping Postgres and (if possible) count today's sessions."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        async with async_session_factory() as db:
            today = await db.scalar(select(func.count(Session.id)).where(func.date(Session.created_at) == date.today()))
        return "ok", int(today or 0)
    except Exception as exc:  # noqa: BLE001 - report, don't raise
        logger.warning("Health DB check failed: %s", exc)
        return f"error: {exc}", 0


async def check_redis() -> tuple[str, int]:
    """Ping Redis and read the live active-sessions counter if present."""
    client = get_redis()
    try:
        await client.ping()
        raw = await client.get("active_sessions")
        active = int(raw) if raw is not None else 0
        return "ok", active
    except Exception as exc:  # noqa: BLE001
        logger.warning("Health Redis check failed: %s", exc)
        return f"error: {exc}", 0
    finally:
        await client.aclose()


async def check_minio() -> str:
    """
    Ping MinIO/S3 when configured. It is optional (dev-only in this codebase),
    so an unconfigured/local default is reported as "not_configured" rather
    than failing the health check.
    """
    settings = get_settings()
    if settings.minio_host in ("", "localhost", "127.0.0.1"):
        return "not_configured"
    try:
        from minio import Minio

        client = Minio(
            f"{settings.minio_host}:{settings.minio_port}",
            access_key=settings.minio_root_user,
            secret_key=settings.minio_root_password,
            secure=False,
        )
        client.list_buckets()
        return "ok"
    except Exception as exc:  # noqa: BLE001
        logger.warning("Health MinIO check failed: %s", exc)
        return f"error: {exc}"


async def run_health_checks() -> dict:
    """Run all dependency checks; never raises."""
    db_status, sessions_today = await check_database()
    redis_status, active_redis = await check_redis()
    minio_status = await check_minio()
    return {
        "database": db_status,
        "redis": redis_status,
        "minio": minio_status,
        "active_sessions": active_redis,
        "sessions_today": sessions_today,
        "uptime_seconds": round(time.time() - START_TIME),
    }


async def _fallback_active_sessions() -> int:
    """Count in-progress sessions when Redis has no counter set."""
    try:
        async with async_session_factory() as db:
            return int(await db.scalar(select(func.count(Session.id)).where(Session.status == "in_progress")) or 0)
    except Exception as exc:  # noqa: BLE001
        logger.debug("Could not count active sessions: %s", exc)
        return 0


@router.get("/health")
async def health_check():
    """Live health check — verifies DB, Redis, optional MinIO, uptime and session stats."""
    checks = await run_health_checks()
    component_ok = all(v == "ok" for k, v in checks.items() if k in ("database", "redis", "minio"))
    active = checks["active_sessions"] if checks["active_sessions"] else await _fallback_active_sessions()
    return {
        "status": "healthy" if component_ok else "degraded",
        "service": "medikiosk-api",
        "version": "1.0.0",
        "timestamp": datetime.now(UTC).isoformat(),
        "uptime_seconds": checks["uptime_seconds"],
        "checks": {
            "database": checks["database"],
            "redis": checks["redis"],
            "minio": checks["minio"],
            "active_sessions": active,
            "sessions_today": checks["sessions_today"],
        },
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check — verifies all required dependencies are available."""
    checks = await run_health_checks()
    required_ok = checks["database"] == "ok" and checks["redis"] == "ok"
    return {
        "status": "ready" if required_ok else "not_ready",
        "checks": {k: checks[k] for k in ("database", "redis", "minio")},
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/metrics")
async def metrics():
    """Application metrics — uptime, active sessions and today's session count."""
    checks = await run_health_checks()
    active = checks["active_sessions"] if checks["active_sessions"] else await _fallback_active_sessions()
    return {
        "uptime_seconds": checks["uptime_seconds"],
        "active_sessions": active,
        "total_sessions_today": checks["sessions_today"],
        "checks": {k: checks[k] for k in ("database", "redis", "minio")},
        "timestamp": datetime.now(UTC).isoformat(),
    }
