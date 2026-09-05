"""
Patient model — demographics, ABHA linkage, and preferences.
"""

from datetime import date, datetime

from sqlalchemy import BigInteger, Date, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Patient(Base):
    """Patient demographics and identification."""

    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    abha_id: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True, index=True)
    aadhaar_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)  # SHA-256
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )  # male, female, other, unknown
    phone: Mapped[str | None] = mapped_column(String(15), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    language_preference: Mapped[str] = mapped_column(String(10), default="hi")

    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    # Relationships
    sessions = relationship("Session", back_populates="patient", lazy="selectin")
    documents = relationship("Document", back_populates="patient", lazy="selectin")
    consent_records = relationship("ConsentRecord", back_populates="patient", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Patient(id={self.id}, name={self.name}, abha_id={self.abha_id})>"
