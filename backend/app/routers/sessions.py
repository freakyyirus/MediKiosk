"""
Session management API endpoints.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.error_handler import MediKioskError, NotFoundError
from app.models.session import Session, SessionMessage
from app.schemas.schemas import (
    MessageCreate,
    MessageResponse,
    SessionCreate,
    SessionResponse,
    SessionUpdate,
    TouchInputRequest,
    VoiceInputResponse,
)

router = APIRouter(prefix="/api/v1/sessions", tags=["Sessions"])

# Valid state transitions
VALID_TRANSITIONS = {
    "in_progress": ["completed", "cancelled"],
    "completed": ["under_review"],
    "under_review": ["reviewed", "in_progress"],
    "reviewed": [],
    "cancelled": [],
}


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new clinical interview session."""
    session = Session(**session_data.model_dump(exclude_none=True))
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a session by ID with full clinical data."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Session", session_id)
    return session


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Partially update a session (clinical data, status)."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Session", session_id)

    update_data = session_data.model_dump(exclude_none=True)

    # Validate state transitions
    if "status" in update_data:
        new_status = update_data["status"]
        allowed = VALID_TRANSITIONS.get(session.status, [])
        if new_status not in allowed:
            raise MediKioskError(
                code="MK_INVALID_TRANSITION",
                message=f"Cannot transition from '{session.status}' to '{new_status}'. "
                f"Allowed transitions: {allowed}",
                status_code=422,
            )
        if new_status == "completed":
            update_data["completed_at"] = datetime.now(UTC)
            if session.started_at:
                delta = datetime.now(UTC) - session.started_at.replace(tzinfo=UTC)
                update_data["duration_seconds"] = int(delta.total_seconds())

    for field, value in update_data.items():
        setattr(session, field, value)

    await db.flush()
    await db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a session (set status to cancelled)."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Session", session_id)
    session.status = "cancelled"
    await db.flush()


# ---- Voice & Touch Input ----


@router.post("/{session_id}/touch", response_model=VoiceInputResponse)
async def submit_touch_input(
    session_id: int,
    touch_data: TouchInputRequest,
    db: AsyncSession = Depends(get_db),
):
    """Submit touch/selection input from patient."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Session", session_id)

    # Store the touch response as a message
    message = SessionMessage(
        session_id=session_id,
        message_type="patient_touch",
        content=str(touch_data.answer),
    )
    db.add(message)
    await db.flush()

    # TODO: Process through LLM for clinical structuring
    return VoiceInputResponse(
        transcription=str(touch_data.answer),
        confidence=1.0,
        structured=None,
        next_question="What other symptoms are you experiencing?",
        red_flags=[],
        follow_up_required=True,
    )


# ---- Conversation History ----


@router.get("/{session_id}/history", response_model=list[MessageResponse])
async def get_conversation_history(
    session_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Get the complete conversation history for a session."""
    result = await db.execute(
        select(SessionMessage)
        .where(SessionMessage.session_id == session_id)
        .order_by(SessionMessage.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/{session_id}/messages", response_model=MessageResponse, status_code=201)
async def create_message(
    session_id: int,
    message_data: MessageCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a message to the session conversation."""
    # Verify session exists
    result = await db.execute(select(Session).where(Session.id == session_id))
    if not result.scalar_one_or_none():
        raise NotFoundError("Session", session_id)

    message = SessionMessage(
        session_id=session_id,
        **message_data.model_dump(exclude_none=True),
    )
    db.add(message)
    await db.flush()
    await db.refresh(message)
    return message
