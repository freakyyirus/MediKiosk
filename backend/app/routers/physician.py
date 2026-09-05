"""
Physician dashboard API endpoints.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.error_handler import MediKioskError, NotFoundError
from app.models.session import Session
from app.models.clinical import Summary
from app.schemas.schemas import (
    DashboardResponse,
    PhysicianQueueItem,
    SessionResponse,
    SummaryResponse,
    SummaryReviewRequest,
)

router = APIRouter(prefix="/api/v1/physician", tags=["Physician Dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_physician_dashboard(
    status: str = Query("pending", description="Filter by review status"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get physician's patient queue with pending summaries."""
    # Get sessions with pending summaries
    query = (
        select(Session)
        .where(Session.status.in_(["completed", "under_review"]))
        .order_by(Session.completed_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    sessions = result.scalars().all()

    queue_items = []
    for session in sessions:
        wait_minutes = 0
        if session.completed_at:
            delta = datetime.now(timezone.utc) - session.completed_at.replace(tzinfo=timezone.utc)
            wait_minutes = int(delta.total_seconds() / 60)

        priority = "normal"
        red_flags_list = []
        if session.red_flags:
            red_flags_list = session.red_flags if isinstance(session.red_flags, list) else []
            if any(rf.get("severity") == "critical" for rf in red_flags_list):
                priority = "critical"
            elif any(rf.get("severity") == "high" for rf in red_flags_list):
                priority = "high"

        patient_name = None
        if session.patient:
            patient_name = session.patient.name

        queue_items.append(
            PhysicianQueueItem(
                session_id=session.id,
                patient_name=patient_name,
                chief_complaint=session.chief_complaint,
                summary_preview=None,
                red_flags=red_flags_list,
                wait_time_minutes=wait_minutes,
                priority=priority,
            )
        )

    return DashboardResponse(
        pending_count=len(queue_items),
        queue=queue_items,
    )


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_physician_session_detail(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get full session details for physician review."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Session", session_id)
    return session


@router.post("/sessions/{session_id}/confirm", response_model=SummaryResponse)
async def confirm_session(
    session_id: int,
    review: SummaryReviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """Physician confirms, amends, or rejects a summary."""
    # Get the summary for this session
    result = await db.execute(
        select(Summary).where(Summary.session_id == session_id).order_by(Summary.created_at.desc())
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise NotFoundError("Summary", f"for session {session_id}")

    # Update summary
    summary.review_status = review.status
    summary.physician_id = review.physician_id
    summary.reviewed_at = datetime.now(timezone.utc)
    if review.physician_edits:
        summary.physician_edits = review.physician_edits

    # Update session status
    session_result = await db.execute(select(Session).where(Session.id == session_id))
    session = session_result.scalar_one_or_none()
    if session:
        session.status = "reviewed"

    await db.flush()
    await db.refresh(summary)
    return summary
