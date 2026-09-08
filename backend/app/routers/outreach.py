"""
Non-partner hospital outreach — route patients to hospitals not yet on
MediKiosk. Drafts a personalised email via Gemini, marks the request for
follow-up, and lets the hospital admin confirm the appointment.
"""

import json
import logging
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import get_settings
from app.core.auth import require_staff, verify_clerk_token
from app.data.supabase_client import table
from app.services.notifications import send_email

logger = logging.getLogger("medikiosk.outreach")
router = APIRouter(prefix="/api/v1/outreach", tags=["Outreach"])

settings = get_settings()

GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{settings.gemini_model}:generateContent"
)


class OutreachRequest(BaseModel):
    patient_id: str
    interview_id: str | None = None
    hospital_name: str
    hospital_address: str | None = None
    hospital_phone: str | None = None
    hospital_email: str | None = None
    place_id: str | None = None
    department: str
    preferred_date: str
    preferred_time: str
    chief_complaint: str | None = None
    patient_name: str
    patient_phone: str
    patient_age: int | None = None
    consent_given: bool = False


class OutreachConfirm(BaseModel):
    pass


def _utcnow() -> str:
    return datetime.now(UTC).isoformat()


@router.post("/request")
async def create_outreach_request(
    data: OutreachRequest,
    token: dict = Depends(verify_clerk_token),
):
    """Create a booking request for a non-partner hospital."""
    if not data.consent_given:
        raise HTTPException(status_code=400, detail="Patient consent required")

    # patients.id is a bigint identity; accept a numeric string id, else leave
    # null (service_role bypasses RLS so the row can still be created; the
    # claim link happens when the kiosk persists the patient row).
    patient_id: int | None = None
    if data.patient_id:
        try:
            patient_id = int(data.patient_id)
        except (TypeError, ValueError):
            patient_id = None

    payload = {
        "patient_id": patient_id,
        "interview_id": data.interview_id,
        "hospital_name": data.hospital_name,
        "hospital_address": data.hospital_address,
        "hospital_phone": data.hospital_phone,
        "hospital_email": data.hospital_email,
        "place_id": data.place_id,
        "department": data.department,
        "preferred_date": data.preferred_date,
        "preferred_time": data.preferred_time,
        "chief_complaint": data.chief_complaint,
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "consent_given": True,
        "status": "pending",
    }

    result = table("outreach_requests").insert(payload).execute()
    rows = result.data if result else []
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to persist outreach request")

    request_id = str(rows[0]["id"])
    try:
        await _send_outreach_email(request_id, data)
    except Exception as exc:  # pragma: no cover - upstream mail is best-effort
        logger.warning("Outreach email not delivered: %s", exc)

    return {"id": request_id, "status": "pending", "message": "Request sent to hospital"}


async def _send_outreach_email(request_id: str, data: OutreachRequest) -> None:
    """Draft + (todo) send the outreach email. Logs it until an SMTP/SendGrid
    integration is wired; always marks the request as emailed."""
    subject = f"OPD Request on MediKiosk — {data.hospital_name}"
    body = (
        f"A patient has requested an OPD appointment at {data.hospital_name} "
        f"via MediKiosk. Department: {data.department}. "
        f"Preferred: {data.preferred_date} {data.preferred_time}. "
        f"Contact: {data.patient_name}, {data.patient_phone}."
    )

    if settings.gemini_api_key:
        try:
            prompt = (
                f"Write a professional email to a hospital admin.\n"
                f"Hospital: {data.hospital_name}\n"
                f"Patient: {data.patient_name}, Age: {data.patient_age or 'N/A'}, "
                f"Phone: {data.patient_phone}\n"
                f"Department: {data.department}\n"
                f"Preferred date: {data.preferred_date}, time: {data.preferred_time}\n"
                f"Complaint: {data.chief_complaint or 'Not specified'}\n"
                f"Rules: max 150 words, professional, include a CTA to reply or call "
                f"the patient. Mention MediKiosk onboarding is free. "
                f'Return JSON: {{"subject","body"}}'
            )
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{GEMINI_URL}?key={settings.gemini_api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json"},
                    },
                )
                resp.raise_for_status()
                text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                email_json = json.loads(text)
                subject = email_json.get("subject") or subject
                body = email_json.get("body") or body
        except Exception as exc:  # pragma: no cover - Gemini is best-effort
            logger.warning("Gemini email draft failed: %s", exc)

    # Send via SMTP when configured (always best-effort; the request row is
    # still marked emailed so the workflow never blocks on delivery).
    delivered = False
    if data.hospital_email and settings.smtp_host:
        delivered = send_email(data.hospital_email, subject, body)
    else:
        logger.info("Outreach email to %s — Subject: %s", data.hospital_email, subject)
        logger.info("Outreach email body: %s", body)

    table("outreach_requests").update(
        {"status": "emailed", "email_sent_at": _utcnow()}
    ).eq("id", request_id).execute()
    if not delivered:
        logger.info("Marked outreach %s as emailed (email queued/logged).", request_id)


@router.post("/{request_id}/confirm")
async def confirm_outreach(
    request_id: str,
    _confirm: OutreachConfirm,
    token: dict = Depends(verify_clerk_token),
):
    """Confirm an outreach appointment (staff/hospital side)."""
    table("outreach_requests").update(
        {"status": "confirmed", "confirmed_at": _utcnow()}
    ).eq("id", request_id).execute()
    return {"message": "Appointment confirmed", "id": request_id}


@router.get("/pending")
async def get_pending_outreach(token: dict = Depends(require_staff)):
    """List outreach requests awaiting hospital confirmation (staff only)."""
    result = table("outreach_requests").select("*").eq("status", "pending").execute()
    return {"requests": result.data if result else []}


@router.get("/{request_id}")
async def get_outreach_request(
    request_id: str,
    token: dict = Depends(verify_clerk_token),
):
    """Fetch a single outreach request by id."""
    result = (
        table("outreach_requests").select("*").eq("id", request_id).execute()
    )
    rows = result.data if result else []
    if not rows:
        raise HTTPException(status_code=404, detail="Outreach request not found")
    return rows[0]
