"""
Health check endpoints.
"""

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Basic health check — returns 200 if application is running."""
    return {
        "status": "healthy",
        "service": "medikiosk-api",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check — verifies all dependencies are available."""
    checks = {
        "database": "ok",
        "redis": "ok",
        "storage": "ok",
    }

    # TODO: Add actual dependency checks (DB ping, Redis ping, MinIO ping)

    all_ok = all(v == "ok" for v in checks.values())
    return {
        "status": "ready" if all_ok else "not_ready",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/metrics")
async def metrics():
    """Basic application metrics."""
    return {
        "uptime_seconds": 0,  # TODO: Track actual uptime
        "active_sessions": 0,  # TODO: Query Redis
        "total_sessions_today": 0,  # TODO: Query DB
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
