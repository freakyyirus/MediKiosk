"""
Shared pytest fixtures.

The suite is designed to run offline: every test either exercises pure logic
(ASR/TTS service-id resolution, body-map analysis, state transitions, JWT) or
verifies that degraded dependency paths degrade gracefully.
"""

import os

# Blank out live-service env vars BEFORE any app import so the auth wires
# (app.utils.supabase_jwt / clerk_auth) take the offline dev path and the
# suite makes NO network calls to the real Supabase project.
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_ANON_KEY"] = ""
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = ""
os.environ["CLERK_ISSUER"] = ""
os.environ["CLERK_JWKS_URL"] = ""
os.environ.setdefault("APP_ENV", "development")


def pytest_collection_modifyitems(items):
    """Ensure every async test is marked and simple names stay readable."""
    for item in items:
        if hasattr(item, "obj") and item.obj and getattr(item.obj, "__code__", None) and item.obj.__code__.co_flags & 0x80:
            item.add_marker("asyncio")
