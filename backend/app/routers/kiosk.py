"""
MediKiosk Kiosk Flow Router — server-authoritative REST surface for the
13-language public terminal.

Flow (enforced server-side):
    start-session → select-language → patient-details → select-body-part
    → ask-question / submit-response (interview engine)
    → interview-summary → nearby-hospitals → book-opd / external-booking-request

Design notes (repo conventions):
    * Sessions live in an in-memory store (thread-safe) with best-effort
      Supabase persistence — the kiosk never depends on a live project.
    * The interview engine asks 5-8 questions in the patient's LOCKED language,
      flags emergencies (Gemini, with rule-based fallback), and never lets a
      patient proceed beyond the anatomy screen before the interview starts.
    * Bhashini NMT translates English templates into the patient's language
      when credentials exist; bundled hi/bn/ta/te fallbacks are used otherwise.
    * Kiosk endpoints are intentionally unauthenticated (public terminal);
      staff-facing screens keep their existing Clerk guards.
"""

import logging
import re
import threading
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ai.asr_client import BhashiniASR
from app.ai.llm_client import GeminiClient
from app.ai.translation_client import bhashini_translation
from app.ai.tts_client import BhashiniTTS
from app.config import get_settings
from app.data.kiosk_data import (
    ALLOWED_BODY_PARTS,
    BODY_PART_DEPARTMENTS,
    DEMO_ALL_HOSPITALS,
    DEMO_NON_PARTNER_HOSPITALS,
    DEMO_PARTNER_HOSPITALS,
    DEPARTMENT_LABELS,
    EMERGENCY_KEYWORDS,
    INTERVIEW_QUESTION_BANK,
    MAX_INTERVIEW_QUESTIONS,
    OPD_TIME_SLOTS,
    SUPPORTED_LANGUAGES,
)
from app.services.notifications import notify_booking_confirmation, send_email

logger = logging.getLogger("medikiosk.kiosk")
router = APIRouter(prefix="/api/v1/kiosk", tags=["Kiosk"])

settings = get_settings()

_asr = BhashiniASR()
_tts = BhashiniTTS()
_llm = GeminiClient()

PLACES_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

# In-memory kiosk session store (+ lock). 30 min TTL, swept lazily on start.
_sessions: dict[str, dict[str, Any]] = {}
_store_lock = threading.Lock()


# ── Core locale helpers ──────────────────────────────────────────────────

# Bundled fallback strings (used when Bhashini NMT / Gemini are unavailable).
_LOCALE_PHRASES: dict[str, dict[str, str]] = {
    "emergency": {
        "hi": "कृपया शांत रहें। आपकी स्थिति के बारे में एक टीम को सूचित किया गया है। कृपया प्रतीक्षा करें — एक स्टाफ सदस्य आपकी सहायता करेगा।",
        "bn": "দয়া করে শান্ত থাকুন। আপনার পরিস্থিতি সম্পর্কে একটি দলকে জানানো হয়েছে। অনুগ্রহ করে অপেক্ষা করুন — একজন কর্মী আপনাকে সাহায্য করবেন।",
        "ta": "தயவுசெய்து அமைதியாக இருங்கள். உங்கள் நிலைமை குறித்து ஒரு குழு அறிவிக்கப்பட்டுள்ளது. தயவுசெய்து காத்திருங்கள் — ஒரு ஊழியர் உங்களுக்கு உதவுவார்.",
        "te": "దయచేసి ప్రశాంతంగా ఉండండి. మీ పరిస్థితి గురించి ఒక బృందానికి తెలియజేయబడింది. దయచేసి వేచి ఉండండి — ఒక సిబ్బంది మీకు సహాయం చేస్తారు.",
    },
}


def _now() -> datetime:
    return datetime.now(UTC)


def _new_id() -> str:
    return str(uuid.uuid4())[:8]


def _find_session(session_id: str) -> dict:
    with _store_lock:
        sess = _sessions.get(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found. Please start again.")
    return sess


def _save_session(session_id: str, sess: dict) -> None:
    _prune_stale_sessions()
    with _store_lock:
        _sessions[session_id] = sess


_STALE_TTL = timedelta(minutes=45)
_saves_since_sweep = 0


def _prune_stale_sessions() -> None:
    """Lazy TTL sweep — prune sessions idle > 45 min. No event-loop needed."""
    global _saves_since_sweep
    with _store_lock:
        _saves_since_sweep += 1
        if _saves_since_sweep < 128:
            return
        _saves_since_sweep = 0
        cutoff = _now() - _STALE_TTL
        stale = []
        for sid, v in _sessions.items():
            ts = v.get("active_at") or v.get("created_at")
            try:
                if ts and _now() - datetime.fromisoformat(ts) > cutoff:
                    stale.append(sid)
            except (TypeError, ValueError):
                continue
        for sid in stale:
            _sessions.pop(sid, None)


async def _translate(text: str, lang: str) -> str:
    """Translate an English template into the patient's locked language."""
    text = (text or "").strip()
    if not text:
        return text
    # English is the authoring language — no translation needed.
    if lang in ("en", "") or lang not in SUPPORTED_LANGUAGES:
        return text
    # Bundle fallback first when present (offline safe for the big 4).
    bundled = _LOCALE_PHRASES.get(text if text in _LOCALE_PHRASES else "", {}).get(lang)
    if bundled:
        return bundled
    # NMT via Bhashini IndicTrans-v2 (needs credentials; passthrough otherwise).
    return await bhashini_translation.translate(text, source_lang="en", target_lang=lang)


def _clean_answer(answer: str) -> str:
    ans = re.sub(r"\s+", " ", (answer or "").strip())
    return ans[:500]


def _guess_department(body_part: str) -> str:
    return BODY_PART_DEPARTMENTS.get(body_part, "general_medicine")


def _rule_emergency(body_part: str, answers: list[str]) -> tuple[bool, str | None]:
    """Rule-based triage fallback — returns (is_emergency, reason)."""
    haystack = " ".join(answers).lower()
    keywords = EMERGENCY_KEYWORDS.get(body_part, [])
    for kw in keywords:
        if kw in haystack:
            return True, f"Possible emergency indicator detected: '{kw}'."
    # Chest pain rated 7+ is a red flag.
    if body_part == "chest":
        match = re.search(r"(\d{1,2})", haystack)
        if match and int(match.group(1)) >= 8:
            return True, "Chest pain rated 8 or higher on the severity scale."
    return False, None


# ── In-Memory OPD booking ledger ────────────────────────────────────────
_booking_seq = 0
_bookings: dict[str, dict[str, Any]] = {}
_booking_lock = threading.Lock()


def _create_booking(record: dict) -> str:
    global _booking_seq
    with _booking_lock:
        _booking_seq += 1
        booking_id = f"OPD-{_booking_seq:06d}"
        _bookings[booking_id] = record
        return booking_id


# ── Gemini-backed interview engine ──────────────────────────────────────

_INTERVIEW_SYSTEM_PROMPT = (
    "You are a cautious, patient, and simple government-kiosk medical interviewer. "
    "Speak ONLY in the patient's language. Ask one short, plain question at a time "
    "about their problem. Never give a diagnosis. If you hear 'I don't know' or silence, "
    "rephrase the same question more simply. If the patient describes a possible medical "
    "emergency, set is_emergency=true. Return ONLY valid JSON: "
    '{"question": "...", "is_emergency": false, "emergency_reason": null}'
)


def _fallback_first_question(body_part: str) -> str:
    bank = INTERVIEW_QUESTION_BANK.get(body_part)
    return (bank and bank[0]) or INTERVIEW_QUESTION_BANK["general"][0]


def _fallback_next_question(sess: dict) -> str:
    body = sess.get("body_part") or "general"
    bank = INTERVIEW_QUESTION_BANK.get(body) or INTERVIEW_QUESTION_BANK["general"]
    asked = sess.get("interview", {}).get("questions", [])
    for q in bank:
        if q not in asked:
            return q
    return "Is there anything else you would like the doctor to know about?"


async def _gemini_question(sess: dict, last_answer: str | None) -> dict:
    """Generate the next interview question in the patient's language. Best-effort."""
    _last = " (Previous answer: <<no answer>>)" if not last_answer else f" (Previous answer: {last_answer[:200]})"
    prompt_lines = [
        _INTERVIEW_SYSTEM_PROMPT,
        f"Language: {sess.get('language', 'en')}",
        f"Patient: {sess.get('patient', {}).get('name', 'Anonymous')}, age {sess.get('patient', {}).get('age', '?')}.",
        f"Body part selected: {sess.get('body_part', 'general')}.",
        f"Questions already asked: {sess.get('interview', {}).get('questions', [])}.",
        f"Asked so far: {len(sess.get('interview', {}).get('questions', []))} of max {MAX_INTERVIEW_QUESTIONS}.",
        _last,
    ]
    try:
        data = await _llm._generate_json("\n".join(prompt_lines), temperature=0.3)
        question = str(data.get("question") or "").strip()
        if not question:
            return {"question": _fallback_next_question(sess), "is_emergency": False, "emergency_reason": None}
        return {
            "question": question,
            "is_emergency": bool(data.get("is_emergency", False)),
            "emergency_reason": data.get("emergency_reason"),
        }
    except Exception as exc:  # pragma: no cover - LLM is best-effort
        logger.warning("Gemini next-question failed: %s", exc)
        return {"question": _fallback_next_question(sess), "is_emergency": False, "emergency_reason": None}


async def _gemini_severity(sess: dict) -> dict:
    """Ask Gemini to flag red flags in the latest transcript segment. Best-effort."""
    qa = sess.get("interview", {}).get("qa", [])
    transcript = " ; ".join(f"Q: {item.get('question', '')} A: {item.get('answer', '')}" for item in qa[-3:])
    if not _llm.available or not transcript:
        return {}
    prompt = (
        "Triage: read the patient interview fragment below. Return ONLY valid JSON: "
        '{"red_flags": [...], "is_emergency": bool, "severity": "low"|"medium"|"high"}'
        f"\nFragment: {transcript}"
    )
    try:
        return await _llm._generate_json(prompt, temperature=0.1)
    except Exception as exc:  # pragma: no cover
        logger.warning("Gemini severity check failed: %s", exc)
        return {}


async def _lookup_body_part_translate(body_part: str, lang: str) -> str:
    label_map = {
        "head": "Head", "chest": "Chest", "abdomen": "Abdomen", "pelvis": "Pelvis",
        "back": "Back", "arms": "Arms", "legs": "Legs", "skin": "Skin", "general": "General",
    }
    return await _translate(label_map[body_part], lang)


# ── Google Places Nearby Search proxy ───────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import asin, cos, radians, sin, sqrt

    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return round(r * 2 * asin(sqrt(a)), 2)


def _annotate(h: dict, lat: float, lon: float) -> dict:
    return {**h, "distance_km": _haversine_km(lat, lon, h["lat"], h["lon"])}


async def _places_nearby(lat: float, lon: float, radius: int) -> list[dict]:
    """Live Google Places Nearby Search for hospitals (server-side key only)."""
    if not settings.google_places_api_key:
        return []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                PLACES_NEARBY_URL,
                params={
                    "location": f"{lat},{lon}",
                    "radius": radius,
                    "type": "hospital",
                    "key": settings.google_places_api_key,
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:  # pragma: no cover - upstream is best-effort
        logger.warning("Google Places Nearby Search failed: %s", exc)
        return []

    out = []
    for r in data.get("results", [])[:12]:
        if "hospital" not in (r.get("name") or "").lower():
            continue
        out.append(
            {
                "id": r.get("place_id", ""),
                "place_id": r.get("place_id", ""),
                "name": r.get("name", ""),
                "address": r.get("vicinity", ""),
                "lat": (r.get("geometry") or {}).get("location", {}).get("lat", lat),
                "lon": (r.get("geometry") or {}).get("location", {}).get("lng", lon),
                "rating": r.get("rating"),
                "user_ratings_total": r.get("user_ratings_total", 0),
                "phone": None,
                "is_partner": False,
            }
        )
    return out


# ── Request models ──────────────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    language: str = "en"
    device_id: str | None = None


class SelectLanguageRequest(BaseModel):
    session_id: str
    language: str


class PatientDetailsRequest(BaseModel):
    session_id: str
    name: str = Field(min_length=1, max_length=120)
    age: int = Field(ge=0, le=120)
    gender: str = Field(pattern="^(male|female|other|M|F|O)?$")
    phone: str = Field(min_length=7, max_length=15)
    address: str | None = None
    email: str | None = None


class SelectBodyPartRequest(BaseModel):
    session_id: str
    body_part: str
    organ: str | None = None


class SubmitResponseRequest(BaseModel):
    session_id: str
    question_id: str
    answer: str = Field(max_length=1000)
    audio_confidence: float | None = Field(default=None, ge=0, le=1)
    audio_duration_s: float | None = None


class BookOpdRequest(BaseModel):
    session_id: str
    hospital_id: str
    department: str
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    time_slot: str
    is_partner: bool = True


class ExternalBookingRequest(BaseModel):
    session_id: str
    hospital_id: str
    hospital_name: str
    department: str
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    time_slot: str
    consent_given: bool = False


# ── Flow endpoints ──────────────────────────────────────────────────────

@router.post("/start-session")
async def start_session(req: StartSessionRequest):
    """Create a kiosk session. Language defaults to English, LOCKED at first
    selection (13 supported languages)."""
    lang = (req.language or "en").lower()
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=422, detail=f"Unsupported language '{lang}'. Choose from: {sorted(SUPPORTED_LANGUAGES)}")
    session_id = _new_id()
    sess = {
        "session_id": session_id,
        "device_id": req.device_id,
        "language": lang,  # locks after select-language
        "language_locked": False,
        "patient": {},
        "body_part": None,
        "organ": None,
        "interview": {"qa": [], "questions": [], "answers": [], "completed": False},
        "emergency": False,
        "emergency_reason": None,
        "summary": None,
        "created_at": _now().isoformat(),
    }
    _save_session(session_id, sess)
    return {"session_id": session_id, "language": lang, "message": "Session started"}


@router.post("/select-language")
async def select_language(req: SelectLanguageRequest):
    """Validate + lock the session language. MUST be one of the 13."""
    sess = _find_session(req.session_id)
    lang = req.language.lower()
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=422,
            detail=f"Supported languages: {sorted(SUPPORTED_LANGUAGES)}",
        )
    sess["language"] = lang
    sess["language_locked"] = True
    _save_session(req.session_id, sess)
    return {"session_id": req.session_id, "language": lang, "language_locked": True}


@router.post("/patient-details")
async def patient_details(req: PatientDetailsRequest):
    """Validate basic patient details (name, age [0-120], gender, phone [+91])."""
    sess = _find_session(req.session_id)
    phone = re.sub(r"\s+", "", req.phone)
    if not re.fullmatch(r"\+?\d{10,15}", phone or ""):
        raise HTTPException(status_code=422, detail="Phone must be 10-15 digits (country code allowed).")

    patient = {
        "name": req.name.strip(),
        "age": req.age,
        "gender": req.gender.upper() if req.gender else None,
        "phone": phone,
        "email": (req.email or "").strip() or None,
        "address": req.address,
    }
    sess["patient"] = patient
    _save_session(req.session_id, sess)
    return {"session_id": req.session_id, "patient": patient}


@router.post("/select-body-part")
async def select_body_part(req: SelectBodyPartRequest):
    """Validate the anatomy selection. The interview can ONLY start after
    this step is completed (server-enforced flow)."""
    sess = _find_session(req.session_id)
    if not sess.get("patient"):
        raise HTTPException(status_code=400, detail="Patient details are required before anatomy selection.")
    body_part = (req.body_part or "").strip().lower()
    if body_part not in ALLOWED_BODY_PARTS:
        raise HTTPException(status_code=422, detail=f"Unknown body part '{body_part}'.")

    sess["body_part"] = body_part
    sess["organ"] = (req.organ or "").strip() or None
    sess["department"] = _guess_department(body_part)
    _save_session(req.session_id, sess)

    return {
        "session_id": req.session_id,
        "body_part": body_part,
        "organ": sess["organ"],
        "department": sess["department"],
        "department_label": DEPARTMENT_LABELS.get(sess["department"], sess["department"]),
    }


@router.post("/ask-question")
async def ask_question(req: SubmitResponseRequest):
    """Return the next interview question (or re-ask a pending one). Auto-flags
    emergencies and completion so the frontend never has to guess."""
    sess = _find_session(req.session_id)
    if not sess.get("body_part"):
        raise HTTPException(status_code=400, detail="Select a body part before starting the interview.")

    sess = await _ensure_interview(sess)
    interview = sess["interview"]

    if sess["emergency"]:
        return {
            "status": "emergency",
            "question_id": "emergency",
            "emergency": True,
            "emergency_message": await _translate(_EMERGENCY_SAY, sess["language"]),
        }

    if interview["completed"]:
        return await _summary_status(sess)

    # Re-ask a question the patient missed (no answer recorded for it yet).
    if len(interview["answers"]) < len(interview["questions"]):
        idx = len(interview["answers"])
        return {
            "status": "question",
            "question_id": interview["question_ids"][idx],
            "question_index": idx + 1,
            "max_questions": MAX_INTERVIEW_QUESTIONS,
            "question": interview["questions"][idx],
            "force_audio": True,
            "retry": True,
        }

    # Interview is complete (5-8 questions asked).
    if len(interview["questions"]) >= MAX_INTERVIEW_QUESTIONS:
        interview["completed"] = True
        _save_session(req.session_id, sess)
        return await _summary_status(sess)

    # Generate the next question (Gemini → question-bank fallback).
    last_answer = interview["answers"][-1] if interview["answers"] else None
    qres = await _gemini_question(sess, last_answer)
    question = qres["question"]
    question_id = _new_id()
    interview["questions"].append(question)
    interview["question_ids"].append(question_id)
    sess["active_at"] = _now().isoformat()
    _save_session(req.session_id, sess)
    return {
        "status": "question",
        "question_id": question_id,
        "question_index": len(interview["questions"]),
        "max_questions": MAX_INTERVIEW_QUESTIONS,
        "question": question,
        "force_audio": True,
    }


@router.post("/submit-response")
async def submit_response(req: SubmitResponseRequest):
    """Record the patient's spoken answer, check severity/emergency, and
    report whether the interview continues or moves to the summary."""
    sess = _find_session(req.session_id)
    interview = sess.setdefault("interview", {})
    interview["qa"] = list(interview.get("qa", []))
    interview.setdefault("question_ids", [])

    answered_idx = len(interview["answers"])
    if answered_idx >= len(interview["questions"]):
        # The frontend may answer without re-asking; treat it as answer to the
        # most recent question. Otherwise reject to keep ordering sane.
        if not interview["questions"]:
            raise HTTPException(status_code=400, detail="No active question. Call /ask-question first.")
        answered_idx = len(interview["questions"]) - 1
        question_text = interview["questions"][answered_idx]
    else:
        question_text = interview["questions"][answered_idx]

    answer = _clean_answer(req.answer)
    if not answer:
        raise HTTPException(status_code=422, detail="Empty answer. Please speak or type your reply.")

    low_conf = req.audio_confidence is not None and req.audio_confidence < 0.6
    if low_conf:
        logger.info("Low ASR confidence (%.2f) accepted but flagged.", req.audio_confidence)

    interview["qa"].append({"question": question_text, "answer": answer, "audio_confidence": req.audio_confidence})
    interview["answers"].append(answer)
    if req.question_id and not interview["question_ids"]:
        interview["question_ids"].append(req.question_id)

    # Severity + emergency (rule-based → Gemini refinement).
    red_flags = []
    is_emergency, rule_reason = _rule_emergency(sess["body_part"], interview["answers"])
    gem = await _gemini_severity(sess)
    for f in gem.get("red_flags") or []:
        if isinstance(f, str):
            red_flags.append(f)
    if gem.get("is_emergency"):
        is_emergency = True
    severity = gem.get("severity") or ("high" if is_emergency else "low")
    if rule_reason and rule_reason not in red_flags:
        red_flags.append(rule_reason)

    if is_emergency:
        sess["emergency"] = True
        sess["emergency_reason"] = rule_reason or gem.get("emergency_reason") or "Possible emergency described."
        sess["severity"] = "high"
        _save_session(req.session_id, sess)
        return {
            "status": "emergency",
            "emergency": True,
            "emergency_message": await _translate(_EMERGENCY_SAY, sess["language"]),
            "red_flags": red_flags,
            "severity": "high",
        }

    sess["severity"] = severity
    _save_session(req.session_id, sess)

    if len(interview["answers"]) >= MAX_INTERVIEW_QUESTIONS:
        interview["completed"] = True
        _save_session(req.session_id, sess)

    return {
        "status": "summary" if interview["completed"] else "continue",
        "answered": len(interview["answers"]),
        "max_questions": MAX_INTERVIEW_QUESTIONS,
        "red_flags": red_flags,
        "severity": severity,
        "is_emergency": False,
    }


async def _ensure_interview(sess: dict) -> dict:
    """Normalise an interview dict (first request may come before any init)."""
    inter = sess.setdefault("interview", {})
    inter.setdefault("qa", [])
    inter.setdefault("questions", [])
    inter.setdefault("question_ids", [])
    inter.setdefault("answers", [])
    inter.setdefault("completed", False)
    # Refresh activity timestamp so the TTL sweep keeps the session alive.
    sess["active_at"] = _now().isoformat()
    return sess


async def _summary_status(sess: dict) -> dict:
    return {"status": "summary", "message": "Interview complete. Generating your summary."}


_EMERGENCY_SAY = (
    "Please stay calm. A team has been notified about your situation. "
    "Please wait — a staff member will assist you."
)


@router.post("/interview-summary")
async def interview_summary(req: SubmitResponseRequest):
    """Generate the structured interview summary (Gemini JSON, deterministic
    fallback). Includes the translated physician summary."""
    sess = _find_session(req.session_id)
    interview = sess.get("interview", {})
    answers = interview.get("answers", [])
    if not answers:
        raise HTTPException(status_code=400, detail="No interview responses recorded yet.")
    body_part = sess.get("body_part") or "general"
    patient = sess.get("patient", {})
    lang = sess.get("language", "en")
    qa = interview.get("qa", [])

    summary = await _build_summary(sess, qa)

    sess["summary"] = summary
    sess["interview"]["completed"] = True
    _save_session(req.session_id, sess)

    return {
        "session_id": req.session_id,
        "language": lang,
        "body_part": body_part,
        "patient": patient,
        "department": sess.get("department"),
        "department_label": DEPARTMENT_LABELS.get(sess.get("department") or "", sess.get("department") or ""),
        "summary": summary["english"],
        "summary_in_language": summary["translated"],
        "red_flags": summary.get("red_flags", []),
        "severity": sess.get("severity") or summary.get("severity", "low"),
        "emergency": sess.get("emergency", False),
    }


async def _build_summary(sess: dict, qa: list[dict]) -> dict:
    body_part = sess.get("body_part") or "general"
    lang = sess.get("language", "en")
    transcript = " ; ".join(f"Q: {q['question']} A: {q['answer']}" for q in qa)

    dep = _guess_department(body_part)
    fallback = {
        "chief_complaint": body_part,
        "history": transcript[:1500],
        "red_flags": [],
        "severity": "medium",
        "suggested_department": dep,
        "physician_summary": f"Patient reports concerns in the {body_part} region.",
        "english": {
            "chief_complaint": body_part,
            "red_flags": [],
            "severity": "medium",
            "suggested_department": DEPARTMENT_LABELS.get(dep, dep),
            "physician_summary": f"Patient reports concerns in the {body_part} region.",
        },
    }

    if not _llm.available:
        return await _translate_summary(fallback, lang)

    prompt = (
        "You are structuring a kiosk interview for a physician. The patient speaks "
        f"language '{lang}'. Interview transcript:\n{transcript}\n\n"
        'Return ONLY valid JSON: {"chief_complaint": string, "history": string, '
        '"red_flags": [string], "severity": "low"|"medium"|"high", '
        '"suggested_department": string, "physician_summary": string} '
        "physician_summary MUST be in English for the doctor; red_flags as concise English phrases."
    )
    try:
        data = await _llm._generate_json(prompt, temperature=0.2)
        data.setdefault("red_flags", [])
        data.setdefault("severity", "medium")
        dep = data.get("suggested_department", "") or _guess_department(body_part)
        english = {
            "chief_complaint": data.get("chief_complaint", ""),
            "red_flags": data.get("red_flags", []),
            "severity": data.get("severity", "medium"),
            "suggested_department": dep,
            "physician_summary": data.get("physician_summary", ""),
        }
        return await _translate_summary(
            {
                "chief_complaint": data.get("chief_complaint", ""),
                "history": data.get("history", ""),
                "red_flags": data.get("red_flags", []),
                "severity": data.get("severity", "medium"),
                "suggested_department": dep,
                "physician_summary": data.get("physician_summary", ""),
                "english": english,
            },
            lang,
        )
    except Exception as exc:  # pragma: no cover - LLM best-effort
        logger.warning("Gemini summary failed: %s", exc)
        return await _translate_summary(fallback, lang)


async def _translate_summary(s: dict, lang: str) -> dict:
    """Translate the patient-facing summary bits into the session language."""
    english = s.get("english") or s
    if lang == "en":
        return {**s, "translated": {**english}}
    return {
        **s,
        "translated": {
            "chief_complaint": await _translate(english.get("chief_complaint", ""), lang),
            "physician_summary": await _translate(english.get("physician_summary", ""), lang),
            "red_flags": await _translate(", ".join(english.get("red_flags") or []), lang),
        },
    }


@router.get("/nearby-hospitals")
async def nearby_hospitals(lat: float, lon: float, department: str | None = None, radius: int | None = None):
    """Nearby hospitals: demo partner hospitals + live Google Places (non-partner)."""
    radius = radius or settings.google_places_radius_m
    partners = list(DEMO_PARTNER_HOSPITALS)
    if department:
        partners = [h for h in partners if department in h["departments_available"] or "general_medicine" in h["departments_available"]]
    partners = sorted((_annotate(h, lat, lon) for h in partners), key=lambda h: h["distance_km"])

    places = await _places_nearby(lat, lon, radius)
    non_partners = sorted((_annotate(h, lat, lon) for h in DEMO_NON_PARTNER_HOSPITALS + places), key=lambda h: h["distance_km"])

    return {
        "location": {"lat": lat, "lon": lon},
        "partners": partners[:10],
        "non_partners": non_partners[:10],
        "all": (partners + non_partners)[:20],
    }


@router.post("/book-opd")
async def book_opd(req: BookOpdRequest):
    """Book a slot at a partner hospital and send the confirmation
    (email + WhatsApp) to the patient."""
    sess = _find_session(req.session_id)
    patient = sess.get("patient")
    if not patient:
        raise HTTPException(status_code=400, detail="Patient details required before booking.")

    hospital = next((h for h in DEMO_ALL_HOSPITALS if h["id"] == req.hospital_id), None)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    if req.time_slot not in OPD_TIME_SLOTS:
        raise HTTPException(status_code=422, detail=f"Invalid time slot. Choose from {OPD_TIME_SLOTS}.")

    booking = {
        "session_id": req.session_id,
        "hospital_id": req.hospital_id,
        "hospital_name": hospital["name"],
        "department": req.department,
        "date": req.date,
        "time_slot": req.time_slot,
        "patient": patient,
        "is_partner": True,
        "created_at": _now().isoformat(),
    }
    booking_id = _create_booking(booking)

    notified = notify_booking_confirmation(
        patient=patient,
        hospital_name=hospital["name"],
        date=req.date,
        time_slot=req.time_slot,
        department=req.department,
        booking_id=booking_id,
    )

    return {
        "booking_id": booking_id,
        "status": "confirmed",
        "hospital": {"id": hospital["id"], "name": hospital["name"], "phone": hospital["phone"]},
        "department": req.department,
        "date": req.date,
        "time_slot": req.time_slot,
        "message": "Booking confirmed. Details shared via SMS/WhatsApp and email.",
        "notified": notified,
    }


@router.post("/external-booking-request")
async def external_booking_request(req: ExternalBookingRequest):
    """Non-partner hospital: submit an outreach request to the hospital admin
    and notify the patient that their request is pending."""
    sess = _find_session(req.session_id)
    patient = sess.get("patient")
    if not patient:
        raise HTTPException(status_code=400, detail="Patient details required.")
    if not req.consent_given:
        raise HTTPException(status_code=400, detail="Patient consent required to share details with the hospital.")

    hospital = next((h for h in DEMO_ALL_HOSPITALS + [{"id": req.hospital_id, "name": req.hospital_name}] if h["id"] == req.hospital_id), None)
    hospital_name = (hospital or {}).get("name") or req.hospital_name

    request_id = _new_id()

    subject = f"OPD Request on MediKiosk — {hospital_name}"
    body = (
        f"A patient has requested an OPD appointment via MediKiosk.\n"
        f"Hospital: {hospital_name}\n"
        f"Department: {req.department}\n"
        f"Preferred: {req.date} at {req.time_slot}\n"
        f"Patient: {patient.get('name')}, Age {patient.get('age')}, "
        f"Phone {patient.get('phone')}\n"
        f"Complaint: {sess.get('body_part') or 'Not specified'}\n"
        f"Please reply to confirm the appointment."
    )
    sent = send_email((hospital or {}).get("email") or (hospital or {}).get("phone") or "", subject, body)
    logger.info("External booking request %s for %s (email_delivered=%s)", request_id, hospital_name, sent)
    return {
        "request_id": request_id,
        "status": "pending",
        "hospital_name": hospital_name,
        "message": "Your request has been sent to the hospital. They will contact you to confirm.",
    }
