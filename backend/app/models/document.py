"""
Document model — uploaded medical documents with OCR results and extracted entities.
"""

from datetime import date, datetime

from sqlalchemy import BigInteger, Date, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Document(Base):
    """Uploaded medical document with OCR and NER extraction results."""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    patient_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)

    # File metadata
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Document metadata
    document_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True, index=True
    )  # prescription, lab_report, discharge_summary, imaging, insurance, other
    document_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    hospital_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # OCR Results
    ocr_raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ocr_confidence: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)

    # Structured Extraction (JSONB)
    extracted_diagnoses: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    extracted_medications: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    extracted_lab_results: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    extracted_procedures: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    extracted_vitals: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Processing status
    processing_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, processing, completed, failed

    created_at: Mapped[datetime] = mapped_column(default=func.now())

    # Relationships
    session = relationship(
        "Session",
        back_populates="documents",
        foreign_keys=[session_id],
        primaryjoin="Document.session_id == Session.id",
    )
    patient = relationship(
        "Patient",
        back_populates="documents",
        foreign_keys=[patient_id],
        primaryjoin="Document.patient_id == Patient.id",
    )

    def __repr__(self) -> str:
        return f"<Document(id={self.id}, type={self.document_type}, status={self.processing_status})>"
