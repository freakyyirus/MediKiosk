"""
Shared pytest fixtures.

The suite is designed to run offline: every test either exercises pure logic
(ASR/TTS service-id resolution, body-map analysis, state transitions, JWT) or
verifies that degraded dependency paths degrade gracefully.
"""


def pytest_collection_modifyitems(items):
    """Ensure every async test is marked and simple names stay readable."""
    for item in items:
        if hasattr(item, "obj") and item.obj and getattr(item.obj, "__code__", None) and item.obj.__code__.co_flags & 0x80:
            item.add_marker("asyncio")
