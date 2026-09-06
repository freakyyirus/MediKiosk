"""
Google Gemini LLM Client (modern google-genai SDK).

Used for clinical structuring, summaries, OCR validation, emergency
verification, and structured JSON extraction.
"""

import asyncio
import json
import logging

from app.config import get_settings

# Faster import: import lib lazily so the app can boot without keys.
logger = logging.getLogger("medikiosk.ai.llm")
settings = get_settings()


class GeminiClient:
    """Client for Google Gemini AI using the google-genai SDK."""

    def __init__(self) -> None:
        self.model_name = settings.gemini_model
        self._client = None
        if settings.gemini_api_key:
            try:
                from google import genai

                self._client = genai.Client(api_key=settings.gemini_api_key)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Failed to init genai client: %s", exc)
                self._client = None

    @property
    def available(self) -> bool:
        return self._client is not None

    async def _generate(self, prompt: str, temperature: float = 0.2, system_instruction: str | None = None) -> str:
        """Run a content generation in a thread to avoid blocking the loop."""
        if not self._client:
            raise RuntimeError("Gemini client not configured")
        from google import genai

        config = genai.types.GenerateContentConfig(
            temperature=temperature,
            automatic_function_calling=genai.types.AutomaticFunctionCallingConfig(disable=True),
        )
        if system_instruction:
            # system_instruction is treated as the model's hard directive; the
            # prompt string carries the actual conversation contents.
            config.system_instruction = system_instruction
        return await asyncio.to_thread(
            self._client.models.generate_content,
            model=self.model_name,
            contents=prompt,
            config=config,
        )

    async def _generate_json(self, prompt: str, temperature: float = 0.1, system_instruction: str | None = None) -> dict:
        resp = await self._generate(prompt, temperature, system_instruction)
        text = resp.text.replace("```json", "").replace("```", "").strip()
        # Strip any leading/trailing non-JSON noise
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start : end + 1]
        return json.loads(text)

    async def structure_clinical_history(self, transcript: str) -> dict:
        """Extract SOCRATES parameters + structured clinical history from transcript."""
        if not self.available:
            logger.warning("No Gemini key. Returning mock clinical structuring.")
            return {
                "chief_complaint": "Chest pain",
                "hpi": {
                    "site": "Central chest",
                    "onset": "Sudden, 2 hours ago",
                    "character": "Crushing",
                    "severity": 8,
                    "radiation": "Left arm",
                },
                "confidence": 0.9,
            }

        prompt = f"""
        You are an expert medical transcriptionist. Extract structured clinical information
        from the patient transcript below. Return ONLY valid JSON with keys:
        chief_complaint (string), hpi (object with site, onset, character, severity, radiation,
        timing, associated_symptoms, aggravating_factors, relieving_factors),
        past_medical_history (list), current_medications (list), allergies (list),
        red_flags (list of strings), confidence (0-1).

        Transcript:
        {transcript}
        """
        try:
            return await self._generate_json(prompt)
        except Exception as exc:
            logger.error("Error calling Gemini: %s", exc)
            return {"error": "Failed to structure history"}

    async def generate_summary(self, session_data: dict, documents_text: str = "") -> str:
        """Generate a cohesive physician summary."""
        if not self.available:
            return "Mock summary: Patient presents with chest pain radiating to the left arm. History of hypertension."

        prompt = f"""
        Generate a professional, concise clinical summary for a physician based on:
        Session Data:
        {json.dumps(session_data, default=str)}

        OCR Text:
        {documents_text}

        Keep it objective and structured with short bullet points.
        """
        try:
            resp = await self._generate(prompt)
            return resp.text
        except Exception as exc:
            logger.error("Error generating summary: %s", exc)
            return "Error generating summary."

    async def validate_prescription_ocr(self, raw_text: str) -> dict:
        """
        Validate raw OCR text from a handwritten prescription.
        Returns structured drugs list, diagnoses, doctor name, hospital, and confidence +
        low-confidence field flags.
        """
        if not self.available:
            # Mock fallback used when no key configured
            return {
                "extracted_drugs": [
                    {
                        "name": "Pantoprazole",
                        "brand_name": "Pan",
                        "dosage": "40mg",
                        "frequency": "BD",
                        "duration": "5 days",
                        "instructions": "Before food",
                        "confidence": 0.89,
                        "raw_text": "Tab. Pan 40mg BD",
                    }
                ],
                "extracted_diagnoses": ["Gastritis"],
                "doctor_name": None,
                "hospital_name": None,
                "prescription_date": None,
                "handwriting_detected": True,
                "low_confidence_fields": ["duration", "instructions"],
                "overall_confidence": 0.72,
            }

        prompt = f"""
        You are an expert pharmacist. Below is raw OCR text extracted from a handwritten
        Indian prescription. Parse it into structured JSON.

        Return ONLY valid JSON with keys:
        extracted_drugs: array of {{name, brand_name, dosage, frequency, duration,
            instructions, confidence (0-1), raw_text}}
        extracted_diagnoses: array of strings
        doctor_name, hospital_name, prescription_date (YYYY-MM-DD or null)
        handwriting_detected: boolean
        low_confidence_fields: array of strings (e.g. "dosage", "duration", "instructions")
        overall_confidence: 0-1

        Drug frequency shorthand: OD = once daily, BD = twice daily, TDS = thrice daily,
        QID = four times daily, SOS = as needed, HS = at night.
        Amounts: mg, mcg, ml, tsf (teaspoon), g, IU.

        Raw OCR:
        {raw_text}
        """
        try:
            data = await self._generate_json(prompt)
            data.setdefault("handwriting_detected", True)
            data.setdefault("low_confidence_fields", [])
            data.setdefault("overall_confidence", 0.75)
            return data
        except Exception as exc:
            logger.error("OCR validation error: %s", exc)
            return {"error": "Failed to validate prescription", "raw_text": raw_text}

    async def verify_emergency(self, symptoms: list[str], vitals: dict, transcript: str) -> dict:
        """LLM verification for ambiguous emergency cases."""
        if not self.available:
            return {"is_emergency": False, "confidence": 0.0, "reasoning": "model unavailable"}

        prompt = f"""
        You are a triage nurse. Determine if this patient is in a MEDICAL EMERGENCY
        needing immediate attention. Symptoms: {json.dumps(symptoms)}.
        Vitals: {json.dumps(vitals)}.
        Patient words: {transcript}

        Return ONLY valid JSON: {{"is_emergency": bool, "confidence": 0-1, "alert_type": string or null,
        "reasoning": string}}
        """
        try:
            return await self._generate_json(prompt)
        except Exception as exc:
            logger.error("Emergency verify error: %s", exc)
            return {"is_emergency": False, "confidence": 0.0, "reasoning": str(exc)}
