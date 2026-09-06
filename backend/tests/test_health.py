"""
Health endpoint tests.

These verify the DEPENDENCY-CHECK logic the /health, /ready and /metrics
routes now perform. They run offline: unreachable services must degrade to
"error: ..." strings instead of crashing, and the returned shape must be
stable.
"""

from app.routers.health import (
    START_TIME,
    health_check,
    metrics,
    readiness_check,
    run_health_checks,
)


def test_start_time_is_tracked():
    assert START_TIME > 0


async def test_run_health_checks_shape():
    checks = await run_health_checks()
    assert set(checks) >= {
        "database",
        "redis",
        "minio",
        "active_sessions",
        "sessions_today",
        "uptime_seconds",
    }
    assert checks["uptime_seconds"] >= 0
    # Never raises even with no Postgres/Redis available
    assert isinstance(checks["database"], str)
    assert isinstance(checks["redis"], str)


async def test_health_endpoint_returns_expected_keys():
    resp = await health_check()
    assert resp["status"] in ("healthy", "degraded")
    assert resp["version"] == "1.0.0"
    assert "timestamp" in resp
    assert set(resp["checks"]) >= {
        "database",
        "redis",
        "minio",
        "active_sessions",
        "sessions_today",
    }


async def test_ready_endpoint_status():
    resp = await readiness_check()
    assert resp["status"] in ("ready", "not_ready")
    assert set(resp["checks"]) == {"database", "redis", "minio"}


async def test_metrics_returns_counts():
    resp = await metrics()
    assert "uptime_seconds" in resp
    assert "active_sessions" in resp
    assert "total_sessions_today" in resp
