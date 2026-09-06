"""
Gemini-powered Conversational Concierge.

Conducts the kiosk clinical interview as a live two-way conversation:

    AI asks (in the patient's language) -> patient speaks/types ->
    Gemini interprets + decides follow-up -> kiosk speaks it -> loop.

Each turn returns a structured payload:

    {
        "speech": str,                 # what the kiosk should SAY (patient language)
        "interview_complete": bool,    # True once enough history is captured
        "topic": str,                  # current interview topic
        "red_flags": list[str],        # red flags detected this turn
        "clinical": dict | None,       # structured HPI summary (when complete)
    }

When Gemini is not configured the concierge falls back to a deterministic,
rule-based interview so the kiosk never dead-ends.
"""

import json
import logging

from app.ai.llm_client import GeminiClient

logger = logging.getLogger("medikiosk.ai.concierge")

# Topics the AI must cover (emphasised in the prompt; used by the fallback).
TOPICS = [
    "chief_complaint",
    "onset",
    "site",
    "character",
    "severity",
    "timing",
    "past_medical_history",
    "medications",
    "allergies",
    "review_of_systems",
]

SYSTEM_PROMPT = """You are "MediKiosk", a friendly, multilingual triage assistant inside a
hospital kiosk in India. Patients can be elderly, anxious, or low-literacy and may
not read or type — they speak in their own language.

STRICT LANGUAGE RULE: The patient's language code is {language}. If it is "en",
reply in plain English ONLY — never Hindi or any other script. If it is "hi",
reply in Hindi (Devanagari) ONLY. If it is "bn"/"ta"/"te"/"mr"/"gu"/"kn"/"ml"/"pa"/"or"/"as",
reply in that language's script. Match the code exactly. A wrong-script reply is a hard failure.

OTHER RULES:
1. Ask exactly ONE short, simple question at a time. Use everyday words, not jargon.
2. Work through topics in this order: {topics}. Only move to the next topic once the
   current one is answered well enough. Follow up briefly (up to 2 questions per topic)
   if an answer is vague or a symptom sounds serious.
3. Triage red flags: severe/tight chest pain, breathlessness, dizziness/fainting,
   black stools, blood in vomit/stool/urine, high fever with neck stiffness,
   sudden one-sided weakness or slurred speech, severe headache, confusion,
   pregnancy + pain/bleeding, "very bad" sudden pain.
   Any time one appears, list it under red_flags and gently advise care.
4. When all topics are covered, set interview_complete true and move to goodbye.
5. Be warm and reassuring. Short sentences. Speak like a nurse, not a textbook.

Return ONLY valid JSON with exactly these keys:
- "speech": the question/statement to be spoken to the patient (in {language})
- "interview_complete": boolean
- "topic": current topic string
- "red_flags": array of strings (English labels), may be empty
- "clinical": null normally; when interview_complete is true, an object with
  chief_complaint (str), hpi (object: site, onset, character, severity, radiation,
  timing, associated_symptoms, aggravating_factors, relieving_factors),
  past_medical_history (list of str), current_medications (list of str),
  allergies (list of str), review_of_systems (object or list).
"""

# ── Fallback (no Gemini key): deterministic per-topic questions ──────────────

_FALLBACK_QUESTIONS: dict[str, dict[str, str]] = {
    "chief_complaint": {
        "hi": "आप अस्पताल आज किस समस्या के साथ आए हैं? मुझे बताइए।",
        "en": "What brings you to the hospital today? Tell me about your main problem.",
    },
    "onset": {
        "hi": "यह समस्या कब शुरू हुई थी?",
        "en": "When did this problem start?",
    },
    "site": {
        "hi": "दर्द या परेशानी कहाँ महसूस हो रही है?",
        "en": "Where exactly do you feel the pain or discomfort?",
    },
    "character": {
        "hi": "यह कैसा लगता है? जैसे तेज, जलन, भारी या धड़कता हुआ?",
        "en": "How would you describe the feeling? Sharp, dull, burning, or throbbing?",
    },
    "severity": {
        "hi": "दर्द कितना गंभीर है? 1 से 10 में कितना बताइए।",
        "en": "How severe is the pain on a scale of 1 to 10?",
    },
    "timing": {
        "hi": "दर्द हमेशा रहता है या आता-जाता रहता है?",
        "en": "Is the pain constant, or does it come and go?",
    },
    "past_medical_history": {
        "hi": "क्या आपको कोई पुरानी बीमारी है, जैसे मधुमेह, बीपी, दिल की बीमारी या अस्थमा?",
        "en": "Do you have any known diseases like diabetes, high blood pressure, heart disease, or asthma?",
    },
    "medications": {
        "hi": "क्या आप फिलहाल कोई दवाई ले रहे हैं? हाँ तो कौन-कौन सी?",
        "en": "Are you currently taking any medicines? If yes, which ones?",
    },
    "allergies": {
        "hi": "क्या आपको किसी दवाई या खाने से एलर्जी है?",
        "en": "Are you allergic to any medicines or food?",
    },
    "review_of_systems": {
        "hi": "क्या आपको साँस लेने में तकलीफ, बुखार, चक्कर या उल्टी जैसी कोई और परेशानी है?",
        "en": "Do you also have breathlessness, fever, dizziness, or vomiting?",
    },
}

_FALLBACK_CLINICAL_KEYS = [
    "chief_complaint",
    "onset",
    "site",
    "character",
    "severity",
    "timing",
    "past_medical_history",
    "medications",
    "allergies",
    "review_of_systems",
]


class GeminiConcierge:
    """Conversational triage interview driven by Gemini (or deterministic fallback)."""

    def __init__(self) -> None:
        self.llm = GeminiClient()

    @property
    def available(self) -> bool:
        return self.llm.available

    def _build_history_block(self, messages: list[dict]) -> str:
        """Render conversation history for the prompt."""
        if not messages:
            return "(no prior answers)"
        lines = []
        for m in messages:
            role = m.get("role", "patient")
            content = (m.get("content") or "").strip()
            if not content or content == "__START__":
                continue
            label = "AI" if role in ("assistant", "ai") else "Patient"
            lines.append(f"{label}: {content}")
        return "\n".join(lines) or "(no prior answers)"

    async def generate_turn(
        self,
        *,
        language: str,
        messages: list[dict],
        body_part: str | None = None,
        vitals: dict | None = None,
    ) -> dict:
        """Run one turn of the interview and return the structured reply."""
        history_block = self._build_history_block(messages)
        last = ""
        for m in reversed(messages):
            if (m.get("role") == "user" or m.get("role") == "patient") and (m.get("content") or "") not in ("", "__START__"):
                last = m["content"]
                break

        if self.available:
            system_instruction = SYSTEM_PROMPT.format(
                language=language,
                topics=", ".join(TOPICS),
            )
            history_block = self._build_history_block(messages)
            body_part_str = body_part or "none"
            vitals_str = json.dumps(vitals, ensure_ascii=False) if vitals else "none"
            prompt = (
                f"Kiosk background:\n- Body part touched: {body_part_str}\n"
                f"- Vitals (if any): {vitals_str}\n\n"
                f"Conversation history, oldest -> newest:\n{history_block}\n\n"
                f'The patient\'s latest message was: "{last or "(patient has not spoken yet)"}"'
            )
            try:
                data = await self.llm._generate_json(prompt, temperature=0.3, system_instruction=system_instruction)
                return self._normalize(data)
            except Exception as exc:  # noqa: BLE001 - fall back below
                logger.error("Gemini concierge turn failed, using fallback: %s", exc)

        return self._fallback_turn(language, messages)

    # ---- Deterministic fallback (no key) -----------------------------------

    def _fallback_turn(self, language: str, messages: list[dict]) -> dict:
        # Count patient answers; drive topic by how many topics have a reply.
        patient_count = sum(
            1 for m in messages if (m.get("role") in ("user", "patient") and (m.get("content") or "").strip() and (m.get("content") or "") != "__START__")
        )
        idx = min(patient_count, len(TOPICS) - 1)
        topic = TOPICS[idx] if patient_count < len(TOPICS) else "review_of_systems"
        is_done = patient_count >= len(TOPICS)

        if is_done:
            return {
                "speech": (
                    "धन्यवाद! आपकी जानकारी पूरी हो गई है। डॉक्टर आपसे जल्द मिलेंगे।"
                    if language == "hi"
                    else "Thank you! That's everything I need. The doctor will see you shortly."
                ),
                "interview_complete": True,
                "topic": "complete",
                "red_flags": [],
                "clinical": {
                    "chief_complaint": "",
                    "hpi": {},
                    "past_medical_history": [],
                    "current_medications": [],
                    "allergies": [],
                    "review_of_systems": {},
                },
            }

        q = _FALLBACK_QUESTIONS.get(topic, _FALLBACK_QUESTIONS["chief_complaint"])
        return {
            "speech": q.get(language, q.get("en", "Please tell me about your problem.")),
            "interview_complete": False,
            "topic": topic,
            "red_flags": [],
            "clinical": None,
        }

    def _normalize(self, data: dict) -> dict:
        """Guarantee the expected response shape regardless of model output."""
        try:
            speech = str(data.get("speech") or "").strip()
        except (TypeError, ValueError):
            speech = ""
        if not speech:
            speech = "Please tell me more about that."
        interview_complete = bool(data.get("interview_complete"))
        topic = str(data.get("topic") or "chief_complaint")
        red_flags = data.get("red_flags")
        if not isinstance(red_flags, list):
            red_flags = []
        red_flags = [str(f) for f in red_flags if str(f).strip()]
        clinical = data.get("clinical")
        if interview_complete and clinical is not None and not isinstance(clinical, dict):
            clinical = {"chief_complaint": str(clinical)}
        return {
            "speech": speech,
            "interview_complete": interview_complete,
            "topic": topic,
            "red_flags": red_flags,
            "clinical": clinical,
        }


_concierge: GeminiConcierge | None = None


def get_concierge() -> GeminiConcierge:
    """Return the shared concierge instance."""
    global _concierge
    if _concierge is None:
        _concierge = GeminiConcierge()
    return _concierge
