"""
Seed script to populate the database with sample data.
Usage: cd backend && python -m scripts.seed_db
"""

import asyncio
import random
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import text

from app.database import Base, async_session_factory, engine
from app.models.clinical import ConsentRecord, Summary
from app.models.patient import Patient
from app.models.session import Session, SessionMessage

SAMPLE_PATIENTS = [
    {
        "name": "Rajesh Kumar",
        "abha_id": "ABHA-1234-5678",
        "gender": "Male",
        "date_of_birth": date(1975, 3, 15),
        "phone": "9876543210",
        "language_preference": "hi",
    },
    {
        "name": "Priya Sharma",
        "abha_id": "ABHA-2345-6789",
        "gender": "Female",
        "date_of_birth": date(1988, 7, 22),
        "phone": "9876543211",
        "language_preference": "en",
    },
    {
        "name": "Amit Patel",
        "abha_id": "ABHA-3456-7890",
        "gender": "Male",
        "date_of_birth": date(1965, 11, 5),
        "phone": "9876543212",
        "language_preference": "gu",
    },
    {
        "name": "Sunita Devi",
        "abha_id": "ABHA-4567-8901",
        "gender": "Female",
        "date_of_birth": date(1992, 1, 30),
        "phone": "9876543213",
        "language_preference": "hi",
    },
    {
        "name": "Mohammed Ali",
        "abha_id": "ABHA-5678-9012",
        "gender": "Male",
        "date_of_birth": date(1980, 9, 12),
        "phone": "9876543214",
        "language_preference": "ur",
    },
]

SAMPLE_SESSIONS = [
    {
        "department": "General Medicine",
        "chief_complaint": "Persistent chest pain for 2 days, worsening on exertion",
        "history_hpi": {"onset": "2 days ago", "character": "crushing", "severity": "7/10", "location": "central chest"},
        "past_medical_history": {"conditions": ["Hypertension", "Type 2 Diabetes"]},
        "drug_history": {"medications": ["Amlodipine 5mg", "Metformin 500mg"]},
        "allergy_history": {"allergies": ["Penicillin"]},
        "red_flags": [{"type": "chest_pain_mi", "severity": "critical", "confidence": 0.95}],
    },
    {
        "department": "Orthopedics",
        "chief_complaint": "Severe lower back pain radiating to left leg for 1 week",
        "history_hpi": {"onset": "1 week", "character": "sharp", "severity": "8/10", "location": "lower back, left leg"},
        "past_medical_history": {},
        "red_flags": [],
    },
    {
        "department": "Pediatrics",
        "chief_complaint": "Child has high fever (103F) for 3 days with body ache",
        "history_hpi": {"onset": "3 days", "severity": "6/10", "associated_symptoms": ["body ache", "headache"]},
        "past_medical_history": {},
        "red_flags": [{"type": "high_fever_child", "severity": "high", "confidence": 0.90}],
    },
    {
        "department": "ENT",
        "chief_complaint": "Persistent cough with blood-tinged sputum for 5 days",
        "history_hpi": {"onset": "5 days", "character": "productive cough with blood", "severity": "5/10"},
        "past_medical_history": {"conditions": ["Smoker 10 years"]},
        "red_flags": [{"type": "hemoptysis", "severity": "high", "confidence": 0.88}],
    },
    {
        "department": "General Medicine",
        "chief_complaint": "Recurring headaches with nausea for 2 weeks",
        "history_hpi": {"onset": "2 weeks", "character": "throbbing", "severity": "6/10", "location": "forehead and temples"},
        "past_medical_history": {},
        "red_flags": [],
    },
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        result = await session.execute(text("SELECT COUNT(*) FROM patients"))
        count = result.scalar()
        if count > 0:
            print(f"Database already has {count} patients. Skipping seed.")
            return

        patients = []
        for p in SAMPLE_PATIENTS:
            patient = Patient(**p)
            session.add(patient)
            patients.append(patient)

        await session.flush()

        for i, sess_data in enumerate(SAMPLE_SESSIONS):
            patient = patients[i % len(patients)]
            sess = Session(
                patient_id=patient.id,
                kiosk_id="KIOSK-001",
                department=sess_data["department"],
                language=patient.language_preference,
                status="completed",
                chief_complaint=sess_data.get("chief_complaint"),
                history_hpi=sess_data.get("history_hpi"),
                past_medical_history=sess_data.get("past_medical_history"),
                drug_history=sess_data.get("drug_history"),
                allergy_history=sess_data.get("allergy_history"),
                red_flags=sess_data.get("red_flags"),
                confidence_score=round(random.uniform(0.78, 0.98), 2),
                started_at=datetime.now(UTC) - timedelta(hours=random.randint(1, 8)),
                completed_at=datetime.now(UTC) - timedelta(minutes=random.randint(5, 60)),
                duration_seconds=random.randint(120, 480),
            )
            session.add(sess)
            await session.flush()

            msg = SessionMessage(
                session_id=sess.id,
                message_type="patient_voice",
                content=sess_data["chief_complaint"],
                confidence=round(random.uniform(0.85, 0.99), 2),
            )
            session.add(msg)

            consent = ConsentRecord(
                session_id=sess.id,
                patient_id=patient.id,
                consent_type="data_collection",
                granted=True,
                granted_at=datetime.now(UTC),
            )
            session.add(consent)

            summary = Summary(
                session_id=sess.id,
                patient_id=patient.id,
                summary_text=(
                    f"Patient presents with: {sess_data['chief_complaint']}. "
                    f"History: {sess_data.get('history_hpi', {})}. "
                    "Plan: Clinical evaluation recommended."
                ),
                review_status="pending",
            )
            session.add(summary)

        await session.commit()
        print(f"Seeded {len(patients)} patients with {len(SAMPLE_SESSIONS)} sessions.")


if __name__ == "__main__":
    asyncio.run(seed())
