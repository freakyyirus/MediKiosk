"""
Pydantic schemas for Patient, Session, Document, Summary, and related entities.
"""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

# ============================================
# PATIENT SCHEMAS
# ============================================


class PatientCreate(BaseModel):
    """Create a new patient."""

    abha_id: str | None = Field(None, max_length=32, description="ABHA ID (optional for walk-in)")
    name: str | None = Field(None, max_length=255)
    date_of_birth: date | None = None
    gender: str | None = Field(None, pattern="^(male|female|other|unknown)$")
    phone: str | None = Field(None, max_length=15)
    email: EmailStr | None = None
    address: str | None = None
    language_preference: str = Field("hi", max_length=10)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v and not v.replace("+", "").replace("-", "").replace(" ", "").isdigit():
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: date | None) -> date | None:
        if v and v > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return v


class PatientUpdate(BaseModel):
    """Partial update for a patient."""

    name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    language_preference: str | None = None


class PatientResponse(BaseModel):
    """Patient response object."""

    id: int
    abha_id: str | None = None
    name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    language_preference: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================
# SESSION SCHEMAS
# ============================================


class SessionCreate(BaseModel):
    """Create a new clinical session."""

    language: str = Field("hi", max_length=10)
    department: str = Field("allopathy", pattern="^(allopathy|ayurveda|unani|siddha|homeopathy)$")
    kiosk_id: str | None = Field(None, max_length=50)
    patient_id: int | None = None


class SessionUpdate(BaseModel):
    """Partial update for a session."""

    chief_complaint: str | None = None
    history_hpi: dict[str, Any] | None = None
    past_medical_history: dict[str, Any] | None = None
    past_surgical_history: dict[str, Any] | None = None
    drug_history: dict[str, Any] | None = None
    allergy_history: dict[str, Any] | None = None
    family_history: dict[str, Any] | None = None
    personal_history: dict[str, Any] | None = None
    review_of_systems: dict[str, Any] | None = None
    ayush_assessment: dict[str, Any] | None = None
    status: str | None = Field(
        None, pattern="^(in_progress|completed|under_review|reviewed|cancelled)$"
    )


class SessionResponse(BaseModel):
    """Session response object."""

    id: int
    patient_id: int | None = None
    kiosk_id: str | None = None
    department: str
    language: str
    status: str
    chief_complaint: str | None = None
    history_hpi: dict[str, Any] | None = None
    past_medical_history: dict[str, Any] | None = None
    past_surgical_history: dict[str, Any] | None = None
    drug_history: dict[str, Any] | None = None
    allergy_history: dict[str, Any] | None = None
    family_history: dict[str, Any] | None = None
    personal_history: dict[str, Any] | None = None
    review_of_systems: dict[str, Any] | None = None
    ayush_assessment: dict[str, Any] | None = None
    asr_confidence: float | None = None
    confidence_score: float | None = None
    red_flags: dict[str, Any] | None = None
    started_at: datetime
    completed_at: datetime | None = None
    duration_seconds: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SessionCreateResponse(BaseModel):
    """Response after creating a session."""

    session_id: int
    token: str
    expires_in: int


# ============================================
# MESSAGE SCHEMAS
# ============================================


class MessageCreate(BaseModel):
    """Create a session message."""

    message_type: str = Field(..., pattern="^(ai_question|patient_voice|patient_touch|system)$")
    content: str | None = None
    audio_url: str | None = None
    confidence: float | None = Field(None, ge=0, le=1)


class MessageResponse(BaseModel):
    """Message response object."""

    id: int
    session_id: int
    message_type: str
    content: str | None = None
    audio_url: str | None = None
    confidence: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================
# VOICE INPUT SCHEMAS
# ============================================


class VoiceInputResponse(BaseModel):
    """Response after processing voice input."""

    transcription: str
    confidence: float
    structured: dict[str, Any] | None = None
    next_question: str | None = None
    red_flags: list[dict[str, Any]] = []
    follow_up_required: bool = True


class TouchInputRequest(BaseModel):
    """Touch/selection input from patient."""

    question_id: str
    answer: dict[str, Any]


# ============================================
# DOCUMENT SCHEMAS
# ============================================


class DocumentResponse(BaseModel):
    """Document response object."""

    id: int
    session_id: int | None = None
    patient_id: int | None = None
    file_name: str | None = None
    file_size_bytes: int | None = None
    mime_type: str | None = None
    document_type: str | None = None
    document_date: date | None = None
    hospital_name: str | None = None
    doctor_name: str | None = None
    ocr_raw_text: str | None = None
    ocr_confidence: float | None = None
    extracted_diagnoses: dict[str, Any] | None = None
    extracted_medications: dict[str, Any] | None = None
    extracted_lab_results: dict[str, Any] | None = None
    extracted_procedures: dict[str, Any] | None = None
    extracted_vitals: dict[str, Any] | None = None
    processing_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentUploadResponse(BaseModel):
    """Response after uploading a document."""

    document_id: int
    processing_status: str
    estimated_time: int  # seconds


# ============================================
# SUMMARY SCHEMAS
# ============================================


class SummaryResponse(BaseModel):
    """Summary response object."""

    id: int
    session_id: int
    patient_id: int | None = None
    summary_text: str | None = None
    summary_format: str
    review_status: str
    physician_edits: dict[str, Any] | None = None
    reviewed_at: datetime | None = None
    fhir_bundle: dict[str, Any] | None = None
    pushed_to_abdm: bool
    pushed_to_his: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SummaryGenerateResponse(BaseModel):
    """Response after generating a summary."""

    summary_id: int
    summary_text: str
    confidence: float


class SummaryReviewRequest(BaseModel):
    """Physician review action on a summary."""

    status: str = Field(..., pattern="^(confirmed|amended|rejected)$")
    physician_edits: dict[str, Any] | None = None
    physician_id: int


# ============================================
# CONSENT SCHEMAS
# ============================================


class ConsentRequest(BaseModel):
    """Consent collection request."""

    session_id: int
    consent_types: list[str]  # data_capture, his_share, abdm_link, referral_share, research


class ConsentResponse(BaseModel):
    """Consent response."""

    consent_id: int
    consent_type: str
    granted: bool
    granted_at: datetime | None = None

    model_config = {"from_attributes": True}


# ============================================
# AUTH SCHEMAS
# ============================================


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


# ============================================
# PHYSICIAN DASHBOARD SCHEMAS
# ============================================


class PhysicianQueueItem(BaseModel):
    """Single item in the physician's patient queue."""

    session_id: int
    patient_name: str | None = None
    chief_complaint: str | None = None
    summary_preview: str | None = None
    red_flags: list[dict[str, Any]] = []
    wait_time_minutes: int = 0
    priority: str = "normal"  # normal, high, critical


class DashboardResponse(BaseModel):
    """Physician dashboard data."""

    pending_count: int
    queue: list[PhysicianQueueItem]


# ============================================
# COMMON SCHEMAS
# ============================================


class PaginatedResponse(BaseModel):
    """Paginated list response."""

    items: list[Any]
    total: int
    page: int
    per_page: int
    pages: int


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: dict[str, Any]
