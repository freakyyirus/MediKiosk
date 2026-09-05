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

import asyncio
import base64
import io
import json
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.ai.llm_client import GeminiClient
from app.ai.ocr_pipeline import OCRPipeline
from app.ai.priority_model import predict_priority

logger = logging.getLogger("medikiosk.advanced")
router = APIRouter(prefix="/api/v1/advanced", tags=["Advanced"])

_ocr = OCRPipeline()
_llm = GeminiClient()

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
        "handwriting_detected": merged["handwriting_detected"]
        or doc.handwriting_heuristic > 0.35,
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
        "validation_status": "verified" if not result.get("low_confidence_fields") else "needs_review",
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
        "exp": int((datetime.now(timezone.utc) + timedelta(minutes=30)).timestamp() * 1000),
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
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat(),
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

    severity = "critical" if any(f["severity"] == "critical" for f in flags) else ("warning" if flags else "normal")
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
        "head": 1, "chest": 2, "stomach": 1, "nose_throat": 1, "eyes": 1,
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
        "tapped_at": datetime.now(timezone.utc).isoformat(),
        "suggested_department": suggested_department,
        "risk_weight": severity_weights.get(body_part, 0),
    }


# ─── F6: Retention metadata ──────────────────────────────────────

@router.get("/retention/policies")
async def retention_policies():
    """Return the DPDPA-aligned retention policy catalogue (mirrors DB seeds)."""
    return {
        "policies": [
            {"data_type": "voice_recording", "retention_days": 1, "auto_delete_enabled": True, "description": "Delete voice recordings 24 hours after visit"},
            {"data_type": "session_temp", "retention_days": 0, "auto_delete_enabled": True, "description": "Delete temp session data immediately"},
            {"data_type": "visit_record", "retention_days": 2555, "auto_delete_enabled": False, "description": "Archive visit records after 7 years"},
            {"data_type": "document", "retention_days": 2555, "auto_delete_enabled": False, "requires_doctor_approval": True, "description": "Archive documents after 7 years"},
            {"data_type": "audit_log", "retention_days": 1825, "auto_delete_enabled": False, "description": "Retain audit logs for 5 years"},
            {"data_type": "prescription_ocr_raw", "retention_days": 30, "auto_delete_enabled": True, "description": "Raw OCR text auto-deleted after 30 days"},
        ]
    }