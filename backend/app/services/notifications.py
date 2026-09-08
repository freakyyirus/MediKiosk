"""
Best-effort notification delivery for kiosk bookings and non-partner outreach.

    * email      — stdlib smtplib + email.message when SMTP_* env vars are set
    * whatsapp   — HTTP POST to a configured provider webhook when set

Both functions NEVER raise: they log and return False so the kiosk flow is
never blocked by a delivery failure (demo keeps working offline).
"""

from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.config import get_settings

logger = logging.getLogger("medikiosk.notifications")
settings = get_settings()


def send_email(to: str, subject: str, body: str, html: str | None = None) -> bool:
    """Send a text (optionally HTML) email via SMTP. Best-effort, returns success."""
    if not settings.smtp_host or not settings.smtp_user or not to:
        logger.info("[email skipped] to=%s subject=%s body=%s", to, subject, body)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from
        msg["To"] = to
        msg.attach(MIMEText(body, "plain", "utf-8"))
        if html:
            msg.attach(MIMEText(html, "html", "utf-8"))

        if settings.smtp_use_tls:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587, timeout=20) as server:
                server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port or 465, timeout=20) as server:
                server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        logger.info("[email sent] to=%s subject=%s", to, subject)
        return True
    except Exception as exc:  # pragma: no cover - upstream mail is best-effort
        logger.warning("SMTP delivery failed (%s): %s", type(exc).__name__, exc)
        return False


def send_whatsapp(to_phone: str, message: str) -> bool:
    """Send a WhatsApp template/plain message via the configured provider. Best-effort."""
    if not settings.whatsapp_api_url or not to_phone:
        logger.info("[whatsapp skipped] to=%s message=%s", to_phone, message)
        return False
    try:
        headers = {"Content-Type": "application/json"}
        if settings.whatsapp_api_token:
            headers["Authorization"] = f"Bearer {settings.whatsapp_api_token}"
        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "text": {"preview_url": False, "body": message},
        }
        if settings.whatsapp_from_phone:
            payload["from"] = settings.whatsapp_from_phone
        resp = httpx.post(settings.whatsapp_api_url, json=payload, headers=headers, timeout=20)
        resp.raise_for_status()
        logger.info("[whatsapp sent] to=%s", to_phone)
        return True
    except Exception as exc:  # pragma: no cover - upstream provider is best-effort
        logger.warning("WhatsApp delivery failed (%s): %s", type(exc).__name__, exc)
        return False


def notify_booking_confirmation(*, patient: dict, hospital_name: str, date: str, time_slot: str, department: str, booking_id: str) -> dict:
    """Send the patient-facing OPD booking confirmation (email + WhatsApp)."""
    name = (patient.get("name") or "Patient").strip()
    phone = (patient.get("phone") or "").strip()
    email = (patient.get("email") or "").strip()

    subject = f"Your MediKiosk appointment is confirmed — {hospital_name}"
    body = (
        f"Hello {name},\n\n"
        f"Your {department} appointment at {hospital_name} is confirmed for {date} at {time_slot}.\n"
        f"Booking ID: {booking_id}\n\n"
        "Please carry a valid ID card when you visit.\n"
        "— MediKiosk"
    )
    html = (
        f"<h2>Appointment Confirmed</h2>"
        f"<p>Hello <b>{name}</b>,</p>"
        f"<p>Your <b>{department}</b> appointment at <b>{hospital_name}</b> "
        f"is confirmed for <b>{date}</b> at <b>{time_slot}</b>.</p>"
        f"<p>Booking ID: <code>{booking_id}</code></p>"
        f"<p>Please carry a valid ID card when you visit.</p><p>— MediKiosk</p>"
    )
    wa_message = (
        f"Hello {name}, your {department} appointment at {hospital_name} "
        f"is confirmed for {date} at {time_slot}. Booking ID: {booking_id}. "
        "Please carry a valid ID card. — MediKiosk"
    )

    email_sent = send_email(email, subject, body, html) if email else False
    wa_sent = False
    if phone:
        wa_sent = send_whatsapp(phone, wa_message)

    return {"email_sent": email_sent, "whatsapp_sent": wa_sent}
