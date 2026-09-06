"""
Patient management API endpoints.

Route visibility (kiosk model):
  * POST "" (create), GET "/{id}", GET "" (search) — intentionally PUBLIC so an
    anonymous walk-up kiosk patient can register and self-identify.
  * PATCH "/{id}" — STAFF ONLY (require_staff); modifies PHI and must not be
    reachable by walk-up anonymous clients.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.clerk_auth import require_staff
from app.middleware.error_handler import NotFoundError
from app.models.patient import Patient
from app.schemas.schemas import PatientCreate, PatientResponse, PatientUpdate

router = APIRouter(prefix="/api/v1/patients", tags=["Patients"])


@router.post("", response_model=PatientResponse, status_code=201)
async def create_patient(
    patient_data: PatientCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new patient (with ABHA ID or walk-in)."""
    patient = Patient(**patient_data.model_dump(exclude_none=True))
    db.add(patient)
    await db.flush()
    await db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a patient by ID."""
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise NotFoundError("Patient", patient_id)
    return patient


@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_staff()),
):
    """Partially update a patient."""
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise NotFoundError("Patient", patient_id)

    update_data = patient_data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    await db.flush()
    await db.refresh(patient)
    return patient


@router.get("", response_model=list[PatientResponse])
async def search_patients(
    abha_id: str | None = Query(None, description="Search by ABHA ID"),
    phone: str | None = Query(None, description="Search by phone number"),
    name: str | None = Query(None, description="Search by name (fuzzy)"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Search patients by ABHA ID, phone, or name."""
    query = select(Patient)

    filters = []
    if abha_id:
        filters.append(Patient.abha_id == abha_id)
    if phone:
        filters.append(Patient.phone == phone)
    if name:
        filters.append(Patient.name.ilike(f"%{name}%"))

    if filters:
        query = query.where(or_(*filters))

    query = query.offset(offset).limit(limit).order_by(Patient.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()
