"""
Bhashini ASR (Automatic Speech Recognition) Client.

Direct Bhashini-Udyat / Dhruva inference flow (verified 2026):
  1. The Bhashini inference API key is sent as the `Authorization` header
     straight to the Dhruva compute endpoint
     ({DV_COMPUTE_URL}).
  2. Audio is base64-encoded into `inputData.audio[].audioContent` and the
     ASR `serviceId` is chosen per requested language.
  3. The transcript is read from `pipelineResponse[0].output[0].source`.

The old ULCA "discover -> callback" flow is intentionally not used because
the model-discovery endpoint 500s on the 2026 platform while direct compute
authenticates fine with the inference key.

If credentials are missing or the upstream call fails, we fall back to a mock
transcript so the kiosk demo never dead-ends.
"""

import base64
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger("medikiosk.ai.asr")
settings = get_settings()

# Bhashini compute endpoint (Dhruva inference pipeline).
ASR_COMPUTE_URL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

# Bhashini does not ship a dedicated ASR model for every Indian language.
# Instead it exposes two conformer multilingual models — one for the
# Indo-Aryan family (hi, bn, gu, mr, or, pa, as) and one for Dravidian
# (ta, te, kn, ml). English uses Whisper. Verified live: hi and en return
# 200 and transcribe.
_MULTILINGUAL_INDO_ARYAN = "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4"
_MULTILINGUAL_DRAVIDIAN = "ai4bharat/conformer-multilingual-dravidian-gpu--t4"
_ENGLISH_ASR = "ai4bharat/whisper-medium-en--gpu--t4"

# Language code (ULCA "sourceLanguage") -> trusted Bhashini ASR serviceId.
_ASR_SERVICE_IDS = {
    # English (Whisper)
    "en": _ENGLISH_ASR,
    # Indo-Aryan language family
    "hi": _MULTILINGUAL_INDO_ARYAN,
    "bn": _MULTILINGUAL_INDO_ARYAN,
    "gu": _MULTILINGUAL_INDO_ARYAN,
    "mr": _MULTILINGUAL_INDO_ARYAN,
    "or": _MULTILINGUAL_INDO_ARYAN,
    "pa": _MULTILINGUAL_INDO_ARYAN,
    "as": _MULTILINGUAL_INDO_ARYAN,
    # Dravidian language family
    "ta": _MULTILINGUAL_DRAVIDIAN,
    "te": _MULTILINGUAL_DRAVIDIAN,
    "kn": _MULTILINGUAL_DRAVIDIAN,
    "ml": _MULTILINGUAL_DRAVIDIAN,
}


def resolve_asr_service_id(language_code: str) -> tuple[str, str]:
    """
    Return the (service_id, language_code_to_send) for a language.

    When no dedicated model exists, we fall back to the multilingual conformer
    model — never to Hindi. The multilingual models still expect a valid
    sourceLanguage in the config, so we keep the patient's own language code
    and only swap the serviceId.
    """
    service_id = _ASR_SERVICE_IDS.get(language_code)
    if service_id:
        return service_id, language_code
    logger.warning("No dedicated Bhashini ASR model for '%s'; using multilingual model.", language_code)
    return _MULTILINGUAL_INDO_ARYAN, language_code


_MOCK_TRANSCRIPT = "This is a mock transcription of the patient's symptoms."


class BhashiniASR:
    """Client for the Bhashini direct-inference ASR API."""

    def __init__(self):
        self.auth_key = settings.bhashini_ulca_api_key or settings.bhashini_api_key

    def _mock(self, fallback: bool = True) -> tuple[str, float]:
        if fallback:
            logger.warning("Bhashini credentials missing — returning mock transcription.")
        return _MOCK_TRANSCRIPT, 0.95

    @staticmethod
    def _parse_transcript(data: dict) -> tuple[str, float]:
        """Walk known response shapes for transcript + confidence."""
        conf = 1.0
        transcript = ""
        p = data.get("pipelineResponse")
        if isinstance(p, list) and p and isinstance(p[0], dict):
            out = p[0].get("output")
            if isinstance(out, list) and out and isinstance(out[0], dict):
                src = out[0].get("source")
                if isinstance(src, list) and src:
                    transcript = str(src[0]).strip()
                elif isinstance(src, str):
                    transcript = src.strip()

        if not transcript:
            # legacy top-level shapes
            aud = data.get("audio")
            if isinstance(aud, list) and aud and isinstance(aud[0], dict):
                transcript = str(aud[0].get("transcript") or "").strip()
                try:
                    conf = float(aud[0].get("confidence") or conf)
                except (TypeError, ValueError):
                    pass
        return transcript, conf

    async def transcribe_audio(self, audio_bytes: bytes, source_lang: str) -> tuple[str, float]:
        """
        Transcribe audio using Bhashini's live ASR pipeline.

        Falls back to a mock transcript when credentials are absent or the
        upstream service is unreachable, so the demo still flows.
        """
        if not self.auth_key:
            return self._mock()

        service_id, resolve_lang = resolve_asr_service_id(source_lang)

        encoded = base64.b64encode(audio_bytes).decode("ascii")
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {"sourceLanguage": resolve_lang},
                        "serviceId": service_id,
                        "audioFormat": "wav",
                        "samplingRate": 16000,
                    },
                }
            ],
            "inputData": {"audio": [{"audioContent": encoded}]},
        }
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    ASR_COMPUTE_URL,
                    headers={"Authorization": self.auth_key, "Content-Type": "application/json"},
                    json=payload,
                )
                resp.raise_for_status()
                transcript, confidence = self._parse_transcript(resp.json())
                if transcript:
                    logger.info("Bhashini ASR (%.3f): %s", confidence, transcript)
                    return transcript, min(confidence, 1.0)
        except Exception as exc:
            logger.error("Bhashini ASR failed (%s): %s", type(exc).__name__, exc)

        logger.warning("Bhashini ASR returned no transcript; using mock.")
        return _MOCK_TRANSCRIPT, 0.9
