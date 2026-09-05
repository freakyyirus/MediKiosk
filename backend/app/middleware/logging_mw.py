"""
Request/Response logging middleware.
Logs every request with method, path, status code, and duration.
"""

import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("medikiosk.access")


class LoggingMiddleware(BaseHTTPMiddleware):
    """Logs all incoming requests with timing information."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()

        # Log request
        logger.info(
            "REQUEST",
            extra={
                "method": request.method,
                "path": str(request.url.path),
                "query": str(request.query_params),
                "client_ip": request.client.host if request.client else "unknown",
            },
        )

        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Log response
        logger.info(
            "RESPONSE",
            extra={
                "method": request.method,
                "path": str(request.url.path),
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
            },
        )

        # Add timing header
        response.headers["X-Process-Time-Ms"] = str(round(duration_ms, 2))
        return response
