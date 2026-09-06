"""
Bhashini ASR + TTS tests.

ASR: all 9 production languages must resolve to a real model — never a Hindi
fallback. Unknown languages must fall back to the multilingual model while
KEEPING the requested language code (Bhashini multilingual models expect a
valid sourceLanguage).
"""

import pytest

from app.ai.asr_client import (
    _ASR_SERVICE_IDS,
    _ENGLISH_ASR,
    _MULTILINGUAL_DRAVIDIAN,
    _MULTILINGUAL_INDO_ARYAN,
    BhashiniASR,
    resolve_asr_service_id,
)
from app.ai.tts_client import _TTS_SERVICE_IDS, BhashiniTTS, resolve_tts_service_id

ALL_LANGS = ["en", "hi", "ta", "te", "kn", "ml", "bn", "mr", "gu", "pa"]
DRAVIDIAN = ["ta", "te", "kn", "ml"]
INDO_ARYAN = ["hi", "bn", "mr", "gu", "pa"]
NO_KEY = {"bhashini_ulca_api_key": "", "bhashini_api_key": ""}


@pytest.fixture(autouse=True)
def _no_bhashini_keys(monkeypatch):
    """Force mock mode so tests never touch the real Bhashini network."""
    import app.ai.asr_client as asr_mod
    import app.ai.tts_client as tts_mod

    for key, value in NO_KEY.items():
        monkeypatch.setattr(asr_mod.settings, key, value)
        monkeypatch.setattr(tts_mod.settings, key, value)


def test_asr_service_ids_exist_for_all_languages():
    assert {lang: _ASR_SERVICE_IDS.get(lang) for lang in ALL_LANGS}.keys() == set(ALL_LANGS)
    for lang in ALL_LANGS:
        assert resolve_asr_service_id(lang)[0], f"no ASR serviceId for {lang}"


def test_asr_english_uses_whisper():
    service_id, resolved = resolve_asr_service_id("en")
    assert service_id == _ENGLISH_ASR
    assert resolved == "en"


def test_asr_dravidian_languages_use_dravidian_model():
    for lang in DRAVIDIAN:
        service_id, resolved = resolve_asr_service_id(lang)
        assert service_id == _MULTILINGUAL_DRAVIDIAN, f"{lang} must use Dravidian model"
        assert resolved == lang


def test_asr_indo_aryan_languages_use_indic_model():
    for lang in INDO_ARYAN:
        service_id, resolved = resolve_asr_service_id(lang)
        assert service_id == _MULTILINGUAL_INDO_ARYAN, f"{lang} must use Indo-Aryan model"
        assert resolved == lang


def test_asr_tamil_does_not_fall_back_to_hindi():
    assert _ASR_SERVICE_IDS["ta"] != _ASR_SERVICE_IDS["hi"]


def test_asr_unknown_language_uses_multilingual_not_hindi():
    service_id, resolved = resolve_asr_service_id("xx")
    assert service_id == _MULTILINGUAL_INDO_ARYAN
    assert resolved == "xx"  # keep the patient's own code; never swap to Hindi


def test_tts_service_ids_exist_for_all_languages():
    for lang in ALL_LANGS:
        service_id = resolve_tts_service_id(lang)
        assert service_id
    assert "pa" in _TTS_SERVICE_IDS  # previously missing


# ---- Live-call tests (mock mode, no network) ----


@pytest.mark.asyncio
async def test_asr_english():
    result = await BhashiniASR().transcribe_audio(b"fake_audio_bytes", "en")
    assert result is not None
    assert result[0]


@pytest.mark.asyncio
async def test_asr_hindi():
    result = await BhashiniASR().transcribe_audio(b"fake_audio_bytes", "hi")
    assert result is not None
    assert result[0]


@pytest.mark.asyncio
async def test_asr_tamil():
    result = await BhashiniASR().transcribe_audio(b"fake_audio_bytes", "ta")
    assert result is not None
    assert result[0]


@pytest.mark.asyncio
async def test_tts_graceful_without_key():
    for lang in ALL_LANGS:
        result = await BhashiniTTS().synthesize("Test message", lang)
        assert isinstance(result, str)


def test_tts_all_languages_map_to_models():
    """Every production language resolves to a concrete TTS serviceId (no None)."""
    for lang in ALL_LANGS:
        service_id = resolve_tts_service_id(lang)
        assert service_id in set(_TTS_SERVICE_IDS.values())
