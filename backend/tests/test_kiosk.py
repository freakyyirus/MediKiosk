"""
Kiosk flow tests (spec §9 — /api/v1/kiosk/* endpoints).

These tests drive the kiosk router directly (FastAPI TestClient) with keys
cleared so Gemini/Bhashini/Supabase/Places are all in degraded mode. The flow
order — start → language → patient → body part → interview → summary → booking
— is enforced server-side.
"""

import pytest
from fastapi.testclient import TestClient

from app.data.kiosk_data import (
    DEMO_PARTNER_HOSPITALS,
    MAX_INTERVIEW_QUESTIONS,
    OPD_TIME_SLOTS,
    SUPPORTED_LANGUAGES,
)
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _no_keys(monkeypatch):
    """Wipe credentials so tests never hit live services (and get mocks)."""
    import app.ai.asr_client as asr_mod
    import app.ai.llm_client as llm_mod
    import app.ai.translation_client as tsl_mod
    import app.ai.tts_client as tts_mod
    import app.routers.kiosk as kiosk_mod
    import app.services.notifications as notif_mod

    for mod in (asr_mod, tts_mod, llm_mod, tsl_mod):
        try:
            monkeypatch.setattr(mod.settings, "bhashini_ulca_api_key", "")
            monkeypatch.setattr(mod.settings, "bhashini_api_key", "")
        except AttributeError:
            pass
    monkeypatch.setattr(tsl_mod.settings, "bhashini_api_key", "")
    monkeypatch.setattr(tsl_mod.settings, "bhashini_ulca_api_key", "")
    monkeypatch.setattr(llm_mod.settings, "gemini_api_key", "")
    monkeypatch.setattr(kiosk_mod.settings, "google_places_api_key", "")
    monkeypatch.setattr(kiosk_mod.settings, "smtp_host", "")
    monkeypatch.setattr(kiosk_mod.settings, "whatsapp_api_url", "")
    monkeypatch.setattr(notif_mod.settings, "smtp_host", "")
    monkeypatch.setattr(notif_mod.settings, "whatsapp_api_url", "")

    # The router builds its Gemini client at import (with the real key). Stub it
    # to degraded mode so the interview uses the deterministic question bank.
    class _OfflineLLM:
        available = False

        async def verify_emergency(self, *a, **k):
            return {"is_emergency": False, "confidence": 0.0, "reasoning": "offline"}

    monkeypatch.setattr(kiosk_mod, "_llm", _OfflineLLM())
    monkeypatch.setattr(kiosk_mod, "_asr", type("ASR", (), {"available": False})())
    monkeypatch.setattr(kiosk_mod, "_tts", type("TTS", (), {"available": False})())


def _start_session(language: str = "en") -> str:
    return client.post("/api/v1/kiosk/start-session", json={"language": language}).json()["session_id"]


def _full_patient(session_id: str) -> None:
    r = client.post(
        "/api/v1/kiosk/patient-details",
        json={
            "session_id": session_id,
            "name": "Anand Sharma",
            "age": 34,
            "gender": "male",
            "phone": "+919876543210",
        },
    )
    assert r.status_code == 200, r.text


# ---- start-session / select-language ----

def test_start_session_defaults_to_english():
    sid = _start_session()
    assert sid


def test_all_13_languages_are_supported():
    assert {"en", "hi", "bn", "te", "mr", "ta", "gu", "kn", "ml", "pa", "or", "as", "ur"} == SUPPORTED_LANGUAGES


def test_select_language_rejects_unsupported():
    sid = _start_session()
    r = client.post("/api/v1/kiosk/select-language", json={"session_id": sid, "language": "xx"})
    assert r.status_code == 422


def test_every_language_can_be_locked():
    for lang in SUPPORTED_LANGUAGES:
        sid = _start_session()
        r = client.post("/api/v1/kiosk/select-language", json={"session_id": sid, "language": lang})
        assert r.status_code == 200, lang
        assert r.json()["language_locked"] is True


# ---- patient-details ----

def test_patient_details_invalid_phone_rejected():
    sid = _start_session()
    r = client.post(
        "/api/v1/kiosk/patient-details",
        json={"session_id": sid, "name": "A", "age": 30, "gender": "male", "phone": "12"},
    )
    assert r.status_code == 422


def test_patient_details_age_range_rejected():
    sid = _start_session()
    r = client.post(
        "/api/v1/kiosk/patient-details",
        json={"session_id": sid, "name": "A", "age": 121, "gender": "male", "phone": "+919876543210"},
    )
    assert r.status_code == 422


# ---- select-body-part gating ----

def test_body_part_required_before_interview():
    sid = _start_session()
    _full_patient(sid)
    r = client.post(
        "/api/v1/kiosk/ask-question",
        json={"session_id": sid, "question_id": "q0", "answer": "test"},
    )
    assert r.status_code == 400  # flow gate: anatomy first


def test_body_part_validation_rejects_unknown():
    sid = _start_session()
    _full_patient(sid)
    r = client.post("/api/v1/kiosk/select-body-part", json={"session_id": sid, "body_part": "neon"})
    assert r.status_code == 422


def test_select_body_part_maps_department():
    sid = _start_session()
    _full_patient(sid)
    r = client.post("/api/v1/kiosk/select-body-part", json={"session_id": sid, "body_part": "chest"})
    assert r.status_code == 200
    assert r.json()["department"] == "cardiology"


# ---- interview engine ----

def test_interview_asks_questions_and_completes():
    sid = _start_session()
    _full_patient(sid)
    client.post("/api/v1/kiosk/select-body-part", json={"session_id": sid, "body_part": "chest"})

    for i in range(MAX_INTERVIEW_QUESTIONS):
        r = client.post("/api/v1/kiosk/ask-question", json={"session_id": sid, "question_id": f"q{i}", "answer": "yes"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] in {"question", "summary", "continue"}, data
        qid = data["question_id"]
        s = client.post(
            "/api/v1/kiosk/submit-response",
            json={"session_id": sid, "question_id": qid, "answer": "no", "audio_confidence": 0.9, "audio_duration_s": 2.1},
        )
        assert s.status_code == 200, s.text
        if s.json()["status"] == "summary":
            break

    summary = client.post("/api/v1/kiosk/interview-summary", json={"session_id": sid, "question_id": "x", "answer": "yes"})
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["department"] == "cardiology"
    assert isinstance(body["red_flags"], list)


def test_emergency_flagged_for_cardiac_symptoms():
    sid = _start_session()
    _full_patient(sid)
    client.post("/api/v1/kiosk/select-body-part", json={"session_id": sid, "body_part": "chest"})

    r = client.post("/api/v1/kiosk/ask-question", json={"session_id": sid, "question_id": "q1", "answer": "yes"})
    qid = r.json()["question_id"]
    r = client.post(
        "/api/v1/kiosk/submit-response",
        json={"session_id": sid, "question_id": qid, "answer": "crushing pain radiating to my left arm and I am sweating", "audio_confidence": 0.95},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "emergency"
    assert r.json()["emergency"] is True
    assert r.json()["emergency_message"]


# ---- nearby hospitals + booking ----

def test_nearby_hospitals_returns_bangalore_demo_data():
    r = client.get("/api/v1/kiosk/nearby-hospitals", params={"lat": 12.9716, "lon": 77.5946})
    assert r.status_code == 200
    data = r.json()
    assert len(data["partners"]) == len(DEMO_PARTNER_HOSPITALS)
    assert all(h["is_partner"] for h in data["partners"])
    assert any(not h["is_partner"] for h in data["non_partners"])
    assert all("distance_km" in h for h in data["all"])


def test_book_opd_creates_confirmation():
    sid = _start_session()
    _full_patient(sid)
    hospital = DEMO_PARTNER_HOSPITALS[0]
    r = client.post(
        "/api/v1/kiosk/book-opd",
        json={
            "session_id": sid,
            "hospital_id": hospital["id"],
            "department": "Cardiology",
            "date": "2026-09-10",
            "time_slot": OPD_TIME_SLOTS[0],
            "is_partner": True,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "confirmed"
    assert body["booking_id"].startswith("OPD-")
    assert body["hospital"]["id"] == hospital["id"]


def test_book_opd_rejects_bad_time_slot():
    sid = _start_session()
    _full_patient(sid)
    hospital = DEMO_PARTNER_HOSPITALS[0]
    r = client.post(
        "/api/v1/kiosk/book-opd",
        json={
            "session_id": sid,
            "hospital_id": hospital["id"],
            "department": "Cardiology",
            "date": "2026-09-10",
            "time_slot": "13:15",
            "is_partner": True,
        },
    )
    assert r.status_code == 422


def test_external_booking_requires_consent():
    sid = _start_session()
    _full_patient(sid)
    r = client.post(
        "/api/v1/kiosk/external-booking-request",
        json={
            "session_id": sid,
            "hospital_id": "NP-APOLLO",
            "hospital_name": "Apollo Hospitals",
            "department": "Cardiology",
            "date": "2026-09-10",
            "time_slot": "10:00",
            "consent_given": False,
        },
    )
    assert r.status_code == 400


def test_external_booking_success_with_consent():
    sid = _start_session()
    _full_patient(sid)
    r = client.post(
        "/api/v1/kiosk/external-booking-request",
        json={
            "session_id": sid,
            "hospital_id": "NP-APOLLO",
            "hospital_name": "Apollo Hospitals",
            "department": "Cardiology",
            "date": "2026-09-10",
            "time_slot": "10:00",
            "consent_given": True,
        },
    )
    assert r.status_code == 200
    assert r.json()["status"] == "pending"
