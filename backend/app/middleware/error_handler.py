"""
Global exception handler for structured error responses.
"""

import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, NoResultFound

logger = logging.getLogger("medikiosk.errors")


class MediKioskError(Exception):
    """Base exception for MediKiosk application errors."""

    def __init__(self, code: str, message: str, status_code: int = 400, details: dict | None = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class NotFoundError(MediKioskError):
    """Resource not found."""

    def __init__(self, resource: str, resource_id: str | int):
        super().__init__(
            code="MK001",
            message=f"{resource} with id '{resource_id}' not found",
            status_code=404,
        )


class ASRTimeoutError(MediKioskError):
    """ASR service timeout."""

    def __init__(self):
        super().__init__(
            code="MK002",
            message="ASR service timed out. Please try again.",
            status_code=504,
        )


class LLMRateLimitError(MediKioskError):
    """LLM rate limit exceeded."""

    def __init__(self):
        super().__init__(
            code="MK003",
            message="AI service rate limit exceeded. Please wait and try again.",
            status_code=429,
        )


class OCRQualityError(MediKioskError):
    """OCR quality too low."""

    def __init__(self):
        super().__init__(
            code="MK004",
            message="Image quality too low for OCR. Please re-scan the document.",
            status_code=422,
        )


class ConsentRequiredError(MediKioskError):
    """Consent not granted."""

    def __init__(self, consent_type: str):
        super().__init__(
            code="MK007",
            message=f"Consent not granted for: {consent_type}",
            status_code=403,
        )


class SessionExpiredError(MediKioskError):
    """Session has expired."""

    def __init__(self, session_id: int):
        super().__init__(
            code="MK008",
            message=f"Session {session_id} has expired. Please start a new session.",
            status_code=410,
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""

    @app.exception_handler(MediKioskError)
    async def medikiosk_error_handler(request: Request, exc: MediKioskError) -> JSONResponse:
        logger.warning(f"MediKiosk error: {exc.code} - {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
        logger.error(f"Database integrity error: {exc}")
        return JSONResponse(
            status_code=409,
            content={
                "error": {
                    "code": "MK_DB_CONFLICT",
                    "message": "A database conflict occurred. The record may already exist.",
                }
            },
        )

    @app.exception_handler(NoResultFound)
    async def not_found_handler(request: Request, exc: NoResultFound) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "MK001",
                    "message": "Requested resource not found.",
                }
            },
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "MK_INTERNAL",
                    "message": "An internal server error occurred.",
                }
            },
        )
