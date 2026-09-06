"""
Clinical Summary endpoints.
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm_client import GeminiClient
from app.database import get_db
from app.models.clinical import Summary
from app.models.session import Session
from app.schemas.schemas import SummaryGenerateResponse, SummaryResponse

logger = logging.getLogger("medikiosk.routers.summaries")
router = APIRouter(prefix="/api/v1/summaries", tags=["Summaries"])
llm_client = GeminiClient()


def _build_session_data(session: Session) -> dict:
    """Extract all clinical data from a session into a flat dict for the LLM."""
    data: dict = {}
    if session.chief_complaint:
        data["chief_complaint"] = session.chief_complaint
    if session.history_hpi:
        data["history_hpi"] = session.history_hpi
    if session.past_medical_history:
        data["past_medical_history"] = session.past_medical_history
    if session.past_surgical_history:
        data["past_surgical_history"] = session.past_surgical_history
    if session.drug_history:
        data["drug_history"] = session.drug_history
    if session.allergy_history:
        data["allergy_history"] = session.allergy_history
    if session.family_history:
        data["family_history"] = session.family_history
    if session.personal_history:
        data["personal_history"] = session.personal_history
    if session.review_of_systems:
        data["review_of_systems"] = session.review_of_systems
    if session.red_flags:
        data["red_flags"] = session.red_flags
    data["language"] = session.language
    data["department"] = session.department
    return data


@router.post("/generate/{session_id}", response_model=SummaryGenerateResponse)
async def generate_summary(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Generate a clinical summary from real session data."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        return SummaryGenerateResponse(
            summary_id=0,
            summary_text="",
            confidence=0,
        )

    session_data = _build_session_data(session)
    summary_text = await llm_client.generate_summary(session_data)

    summary = Summary(
        session_id=session_id,
        patient_id=session.patient_id,
        summary_text=summary_text,
        review_status="pending",
    )
    db.add(summary)
    await db.flush()
    await db.refresh(summary)

    return SummaryGenerateResponse(
        summary_id=summary.id,
        summary_text=summary_text,
        confidence=float(session.confidence_score or 0.85),
    )


@router.get("/session/{session_id}", response_model=SummaryResponse | None)
async def get_session_summary(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get the latest summary for a session."""
    result = await db.execute(select(Summary).where(Summary.session_id == session_id).order_by(Summary.created_at.desc()).limit(1))
    summary = result.scalar_one_or_none()
    return summary
