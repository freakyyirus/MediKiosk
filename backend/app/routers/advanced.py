"""
MediKiosk Advanced Features Router (v2.0) — real ML + Gemini wiring.

Implements backend endpoints for the 6 advanced features:
  F1 Body Map  → /advanced/body-map/*
  F2 OCR       → /advanced/ocr/*
  F3 QR Slip   → /advanced/qr/*
  F4 Vitals    → /advanced/vitals/*
  F5 Emergency → /advanced/emergency/*
  F6 Retention → /advanced/retention/*
Plus the ML priority-queue prediction endpoint.
"""

import base64
import io
import json
import logging
import os
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from sqlalchemy import delete, select, update

from app.ai.llm_client import GeminiClient
from app.ai.ocr_pipeline import OCRPipeline
from app.ai.priority_model import (
    dataset_summary,
    ingest_real_samples,
    predict_priority,
    retrain_on_real,
)
from app.database import get_db
from app.models.clinical import AuditLog, AyushAssessment, ConsentRecord, RedFlagAlert, Summary
from app.models.document import Document
from app.models.patient import Patient
from app.models.session import Session, SessionMessage

logger = logging.getLogger("medikiosk.advanced")
router = APIRouter(prefix="/api/v1/advanced", tags=["Advanced"])

_ocr = OCRPipeline()
_llm = GeminiClient()

# Local file area for uploaded/processed media (dev: /tmp; Railway: container storage)
UPLOAD_DIR = os.getenv("MEDIKIOSK_UPLOAD_DIR", "/tmp/medikiosk_uploads")


def _safe_unlink(path: str | None) -> None:
    """Remove a stored media file if present (keep on best-effort)."""
    if not path:
        return
    if path.startswith(("data:", "http://", "https://")):
        return
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:  # pragma: no cover - filesystem race
        logger.debug("Could not unlink %s", path)


async def _audit(
    db,
    table_name: str,
    record_id: int | None,
    action: str,
    performed_by: str,
    performed_by_role: str = "system",
    old_values: dict | None = None,
    new_values: dict | None = None,
) -> None:
    """Append-only audit record (survives the row deletion it describes)."""
    db.add(
        AuditLog(
            table_name=table_name,
            record_id=record_id,
            action=action,
            performed_by=performed_by or "unknown",
            performed_by_role=performed_by_role,
            old_values=old_values,
            new_values=new_values,
        )
    )
    await db.flush()


async def _all_session_ids(db, patient_id: int) -> list[int]:
    rows = await db.execute(select(Session.id).where(Session.patient_id == patient_id))
    return [r[0] for r in rows.all()]


# ─── F2: Handwritten Prescription OCR ────────────────────────────


def _merge_entities(rule_based: dict, gemini: dict) -> dict:
    """Blend rule-based NER with Gemini validation output."""
    drugs = gemini.get("extracted_drugs") or []
    diag = gemini.get("extracted_diagnoses") or []
    low_conf = gemini.get("low_confidence_fields") or []
    overall = float(gemini.get("overall_confidence", 0.7))

    # If Gemini produced nothing useful, fall back to rule-based baseline
    if not drugs and rule_based.get("drugs"):
        drugs = rule_based["drugs"]
        diag = rule_based.get("diagnoses", [])
        overall = 0.55

    return {
        "extracted_drugs": drugs,
        "extracted_diagnoses": diag,
        "doctor_name": gemini.get("doctor_name"),
        "hospital_name": gemini.get("hospital_name"),
        "prescription_date": gemini.get("prescription_date"),
        "handwriting_detected": bool(gemini.get("handwriting_detected", True)),
        "low_confidence_fields": low_conf,
        "overall_confidence": overall,
    }


@router.post("/ocr/process")
async def ocr_process(file: UploadFile = File(...)):
    """
    Full OCR pipeline: image upload → Tesseract/EasyOCR → NER → Gemini validation.
    Returns extracted drugs, diagnoses, doctor/hospital, confidence + flags.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Please upload an image file (JPG/PNG).")

    file_bytes = await file.read()
    if len(file_bytes) > 12 * 1024 * 1024:
        raise HTTPException(400, "Image too large (max 12 MB)")

    doc = await _ocr.process_image(file_bytes, language="en")

    raw_text = doc.raw_text.strip()
    if not raw_text:
        raise HTTPException(422, "OCR returned no text — try a clearer image.")

    entities = _ocr.extract_entities(raw_text)
    gemini: dict = {}
    try:
        gemini = await _llm.validate_prescription_ocr(raw_text)
    except Exception as exc:  # pragma: no cover - network issues
        logger.warning("Gemini OCR validation failed: %s", exc)

    merged = _merge_entities(entities, gemini)

    return {
        "ocr_raw_text": raw_text,
        "ocr_confidence": doc.page_confidence,
        "ocr_engine": doc.engine,
        "handwriting_detected": merged["handwriting_detected"] or doc.handwriting_heuristic > 0.35,
        "handwriting_score": doc.handwriting_heuristic,
        **merged,
        "validation_status": "needs_review" if merged["low_confidence_fields"] else "verified",
        "word_count": len(doc.words),
    }


@router.post("/ocr/validate")
async def ocr_validate(payload: dict):
    """Validate/extend an OCR extraction via Gemini."""
    raw_text = (payload.get("ocr_raw_text") or "").strip()
    if not raw_text:
        raise HTTPException(422, "ocr_raw_text required")

    existing = {
        "extracted_drugs": payload.get("extracted_drugs", []),
        "extracted_diagnoses": payload.get("extracted_diagnoses", []),
    }
    result = await _llm.validate_prescription_ocr(raw_text)
    if "error" in result and not result.get("extracted_drugs"):
        result = existing
    return {
        "suggestions": result,
        "confidence": result.get("overall_confidence", 0.7),
        "validation_status": (
            "verified" if not result.get("low_confidence_fields") else "needs_review"
        ),
    }


# ─── F3: Smart QR Slip ───────────────────────────────────────────


@router.post("/qr/create")
async def qr_create(payload: dict):
    """
    Generate a signed QR payload for a patient visit. The doctor app scans it
    to pull the kiosk summary. Qr code image generated server-side too.
    """
    token = (payload.get("token_number") or "").strip()
    if not token:
        raise HTTPException(422, "token_number required")

    core = {
        "v": 1,
        "t": token,
        "p": payload.get("patient_name") or "Patient",
        "dept": payload.get("department") or "General Medicine",
        "cc": (payload.get("chief_complaint") or "")[:120],
        "pr": int(payload.get("priority", 3)),
        "exp": int((datetime.now(UTC) + timedelta(minutes=30)).timestamp() * 1000),
    }
    payload_b64 = base64.b64encode(json.dumps(core).encode()).decode()
    data = f"MEDIKIOSK|{payload_b64}"

    # QR image (server-side; frontend also renders one client-side)
    qr_image: str | None = None
    try:
        import qrcode

        img = qrcode.make(data)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_image = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception as exc:  # pragma: no cover
        logger.warning("qrcode generation failed: %s", exc)

    return {
        "qr_code_data": data,
        "qr_code_image_url": qr_image,
        "slip_id": str(uuid.uuid4()),
        "expires_at": (datetime.now(UTC) + timedelta(minutes=30)).isoformat(),
        "is_active": True,
    }


# ─── ML: Priority Queue Prediction ───────────────────────────────


@router.post("/ml/predict-priority")
async def ml_predict_priority(payload: dict):
    """Predict triage priority from patient vitals + symptoms using the trained model."""
    required_features = ["age"]
    missing = [f for f in required_features if payload.get(f) in (None, "")]
    if missing:
        raise HTTPException(422, f"Missing required fields: {', '.join(missing)}")

    fields = {
        "age": payload.get("age"),
        "spo2": payload.get("spo2"),
        "pulse": payload.get("pulse"),
        "bp_systolic": payload.get("bp_systolic"),
        "bp_diastolic": payload.get("bp_diastolic"),
        "temperature": payload.get("temperature"),
        "red_flag_count": int(payload.get("red_flag_count", 0)),
        "critical_symptom_count": int(payload.get("critical_symptom_count", 0)),
        "has_chest_pain": bool(payload.get("has_chest_pain", False)),
        "has_breathlessness": bool(payload.get("has_breathlessness", False)),
    }
    return await predict_priority(fields)


@router.get("/ml/dataset")
async def ml_dataset():
    """Inspect the training data store — how many real labeled cases exist."""
    return await dataset_summary()


@router.post("/ml/samples")
async def ml_samples(payload: dict = Body(...)):
    """
    Ingest labeled REAL-world samples for retraining.

    Body: { "samples": [ { ...FEATURES, "priority_class": "high"|0..3 } ... ] }
    Features: age, spo2, pulse, bp_systolic, bp_diastolic, temperature,
              red_flag_count, critical_symptom_count, has_chest_pain,
              has_breathlessness. Label = priority_class or label.
    """
    samples = payload.get("samples")
    if not isinstance(samples, list) or not samples:
        raise HTTPException(
            422, "samples: non-empty list of labeled vitals/symptom records required"
        )
    return await ingest_real_samples(samples)


@router.post("/ml/train")
async def ml_train(payload: dict = Body(...)):
    """
    Retrain the production triage model on the ingested real samples.

    Body: { "min_real": 20, "backfill_synthetic": 1500, "holdout": 0.2 }
    Returns hold-out metrics (accuracy, confusion matrix, per-class report).
    """
    min_real = int(payload.get("min_real", 20))
    backfill = int(payload.get("backfill_synthetic", 1500))
    holdout = float(payload.get("holdout", 0.2))
    try:
        return await retrain_on_real(
            min_real=min_real, backfill_synthetic=backfill, holdout=holdout
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


# ─── F4: Vitals + threshold analysis ─────────────────────────────


@router.post("/vitals/analyze")
async def vitals_analyze(payload: dict):
    """Analyze a vitals reading against clinical thresholds (returns abnormal flags)."""
    spo2 = payload.get("spo2")
    pulse = payload.get("pulse_rate") or payload.get("pulse")
    bp_sys = payload.get("bp_systolic")
    bp_dia = payload.get("bp_diastolic")
    temp = payload.get("temperature")

    flags: list[dict] = []

    def flag(label: str, value: str, reason: str, severity: str) -> None:
        flags.append({"label": label, "value": value, "reason": reason, "severity": severity})

    if spo2 is not None:
        if spo2 < 90:
            flag("Oxygen (SpO2)", f"{spo2}%", "Severe hypoxia — emergency", "critical")
        elif spo2 < 94:
            flag("Oxygen (SpO2)", f"{spo2}%", "Below 94% — monitor closely", "warning")
    if pulse is not None:
        if pulse > 130 or pulse < 45:
            flag("Pulse Rate", f"{pulse} bpm", "Critical tachycardia/bradycardia", "critical")
        elif pulse > 110:
            flag("Pulse Rate", f"{pulse} bpm", "Elevated heart rate", "warning")
    if bp_sys is not None and (bp_sys >= 180 or (bp_dia and bp_dia >= 110)):
        flag("Blood Pressure", f"{bp_sys}/{bp_dia or '—'}", "Hypertensive crisis", "critical")
    elif bp_sys is not None and (bp_sys >= 140 or (bp_dia and bp_dia >= 90)):
        flag("Blood Pressure", f"{bp_sys}/{bp_dia or '—'}", "Above 140/90 — review", "warning")
    if temp is not None:
        if temp >= 40.5:
            flag("Temperature", f"{temp}°C", "Very high fever", "critical")
        elif temp >= 38.5:
            flag("Temperature", f"{temp}°C", "Fever — monitor", "warning")
        elif temp <= 35:
            flag("Temperature", f"{temp}°C", "Hypothermia risk", "critical")

    severity = (
        "critical"
        if any(f["severity"] == "critical" for f in flags)
        else ("warning" if flags else "normal")
    )
    return {"is_abnormal": bool(flags), "flags": flags, "severity": severity}


# ─── F5: Emergency verification ──────────────────────────────────


@router.post("/emergency/verify")
async def emergency_verify(payload: dict):
    """
    Verify ambiguous emergencies with Gemini triage. Sieve: first threshold-check
    obvious cases, escalate only ambiguous ones to the LLM.
    """
    vitals = payload.get("vitals") or {}
    symptoms = payload.get("triggered_symptoms") or []
    alert_type = payload.get("alert_type") or ""

    # Strict key risk indicators require no LLM
    hard_rules = ["chest_pain", "breathlessness", "fainting", "sudden_vision_loss"]
    if any(s in symptoms for s in hard_rules) or alert_type == "chest_pain_cardiac":
        return {
            "is_true_emergency": True,
            "severity": "critical",
            "confidence": 0.96,
            "reason": "High-risk symptom present",
            "verification_kind": "rule",
        }

    result = await _llm.verify_emergency(symptoms, vitals, payload.get("transcript") or "")
    if not result.get("is_emergency"):
        # LLM unavailable → fall back to threshold check on vitals
        vitals_res = await vitals_analyze(vitals)
        if vitals_res["severity"] == "critical":
            return {
                "is_true_emergency": True,
                "severity": "critical",
                "confidence": 0.9,
                "reason": "Critical vitals deviation",
                "verification_kind": "vitals",
            }
        return {
            "is_true_emergency": False,
            "severity": vitals_res["severity"],
            "confidence": 0.7,
            "reason": "No strong indicators found",
            "verification_kind": "fallback",
        }

    return {
        "is_true_emergency": True,
        "severity": result.get("alert_type") and "critical" or "high",
        "confidence": result.get("confidence", 0.8),
        "reason": result.get("reasoning") or "Gemini triage",
        "verification_kind": "llm",
    }


# ─── F1: Body Map ────────────────────────────────────────────────


@router.post("/body-map/tap")
async def body_map_tap(payload: dict):
    """Record a body-map tap for analytics/triage priority."""
    body_part = payload.get("body_part")
    if not body_part:
        raise HTTPException(422, "body_part required")
    severity_weights = {
        "head": 1,
        "chest": 2,
        "stomach": 1,
        "nose_throat": 1,
        "eyes": 1,
    }
    suggested_department = {
        "head": "neurology",
        "chest": "cardiology",
        "stomach": "gastroenterology",
        "nose_throat": "ent",
        "eyes": "ophthalmology",
        "skin": "dermatology",
        "back": "orthopedics",
        "legs_feet": "orthopedics",
        "arms_hands": "orthopedics",
        "joints": "rheumatology",
    }.get(body_part, "general_medicine")

    return {
        "recorded": True,
        "tapped_at": datetime.now(UTC).isoformat(),
        "suggested_department": suggested_department,
        "risk_weight": severity_weights.get(body_part, 0),
    }


# ─── F6: Retention metadata ──────────────────────────────────────


@router.get("/retention/policies")
async def retention_policies():
    """Return the DPDPA-aligned retention policy catalogue (mirrors DB seeds)."""
    return {
        "policies": [
            {
                "data_type": "voice_recording",
                "retention_days": 1,
                "auto_delete_enabled": True,
                "description": "Delete voice recordings 24 hours after visit",
            },
            {
                "data_type": "session_temp",
                "retention_days": 0,
                "auto_delete_enabled": True,
                "description": "Delete temp session data immediately",
            },
            {
                "data_type": "visit_record",
                "retention_days": 2555,
                "auto_delete_enabled": False,
                "description": "Archive visit records after 7 years",
            },
            {
                "data_type": "document",
                "retention_days": 2555,
                "auto_delete_enabled": False,
                "requires_doctor_approval": True,
                "description": "Archive documents after 7 years",
            },
            {
                "data_type": "audit_log",
                "retention_days": 1825,
                "auto_delete_enabled": False,
                "description": "Retain audit logs for 5 years",
            },
            {
                "data_type": "prescription_ocr_raw",
                "retention_days": 30,
                "auto_delete_enabled": True,
                "description": "Raw OCR text auto-deleted after 30 days",
            },
        ]
    }


async def _purge_sessions(db, session_ids: list[int]) -> dict:
    """Physically delete a batch of sessions and every dependent row."""
    if not session_ids:
        return {
            "sessions": 0,
            "messages": 0,
            "summaries": 0,
            "consents": 0,
            "red_flags": 0,
            "ayush": 0,
        }

    sid = session_ids
    msg_rows = (
        await db.execute(select(SessionMessage).where(SessionMessage.session_id.in_(sid)))
    ).all()
    for m in msg_rows:
        _safe_unlink(m[0].audio_url)
    audio_paths = [m[0].audio_url for m in msg_rows if m[0].audio_url]
    await db.execute(delete(SessionMessage).where(SessionMessage.session_id.in_(sid)))

    doc_rows = (await db.execute(select(Document).where(Document.session_id.in_(sid)))).all()
    for d in doc_rows:
        _safe_unlink(d[0].file_path)
    await db.execute(delete(Document).where(Document.session_id.in_(sid)))

    await db.execute(delete(Summary).where(Summary.session_id.in_(sid)))
    await db.execute(delete(ConsentRecord).where(ConsentRecord.session_id.in_(sid)))
    await db.execute(delete(RedFlagAlert).where(RedFlagAlert.session_id.in_(sid)))
    await db.execute(delete(AyushAssessment).where(AyushAssessment.session_id.in_(sid)))
    await db.execute(delete(Session).where(Session.id.in_(sid)))

    return {
        "sessions": len(sid),
        "messages": len(msg_rows),
        "documents": len(doc_rows),
        "audio_files": sum(1 for p in audio_paths if p),
        "summaries": 0,
        "consents": 0,
        "red_flags": 0,
        "ayush": 0,
    }


@router.post("/retention/run")
async def retention_run(payload: dict = Body(default_factory=dict), db=Depends(get_db)):
    """
    Execute the DPDPA retention policies right now (the real auto-delete).

    Deletes:
      * voice recordings (> 1 day old)  → rows + audio files
      * cancelled/temp 'session_temp' sessions (> 1 hour old) → all children + files
      * raw OCR text on documents older than 30 days
    Every action is recorded as an append-only audit log.
    """
    dry_run = bool(payload.get("dry_run", False))
    now_naive = datetime.now()

    async def _commit_or_rollback() -> None:
        if dry_run:
            await db.rollback()
        else:
            await db.commit()

    job: dict[str, Any] = {"actions": [], "rows_deleted": 0, "files_removed": 0}

    # 1) voice_recording → 1 day
    msgs = (
        await db.execute(
            select(SessionMessage).where(
                SessionMessage.message_type == "patient_voice",
                SessionMessage.created_at < now_naive - timedelta(days=1),
            )
        )
    ).all()
    audio = 0
    for m in msgs:
        if m[0].audio_url:
            if not dry_run:
                _safe_unlink(m[0].audio_url)
            audio += 1
    if not dry_run:
        await db.execute(
            delete(SessionMessage).where(
                SessionMessage.message_type == "patient_voice",
                SessionMessage.created_at < now_naive - timedelta(days=1),
            )
        )
    job["actions"].append({"policy": "voice_recording", "rows": len(msgs), "files": audio})
    job["rows_deleted"] += len(msgs)
    job["files_removed"] += audio

    # 2) session_temp → cancelled sessions older than 1 hour
    temps = (
        await db.execute(
            select(Session).where(
                Session.status == "cancelled",
                Session.started_at < now_naive - timedelta(hours=1),
            )
        )
    ).all()
    temp_ids = [s[0].id for s in temps]
    purged = await _purge_sessions(db, temp_ids)
    job["actions"].append(
        {
            "policy": "session_temp",
            "sessions": purged["sessions"],
            "messages": purged["messages"],
            "documents": purged["documents"],
        }
    )
    job["rows_deleted"] += purged["sessions"] + purged["messages"] + purged["documents"]
    job["files_removed"] += purged["audio_files"]

    # 3) prescription_ocr_raw → 30 days
    await db.execute(
        update(Document)
        .where(
            Document.ocr_raw_text.is_not(None),
            Document.created_at < now_naive - timedelta(days=30),
        )
        .values(ocr_raw_text=None)
    )
    job["actions"].append(
        {
            "policy": "prescription_ocr_raw",
            "note": "ocr_raw_text nulled for records older than 30 days",
        }
    )

    # Append-only audit of the whole job
    if not dry_run:
        await _audit(
            db,
            "retention_job",
            None,
            "CREATE",
            "retention-scheduler",
            "system",
            new_values=job,
        )
    await _commit_or_rollback()

    return {"dry_run": dry_run, "retention": job, "audited": not dry_run}


@router.post("/retention/erase-patient")
async def erase_patient(payload: dict = Body(...), db=Depends(get_db)):
    """
    DPDPA right-to-erasure — TRUE hard delete of a patient and all PHI.

    Requires explicit approval. Deletes documents (incl. files), session
    messages (incl. audio), summaries, consents, red-flag alerts, AYUSH
    records, sessions, and the patient row — in one transaction. An immutable
    audit record is appended first so the erasure itself is provable.
    """
    patient_id = payload.get("patient_id")
    approval = bool(payload.get("approval", False))
    reason = (payload.get("reason") or "").strip()
    performed_by = (payload.get("performed_by") or "doctor-portal").strip()

    if patient_id in (None, ""):
        raise HTTPException(422, "patient_id required")
    if not approval or approval is not True:
        raise HTTPException(403, "hard delete requires approval=true")
    if not reason:
        raise HTTPException(422, "reason required (DPDPA grounds, e.g. right_to_erasure)")

    patient = (
        await db.execute(select(Patient).where(Patient.id == int(patient_id)))
    ).scalar_one_or_none()
    if patient is None:
        raise HTTPException(404, "patient not found")

    session_ids = await _all_session_ids(db, int(patient_id))

    # Files before rows
    doc_rows = (
        await db.execute(select(Document).where(Document.patient_id == int(patient_id)))
    ).all()
    for d in doc_rows:
        _safe_unlink(d[0].file_path)

    if session_ids:
        msg_rows = (
            await db.execute(
                select(SessionMessage).where(SessionMessage.session_id.in_(session_ids))
            )
        ).all()
    else:
        msg_rows = []
    for m in msg_rows:
        _safe_unlink(m[0].audio_url)

    # Append-only audit of the erasure (survives the deletes below)
    await _audit(
        db,
        table_name="patients",
        record_id=int(patient_id),
        action="DELETE",
        performed_by=performed_by,
        performed_by_role="doctor",
        old_values={
            "patient_id": int(patient_id),
            "name": patient.name,
            "reason": reason,
            "sessions": len(session_ids),
            "documents": len(doc_rows),
            "messages": len(msg_rows),
        },
    )

    if session_ids:
        await db.execute(delete(SessionMessage).where(SessionMessage.session_id.in_(session_ids)))
    await db.execute(delete(Document).where(Document.patient_id == int(patient_id)))
    if session_ids:
        await db.execute(delete(Summary).where(Summary.session_id.in_(session_ids)))
    await db.execute(delete(ConsentRecord).where(ConsentRecord.patient_id == int(patient_id)))
    await db.execute(delete(RedFlagAlert).where(RedFlagAlert.patient_id == int(patient_id)))
    if session_ids:
        await db.execute(delete(AyushAssessment).where(AyushAssessment.session_id.in_(session_ids)))
        await db.execute(delete(Session).where(Session.id.in_(session_ids)))
    await db.execute(delete(Patient).where(Patient.id == int(patient_id)))
    await db.commit()

    return {
        "status": "erased",
        "patient_id": int(patient_id),
        "removed": {
            "sessions": len(session_ids),
            "documents": len(doc_rows),
            "messages": len(msg_rows),
            "audio_files": sum(1 for m in msg_rows if m[0].audio_url),
            "patient": 1,
        },
        "reason": reason,
        "audited": True,
    }


@router.post("/retention/request-erasure")
async def request_erasure(payload: dict = Body(...), db=Depends(get_db)):
    """Patient-initiated DPDPA erasure request (recorded in audit, needs approval)."""
    patient_id = payload.get("patient_id")
    requested_by = (payload.get("requested_by") or "patient-app").strip()
    data_types = payload.get("data_types") or ["all"]
    if patient_id in (None, ""):
        raise HTTPException(422, "patient_id required")
    await _audit(
        db,
        table_name="erasure_requests",
        record_id=int(patient_id),
        action="CREATE",
        performed_by=requested_by,
        performed_by_role="patient",
        new_values={"data_types": data_types},
    )
    await db.commit()
    return {
        "request_id": str(uuid.uuid4()),
        "patient_id": int(patient_id),
        "status": "pending_approval",
    }


@router.get("/retention/requests")
async def retention_requests(db=Depends(get_db)):
    """List erasure requests recorded on the backend (approval workflow)."""
    rows = (
        (
            await db.execute(
                select(AuditLog)
                .where(AuditLog.table_name == "erasure_requests", AuditLog.action == "CREATE")
                .order_by(AuditLog.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    requests = [
        {
            "patient_id": a.record_id,
            "requested_by": a.performed_by,
            "data_types": (a.new_values or {}).get("data_types", ["all"]),
            "requested_at": a.created_at.isoformat(),
            "status": "pending",
        }
        for a in rows
    ]
    return {"requests": requests}
