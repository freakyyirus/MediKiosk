"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-09-03

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "patients",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("abha_id", sa.String(length=50), unique=True, index=True),
        sa.Column("aadhaar_hash", sa.String(length=128)),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("date_of_birth", sa.Date()),
        sa.Column("gender", sa.String(length=20)),
        sa.Column("phone", sa.String(length=20)),
        sa.Column("email", sa.String(length=200)),
        sa.Column("address", sa.Text()),
        sa.Column("language_preference", sa.String(length=10), server_default="en"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "sessions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("patient_id", sa.BigInteger(), index=True),
        sa.Column("kiosk_id", sa.String(length=50), index=True),
        sa.Column("department", sa.String(length=100), nullable=False),
        sa.Column("language", sa.String(length=10), server_default="en"),
        sa.Column("status", sa.String(length=20), server_default="active", index=True),
        sa.Column("chief_complaint", sa.Text()),
        sa.Column("history_hpi", postgresql.JSONB()),
        sa.Column("past_medical_history", postgresql.JSONB()),
        sa.Column("past_surgical_history", postgresql.JSONB()),
        sa.Column("drug_history", postgresql.JSONB()),
        sa.Column("allergy_history", postgresql.JSONB()),
        sa.Column("family_history", postgresql.JSONB()),
        sa.Column("personal_history", postgresql.JSONB()),
        sa.Column("review_of_systems", postgresql.JSONB()),
        sa.Column("ayush_assessment", postgresql.JSONB()),
        sa.Column("asr_transcript", sa.Text()),
        sa.Column("asr_confidence", sa.Float()),
        sa.Column("llm_raw_response", postgresql.JSONB()),
        sa.Column("confidence_score", sa.Float()),
        sa.Column("red_flags", postgresql.JSONB()),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("duration_seconds", sa.Integer()),
        sa.Column("abdm_consent_id", sa.String(length=100)),
        sa.Column("fhir_bundle_id", sa.String(length=100)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "session_messages",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.BigInteger(), nullable=False, index=True),
        sa.Column("message_type", sa.String(length=30), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("audio_url", sa.String(length=500)),
        sa.Column("confidence", sa.Float()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "documents",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.BigInteger(), index=True),
        sa.Column("patient_id", sa.BigInteger(), index=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger()),
        sa.Column("mime_type", sa.String(length=100)),
        sa.Column("document_type", sa.String(length=50), index=True),
        sa.Column("document_date", sa.Date()),
        sa.Column("hospital_name", sa.String(length=200)),
        sa.Column("doctor_name", sa.String(length=200)),
        sa.Column("ocr_raw_text", sa.Text()),
        sa.Column("ocr_confidence", sa.Float()),
        sa.Column("extracted_diagnoses", postgresql.JSONB()),
        sa.Column("extracted_medications", postgresql.JSONB()),
        sa.Column("extracted_lab_results", postgresql.JSONB()),
        sa.Column("extracted_procedures", postgresql.JSONB()),
        sa.Column("extracted_vitals", postgresql.JSONB()),
        sa.Column("processing_status", sa.String(length=20), server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "summaries",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.BigInteger(), nullable=False, index=True),
        sa.Column("patient_id", sa.BigInteger()),
        sa.Column("summary_text", sa.Text(), nullable=False),
        sa.Column("summary_format", sa.String(length=20), server_default="narrative"),
        sa.Column("physician_id", sa.String(length=100)),
        sa.Column("physician_edits", postgresql.JSONB()),
        sa.Column("review_status", sa.String(length=20), server_default="pending", index=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("fhir_bundle", postgresql.JSONB()),
        sa.Column("pushed_to_abdm", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("pushed_to_his", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "consent_records",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.BigInteger(), nullable=False, index=True),
        sa.Column("patient_id", sa.BigInteger()),
        sa.Column("consent_type", sa.String(length=50), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True)),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("ip_address", sa.String(length=50)),
        sa.Column("kiosk_id", sa.String(length=50)),
        sa.Column("audio_consent_hash", sa.String(length=256)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "red_flag_alerts",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.BigInteger(), nullable=False, index=True),
        sa.Column("patient_id", sa.BigInteger()),
        sa.Column("alert_type", sa.String(length=50), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False, index=True),
        sa.Column("symptoms_triggered", postgresql.JSONB()),
        sa.Column("transcript_snippet", sa.Text()),
        sa.Column("notified_roles", postgresql.JSONB()),
        sa.Column("priority_token", sa.String(length=20)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("resolved_by", sa.String(length=100)),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("table_name", sa.String(length=50), nullable=False),
        sa.Column("record_id", sa.BigInteger(), nullable=False),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("performed_by", sa.String(length=100)),
        sa.Column("performed_by_role", sa.String(length=30)),
        sa.Column("old_values", postgresql.JSONB()),
        sa.Column("new_values", postgresql.JSONB()),
        sa.Column("ip_address", sa.String(length=50)),
        sa.Column("user_agent", sa.String(length=200)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
    )

    op.create_table(
        "ayush_assessments",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.BigInteger(), unique=True),
        sa.Column("prakriti_vata", sa.Numeric(3, 1)),
        sa.Column("prakriti_pitta", sa.Numeric(3, 1)),
        sa.Column("prakriti_kapha", sa.Numeric(3, 1)),
        sa.Column("prakriti_dominant", sa.String(length=20)),
        sa.Column("vikriti_vata", sa.Numeric(3, 1)),
        sa.Column("vikriti_pitta", sa.Numeric(3, 1)),
        sa.Column("vikriti_kapha", sa.Numeric(3, 1)),
        sa.Column("vikriti_dominant", sa.String(length=20)),
        sa.Column("dashavidha_prakriti", sa.String(length=20)),
        sa.Column("dashavidha_annavaha", sa.String(length=20)),
        sa.Column("dashavidha_puranavaha", sa.String(length=20)),
        sa.Column("dashavidha_udyamavaha", sa.String(length=20)),
        sa.Column("dashavidha_samhananavaha", sa.String(length=20)),
        sa.Column("dashavidha_pramanavaha", sa.String(length=20)),
        sa.Column("dashavidha_sathmyavaha", sa.String(length=20)),
        sa.Column("dashavidha_saraavaha", sa.String(length=20)),
        sa.Column("dashavidha_satmyavaha", sa.String(length=20)),
        sa.Column("dashavidha_samanavaha", sa.String(length=20)),
        sa.Column("dashavidha_vyanavaha", sa.String(length=20)),
        sa.Column("nidana", sa.Text()),
        sa.Column("samprapti", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("ayush_assessments")
    op.drop_table("audit_logs")
    op.drop_table("red_flag_alerts")
    op.drop_table("consent_records")
    op.drop_table("summaries")
    op.drop_table("documents")
    op.drop_table("session_messages")
    op.drop_table("sessions")
    op.drop_table("patients")
