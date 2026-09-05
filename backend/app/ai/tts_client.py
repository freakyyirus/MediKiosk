"""
Bhashini TTS (Text-to-Speech) Client.

Calls the Dhruva compute endpoint for inference to generate speech from text.
"""

import base64
import logging
import httpx

from app.config import get_settings

logger = logging.getLogger("medikiosk.ai.tts")
settings = get_settings()

TTS_COMPUTE_URL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

_TTS_SERVICE_IDS = {
    "hi": "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
    "ta": "ai4bharat/indic-tts-coqui-dravidian-gpu--t4",
    "te": "ai4bharat/indic-tts-coqui-dravidian-gpu--t4",
    "kn": "ai4bharat/indic-tts-coqui-dravidian-gpu--t4",
    "ml": "ai4bharat/indic-tts-coqui-dravidian-gpu--t4",
    "bn": "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
    "mr": "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
    "gu": "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
    "en": "ai4bharat/indic-tts-coqui-misc-gpu--t4",
}

class BhashiniTTS:
    def __init__(self):
        self.auth_key = settings.bhashini_ulca_api_key or settings.bhashini_api_key

    async def synthesize(self, text: str, target_lang: str, gender: str = "female") -> str:
        """
        Synthesize text to speech using Bhashini live API.
        Returns base64 encoded audio string. Returns empty string if failed.
        """
        if not self.auth_key:
            logger.warning("Bhashini TTS credentials missing.")
            return ""

        service_id = _TTS_SERVICE_IDS.get(target_lang, "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4")

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {"sourceLanguage": target_lang},
                        "serviceId": service_id,
                        "gender": gender
                    }
                }
            ],
            "inputData": {
                "input": [{"source": text}]
            }
        }

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    TTS_COMPUTE_URL,
                    headers={"Authorization": self.auth_key, "Content-Type": "application/json"},
                    json=payload
                )
                resp.raise_for_status()
                data = resp.json()
                
                pipeline = data.get("pipelineResponse", [])
                if pipeline and len(pipeline) > 0:
                    audio_list = pipeline[0].get("audio", [])
                    if audio_list and len(audio_list) > 0:
                        audio_content = audio_list[0].get("audioContent", "")
                        return audio_content
        except Exception as exc:
            logger.error("Bhashini TTS failed (%s): %s", type(exc).__name__, exc)

        return ""
