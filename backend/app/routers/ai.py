"""
AI conversation endpoints — the Gemini talking-AI layer.

Exposes /api/v1/ai/chat so the kiosk can run a live, multilingual, spoken
clinical interview. History is persisted to the session for the doctor later.
"""

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.concierge import get_concierge
from app.database import get_db
from app.middleware.error_handler import NotFoundError
from app.models.session import Session, SessionMessage

logger = logging.getLogger("medikiosk.routers.ai")
router = APIRouter(prefix="/api/v1/ai", tags=["AI Concierge"])

START_MARKER = "__START__"
AUDIO_TYPES = {"https://img.medi.com/placeholder.wav", "audio/file.mp3"}


class ChatMessage(BaseModel):
    role: str  # "assistant" | "user"
    content: str


class AIChatRequest(BaseModel):
    session_id: int | None = None
    patient_id: int | None = None
    language: str = "hi"
    patient_message: str | None = None
    touched_body_part: str | None = None
    vitals: dict | None = None
    history: list[ChatMessage] | None = None


def _extract_history(messages: list[SessionMessage]) -> list[dict]:
    """Turn stored session messages into the {role, content} history shape."""
    history: list[dict] = []
    for m in messages:
        if m.message_type in ("ai_question", "patient_voice", "patient_touch"):
            role = "assistant" if m.message_type == "ai_question" else "user"
            content = (m.content or "").strip()
            if content:
                history.append({"role": role, "content": content})
    return history


def _set_clinical(session: Session, clinical: dict) -> None:
    """Persist the structured clinical summary onto the session row."""
    if not clinical:
        return
    chief = clinical.get("chief_complaint")
    if chief:
        session.chief_complaint = str(chief).strip() or None
    hpi = clinical.get("hpi")
    if hpi:
        session.history_hpi = hpi if isinstance(hpi, dict) else {"raw": str(hpi)}
    for field, key in (
        ("past_medical_history", "past_medical_history"),
        ("current_medications", "drug_history"),
        ("allergies", "allergy_history"),
        ("review_of_systems", "review_of_systems"),
    ):
        value = clinical.get(field)
        if value:
            setattr(session, key, value)


@router.post("/chat")
async def chat(request: AIChatRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """
    One turn of the talking-AI clinical interview.

    - `patient_message` is the latest thing the patient said (voice → ASR, or
      typed/touched). Pass an empty string on the very first call to start.
    - `history` (optional) is the accumulated conversation maintained by the
      client; it is authoritative so the model gets full context even when no
      DB session exists. When `session_id` is provided the messages + red
      flags + structured fields are also persisted for the doctor.
    """
    session: Session | None = None
    history: list[dict] = []
    body_part = request.touched_body_part

    if request.session_id is not None:
        result = await db.execute(select(Session).where(Session.id == request.session_id))
        session = result.scalar_one_or_none()
        if not session:
            raise NotFoundError("Session", request.session_id)
        msgs = await db.execute(select(SessionMessage).where(SessionMessage.session_id == request.session_id).order_by(SessionMessage.created_at.asc()))
        history = _extract_history(msgs.scalars().all())
        body_part = body_part or (session.history_hpi or {}).get("site")

    # Client-maintained history wins when present (works without a DB session).
    if request.history:
        client_history: list[dict] = [
            {
                "role": m.role if m.role in ("assistant", "user") else "user",
                "content": (m.content or "").strip(),
            }
            for m in request.history
            if (m.content or "").strip()
        ]
        if client_history:
            history = client_history

    last_message = (request.patient_message or "").strip()

    # Normalise any recorded dict received via ASR fallbacks.
    if last_message in AUDIO_TYPES:
        last_message = ""

    start = not last_message and not history

    # Build the next history frame to send to the model.
    next_history = list(history)
    if last_message:
        next_history.append({"role": "user", "content": last_message})
    elif not history:
        next_history.append({"role": "user", "content": START_MARKER})

    concierge = get_concierge()
    reply = await concierge.generate_turn(
        language=request.language,
        messages=next_history,
        body_part=body_part,
        vitals=request.vitals,
    )

    # ---- Persist to the session (real data for the doctor) ----
    if session is not None:
        if last_message and last_message != START_MARKER:
            pending = SessionMessage(
                session_id=session.id,
                message_type="patient_voice",
                content=last_message,
                confidence=0.0,
            )
            db.add(pending)

        db.add(
            SessionMessage(
                session_id=session.id,
                message_type="ai_question",
                content=reply["speech"],
                confidence=0.0,
            )
        )

        if reply["red_flags"]:
            existing = list(session.red_flags) if isinstance(session.red_flags, list) else []
            seen = {f.get("type") if isinstance(f, dict) else str(f) for f in existing}
            for flag in reply["red_flags"]:
                if flag not in seen:
                    existing.append(flag)
                    seen.add(flag)
            session.red_flags = existing

        if reply.get("interview_complete"):
            session.status = "completed"
            from datetime import UTC, datetime

            session.completed_at = datetime.now(UTC)
            session.confidence_score = 0.9
            _set_clinical(session, reply.get("clinical") or {})

        db.add(session)
        await db.flush()

    if start:
        logger.info(
            "AI concierge started session (lang=%s, body=%s)",
            request.language,
            request.touched_body_part,
        )
    return {
        **reply,
        "transcribed": last_message or "",
        "session_id": session.id if session else None,
        "provider": "gemini" if concierge.available else "fallback",
    }
