"""
Consent management endpoints.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.error_handler import NotFoundError
from app.models.clinical import ConsentRecord
from app.models.session import Session

router = APIRouter(prefix="/api/v1/consent", tags=["Consent"])


class ConsentItemInput(BaseModel):
    consent_type: str
    granted: bool


class ConsentSubmitRequest(BaseModel):
    session_id: int
    patient_id: int | None = None
    consents: list[ConsentItemInput]


class ConsentItemResponse(BaseModel):
    id: int
    consent_type: str
    granted: bool

    model_config = {"from_attributes": True}


@router.post("/submit", response_model=list[ConsentItemResponse])
async def submit_consents(
    req: ConsentSubmitRequest,
    db: AsyncSession = Depends(get_db),
):
    """Submit granular consent records for a session."""
    result = await db.execute(select(Session).where(Session.id == req.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Session", req.session_id)

    records = []
    for item in req.consents:
        cr = ConsentRecord(
            session_id=req.session_id,
            patient_id=req.patient_id or session.patient_id,
            consent_type=item.consent_type,
            granted=item.granted,
            granted_at=datetime.now(UTC) if item.granted else None,
        )
        db.add(cr)
        records.append(cr)

    await db.flush()
    for cr in records:
        await db.refresh(cr)

    return records
