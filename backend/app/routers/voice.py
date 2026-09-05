"""
Voice and ASR API endpoints.
"""

import logging

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.asr_client import BhashiniASR
from app.ai.red_flag_engine import RedFlagEngine
from app.database import get_db
from app.models.session import Session, SessionMessage
from app.middleware.error_handler import NotFoundError

logger = logging.getLogger("medikiosk.routers.voice")
router = APIRouter(prefix="/api/v1/voice", tags=["Voice & ASR"])
asr_client = BhashiniASR()
red_flag_engine = RedFlagEngine()


@router.post("/transcribe")
async def transcribe_audio(
    session_id: int = Form(...),
    language: str = Form("en"),
    audio_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Transcribe audio using Bhashini ASR, run red flag detection,
    and persist the message + any flags to the database.
    """
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Session", session_id)

    audio_bytes = await audio_file.read()

    transcript, confidence = await asr_client.transcribe_audio(audio_bytes, language)

    red_flags = red_flag_engine.analyze(transcript)

    message = SessionMessage(
        session_id=session_id,
        message_type="patient_voice",
        content=transcript,
        confidence=confidence,
    )
    db.add(message)

    if red_flags:
        existing = session.red_flags if isinstance(session.red_flags, list) else []
        session.red_flags = existing + red_flags

    await db.flush()

    return {
        "transcript": transcript,
        "confidence": confidence,
        "red_flags": red_flags,
    }
