"""
Bhashini NMT (Neural Machine Translation) Client.

Uses the Bhashini IndicTrans-v2 model through the same direct Dhruva compute
endpoint as ASR/TTS. The translation task returns the translated text in
``pipelineResponse[0].output[0].target``.

Graceful degradation (repo convention — never dead-ends the kiosk):
    * no credentials  -> returns the source text unchanged (passthrough)
    * upstream failure -> returns the source text unchanged
"""

from __future__ import annotations

import logging

import httpx

from app.config import get_settings

logger = logging.getLogger("medikiosk.ai.translation")
settings = get_settings()

TRANSLATION_COMPUTE_URL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

# IndicTrans-v2 covers en <-> the 12 Indian languages supported by the kiosk.
TRANSLATION_SERVICE_ID = "ai4bharat/indictrans-v2-all-gpu--t4"


class BhashiniTranslation:
    """Client for the Bhashini direct-inference NMT pipeline."""

    def __init__(self):
        self.auth_key = settings.bhashini_ulca_api_key or settings.bhashini_api_key

    async def _translate_once(
        self, text: str, source_lang: str, target_lang: str
    ) -> str:
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source_lang,
                            "targetLanguage": target_lang,
                        },
                        "serviceId": TRANSLATION_SERVICE_ID,
                    },
                }
            ],
            "inputData": {"input": [{"source": text}]},
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                TRANSLATION_COMPUTE_URL,
                headers={"Authorization": self.auth_key, "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
        pipeline = data.get("pipelineResponse") or []
        if pipeline and pipeline[0].get("output"):
            out = pipeline[0]["output"]
            if isinstance(out, list) and out:
                return str(out[0].get("target") or "").strip()
        return ""

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate ``text`` from ``source_lang`` to ``target_lang``.

        Returns the source text unchanged when translation is not possible
        (no credentials, upstream failure, or identical languages).
        """
        text = (text or "").strip()
        if not text or source_lang == target_lang:
            return text
        if not self.auth_key:
            logger.warning("Bhashini translation credentials missing — passthrough.")
            return text
        try:
            translated = await self._translate_once(text, source_lang, target_lang)
            if translated:
                return translated
        except Exception as exc:  # pragma: no cover - upstream best-effort
            logger.error("Bhashini translation failed (%s): %s", type(exc).__name__, exc)
        return text


bhashini_translation = BhashiniTranslation()
