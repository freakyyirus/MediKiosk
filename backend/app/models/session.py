"""
Session model — clinical interview session with all history sections.
"""

from datetime import datetime

from sqlalchemy import BigInteger, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Session(Base):
    """Clinical interview session — the core entity for each patient visit."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    patient_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    kiosk_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    department: Mapped[str] = mapped_column(
        String(50), default="allopathy"
    )  # allopathy, ayurveda, unani, siddha, homeopathy
    language: Mapped[str] = mapped_column(String(10), default="hi")
    status: Mapped[str] = mapped_column(
        String(20), default="in_progress", index=True
    )  # in_progress, completed, under_review, reviewed, cancelled

    # ---- Clinical Data (JSONB for flexibility) ----
    chief_complaint: Mapped[str | None] = mapped_column(Text, nullable=True)
    history_hpi: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # SOCRATES structured
    past_medical_history: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    past_surgical_history: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    drug_history: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    allergy_history: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    family_history: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    personal_history: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    review_of_systems: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ayush_assessment: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # Dashavidha Pariksha

    # ---- AI Metadata ----
    asr_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    asr_confidence: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    llm_raw_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    red_flags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ---- Timing ----
    started_at: Mapped[datetime] = mapped_column(default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ---- ABDM ----
    abdm_consent_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fhir_bundle_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="sessions", lazy="selectin",
                          foreign_keys=[patient_id],
                          primaryjoin="Session.patient_id == Patient.id")
    messages = relationship("SessionMessage", back_populates="session", lazy="selectin",
                           cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="session", lazy="selectin",
                            cascade="all, delete-orphan",
                            foreign_keys="Document.session_id")
    summaries = relationship("Summary", back_populates="session", lazy="selectin",
                            cascade="all, delete-orphan")
    consent_records = relationship("ConsentRecord", back_populates="session", lazy="selectin",
                                  cascade="all, delete-orphan")
    red_flag_alerts = relationship("RedFlagAlert", back_populates="session", lazy="selectin",
                                  cascade="all, delete-orphan")
    ayush_assessment_record = relationship("AyushAssessment", back_populates="session",
                                          lazy="selectin", cascade="all, delete-orphan",
                                          uselist=False)

    def __repr__(self) -> str:
        return f"<Session(id={self.id}, status={self.status}, department={self.department})>"


class SessionMessage(Base):
    """Individual message in a clinical interview conversation."""

    __tablename__ = "session_messages"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(BigInteger, index=True)
    message_type: Mapped[str] = mapped_column(
        String(20)
    )  # ai_question, patient_voice, patient_touch, system
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    # Relationships
    session = relationship("Session", back_populates="messages",
                          foreign_keys=[session_id],
                          primaryjoin="SessionMessage.session_id == Session.id")

    def __repr__(self) -> str:
        return f"<SessionMessage(id={self.id}, type={self.message_type})>"
