"""
Summary, Consent, Red Flag, Audit Log, and AYUSH Assessment models.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Summary(Base):
    """AI-generated clinical summary for physician review."""

    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(BigInteger, index=True)
    patient_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_format: Mapped[str] = mapped_column(String(20), default="structured_text")

    # Physician review
    physician_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    physician_edits: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    review_status: Mapped[str] = mapped_column(
        String(20), default="pending", index=True
    )  # pending, confirmed, amended, rejected
    reviewed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # ABDM
    fhir_bundle: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    pushed_to_abdm: Mapped[bool] = mapped_column(Boolean, default=False)
    pushed_to_his: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    # Relationships
    session = relationship("Session", back_populates="summaries",
                          foreign_keys=[session_id],
                          primaryjoin="Summary.session_id == Session.id")

    def __repr__(self) -> str:
        return f"<Summary(id={self.id}, status={self.review_status})>"


class ConsentRecord(Base):
    """Granular consent tracking for DPDP Act compliance."""

    __tablename__ = "consent_records"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(BigInteger, index=True)
    patient_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    consent_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # data_capture, his_share, abdm_link, referral_share, research
    granted: Mapped[bool] = mapped_column(Boolean, default=False)
    granted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Audit
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    kiosk_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    audio_consent_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=func.now())

    # Relationships
    session = relationship("Session", back_populates="consent_records",
                          foreign_keys=[session_id],
                          primaryjoin="ConsentRecord.session_id == Session.id")
    patient = relationship("Patient", back_populates="consent_records",
                          foreign_keys=[patient_id],
                          primaryjoin="ConsentRecord.patient_id == Patient.id")

    def __repr__(self) -> str:
        return f"<ConsentRecord(id={self.id}, type={self.consent_type}, granted={self.granted})>"


class RedFlagAlert(Base):
    """Emergency symptom detection alert."""

    __tablename__ = "red_flag_alerts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(BigInteger, index=True)
    patient_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    alert_type: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # chest_pain_mi, stroke, gi_bleed, etc.
    severity: Mapped[str | None] = mapped_column(
        String(20), nullable=True, index=True
    )  # critical, high, medium
    symptoms_triggered: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    transcript_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)

    notified_roles: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    priority_token: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    session = relationship("Session", back_populates="red_flag_alerts",
                          foreign_keys=[session_id],
                          primaryjoin="RedFlagAlert.session_id == Session.id")

    def __repr__(self) -> str:
        return f"<RedFlagAlert(id={self.id}, type={self.alert_type}, severity={self.severity})>"


class AuditLog(Base):
    """Immutable audit trail for all PHI access."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    table_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    record_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    action: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # CREATE, READ, UPDATE, DELETE
    performed_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    performed_by_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    old_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    new_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), index=True)

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, table={self.table_name}, action={self.action})>"


class AyushAssessment(Base):
    """AYUSH Dashavidha Pariksha assessment (10-parameter Ayurvedic evaluation)."""

    __tablename__ = "ayush_assessments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(BigInteger, unique=True)

    # Prakriti (Constitution)
    prakriti_vata: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    prakriti_pitta: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    prakriti_kapha: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    prakriti_dominant: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Vikriti (Current Imbalance)
    vikriti_vata: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    vikriti_pitta: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    vikriti_kapha: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    vikriti_dominant: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # 10 Dashavidha Pariksha parameters
    agni_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # tikshna, vishama, manda, sama
    koshtha_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # mrudu, madhya, krura
    sara: Mapped[str | None] = mapped_column(String(20), nullable=True)
    samhanana: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pramana: Mapped[str | None] = mapped_column(String(20), nullable=True)
    satmya: Mapped[str | None] = mapped_column(Text, nullable=True)
    sattva: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ahara_shakti: Mapped[str | None] = mapped_column(String(20), nullable=True)
    vyayama_shakti: Mapped[str | None] = mapped_column(String(20), nullable=True)
    vaya: Mapped[str | None] = mapped_column(String(20), nullable=True)  # bala, madhya, vriddha

    # Clinical reasoning
    nidana: Mapped[str | None] = mapped_column(Text, nullable=True)  # causative factors
    samprapti: Mapped[str | None] = mapped_column(Text, nullable=True)  # pathogenesis

    created_at: Mapped[datetime] = mapped_column(default=func.now())

    # Relationships
    session = relationship("Session", back_populates="ayush_assessment_record",
                          foreign_keys=[session_id],
                          primaryjoin="AyushAssessment.session_id == Session.id")

    def __repr__(self) -> str:
        return f"<AyushAssessment(id={self.id}, prakriti={self.prakriti_dominant})>"
