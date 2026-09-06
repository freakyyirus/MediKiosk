"""
Medical Document OCR Pipeline (Feature 2).

Strategy (from robust to fast):
1. Tesseract (pytesseract) — fast, preinstalled, gives per-word confidence.
2. EasyOCR (optional, deep-learning) — dramatically better on messy handwriting.
   Lazy-loaded so the app boots instantly; first use downloads models.

The pipeline returns raw text + word-level layout + a handwriting heuristic + a
noise/confidence estimate that downstream NER/Gemini validation consumes.
"""

import asyncio
import io
import logging
import os
import re
from dataclasses import dataclass, field

import cv2
import numpy as np
from PIL import Image, ImageOps

from app.config import get_settings

logger = logging.getLogger("medikiosk.ai.ocr")
settings = get_settings()

# Tesseract is dirt cheap to import; EasyOCR is not (models) — lazy import.
try:
    import pytesseract

    pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
    _TESSERACT_OK = bool(settings.tesseract_cmd and os.path.exists(settings.tesseract_cmd))
except Exception as exc:  # pragma: no cover
    logger.warning("pytesseract unavailable: %s", exc)
    _TESSERACT_OK = False
    pytesseract = None  # type: ignore[assignment]

_easyocr_reader = None
_easyocr_loading = False


@dataclass
class OcrWord:
    text: str
    conf: float
    x: int
    y: int
    w: int
    h: int


@dataclass
class OcrDocument:
    raw_text: str
    words: list[OcrWord] = field(default_factory=list)
    engine: str = "tesseract"
    mean_conf: float = 0.0
    handwriting_heuristic: float = 0.0
    page_confidence: float = 0.0


def _preprocess(bgr: np.ndarray) -> np.ndarray:
    """Grayscale + denoise + adaptive threshold to boost handwriting OCR."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=30)
    # Light adaptive-threshold sharpening
    thresh = cv2.adaptiveThreshold(denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11)
    return thresh


def _build_words_from_tesseract(data: dict) -> tuple[list[OcrWord], str]:
    words: list[OcrWord] = []
    lines: dict[int, list[str]] = {}
    n = len(data.get("text", []))
    for i in range(n):
        text = (data.get("text") or [" "] * n)[i]
        conf = float((data.get("conf") or ["0"] * n)[i])
        txt = text.strip()
        if not txt:
            continue
        try:
            x = int((data.get("left") or [0] * n)[i])
            y = int((data.get("top") or [0] * n)[i])
            w = int((data.get("width") or [0] * n)[i])
            h = int((data.get("height") or [0] * n)[i])
        except (TypeError, ValueError):
            x = y = w = h = 0
        if conf >= 0:
            words.append(OcrWord(text=txt, conf=conf / 100.0, x=x, y=y, w=w, h=h))
        # Group by block for reading order
        block = data.get("block_num") or [0] * n
        para = data.get("par_num") or [0] * n
        line = data.get("line_num") or [0] * n
        key = f"{block[i]}.{para[i]}.{line[i]}"
        lines.setdefault(key, []).append(txt)

    ordered = []
    for key in sorted(lines.keys(), key=lambda k: [int(p) for p in k.split(".")]):
        ordered.append(" ".join(lines[key]))
    raw_text = "\n".join(ordered)
    return words, raw_text


def _handwriting_heuristic(words: list[OcrWord]) -> float:
    """
    Heuristic 0-1 estimating how 'handwritten' the document is:
    high sigma on y-coordinates (jagged baselines), variance in heights,
    and presence of terse shorthand tokens (Tab/Syp/BD/OD/tsf).
    """
    if not words:
        return 0.0
    ys = [wd.y for wd in words]
    hs = [wd.h for wd in words]
    y_var = float(np.std(ys)) / (float(np.mean(hs)) + 1e-6)
    h_var = float(np.std(hs)) / (float(np.mean(hs)) + 1e-6)
    text = " ".join(wd.text for wd in words).lower()
    shorthand = sum(1 for tok in ("tab", "cap", "syp", "inj", "bd", "tds", "od", "sos", "tsf") if tok in text)
    heuristic = min(1.0, 0.35 * y_var + 0.25 * h_var + 0.08 * shorthand)
    return round(heuristic, 3)


def _run_tesseract(image_bytes: bytes) -> OcrDocument | None:
    if not _TESSERACT_OK or pytesseract is None:
        return None
    pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    pil = ImageOps.exif_transpose(pil)
    bgr = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    processed = _preprocess(bgr)

    data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT, lang="eng")
    words, raw_text = _build_words_from_tesseract(data)

    if not raw_text.strip():
        # Retry on the raw image
        data = pytesseract.image_to_data(pil, output_type=pytesseract.Output.DICT, lang="eng")
        words, raw_text = _build_words_from_tesseract(data)

    confs = [wd.conf for wd in words]
    mean_conf = float(np.mean(confs)) if confs else 0.0
    heuristic = _handwriting_heuristic(words)

    return OcrDocument(
        raw_text=raw_text,
        words=words,
        engine="tesseract",
        mean_conf=mean_conf,
        handwriting_heuristic=heuristic,
        page_confidence=round(0.5 * mean_conf + 0.5 * (1.0 - heuristic), 3),
    )


def _run_easyocr(image_bytes: bytes) -> OcrDocument | None:
    global _easyocr_reader, _easyocr_loading
    try:
        import easyocr
    except Exception:
        return None

    if _easyocr_reader is None and not _easyocr_loading:
        _easyocr_loading = True
        try:
            # English only for speed (~5-8s first load, model cached after)
            _easyocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        except Exception as exc:  # pragma: no cover
            logger.warning("EasyOCR init failed: %s", exc)
            _easyocr_reader = None
        finally:
            _easyocr_loading = False

    if _easyocr_reader is None:
        return None

    results = _easyocr_reader.readtext(image_bytes, paragraph=False)
    words: list[OcrWord] = []
    lines: list[str] = []
    for box, text, conf in results:
        xs = [int(p[0]) for p in box]
        ys = [int(p[1]) for p in box]
        if not text.strip():
            continue
        words.append(
            OcrWord(
                text=text.strip(),
                conf=float(conf),
                x=min(xs),
                y=min(ys),
                w=max(xs) - min(xs),
                h=max(ys) - min(ys),
            )
        )
        lines.append(text.strip())

    if not words:
        return None

    # Reconstruct reading order (top-to-bottom, left-to-right)
    lines_sorted = sorted(lines, key=lambda t: (words[lines.index(t)].y, words[lines.index(t)].x))
    raw_text = " ".join(lines_sorted)
    confs = [wd.conf for wd in words]
    mean_conf = float(np.mean(confs))
    heuristic = _handwriting_heuristic(words)
    return OcrDocument(
        raw_text=raw_text,
        words=words,
        engine="easyocr",
        mean_conf=mean_conf,
        handwriting_heuristic=heuristic,
        page_confidence=round(0.6 * mean_conf + 0.4 * (1.0 - heuristic), 3),
    )


class OCRPipeline:
    """Async wrapper around the OCR engines with NER helper."""

    async def process_image(self, image_bytes: bytes, language: str = "en", prefer: str = "auto") -> OcrDocument:
        """Run OCR, preferring EasyOCR when handwriting heuristic is expected high."""

        def block() -> OcrDocument:
            doc1 = _run_tesseract(image_bytes)
            if prefer == "easyocr" or (doc1 and doc1.handwriting_heuristic > 0.45):
                doc2 = _run_easyocr(image_bytes)
                if doc2 is not None:
                    return doc2
            if doc1 is not None:
                return doc1
            # Last resort: bare tesseract on raw bytes
            doc3 = _run_tesseract(image_bytes)
            if doc3 is not None:
                return doc3
            raise RuntimeError("No OCR engine available (install tesseract or easyocr).")

        return await asyncio.to_thread(block)

    def extract_entities(self, raw_text: str) -> dict:
        """
        Lightweight rule-based NER: drug names, doses, frequencies, durations.
        Used as a baseline before Gemini validation.
        """
        lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]
        drugs: list[dict] = []
        diagnoses: list[str] = []

        freq_map = {
            "od": "OD",
            "bd": "BD",
            "tds": "TDS",
            "qid": "QID",
            "sos": "SOS",
            "hs": "HS",
            "once daily": "OD",
            "twice daily": "BD",
            "thrice daily": "TDS",
        }
        dose_re = re.compile(r"(\d+\.?\d*\s*(mg|mcg|g|ml|iu|tsf|tab|caps?|unit))", re.IGNORECASE)
        freq_re = re.compile(r"\b(od|bd|tds|qid|sos|hs|once daily|twice daily|thrice daily)\b", re.IGNORECASE)
        dur_re = re.compile(r"([x×]\s*\d+\s*days?|\d+\s*days|\d+\s*weeks?|\d+\s*months?)", re.IGNORECASE)
        diag_re = re.compile(
            r"\b(diabetes|hypertension|gastritis|fever|infection|thyroid|asthma|malaria|typhoid|cough|cold|gastric)\b",
            re.IGNORECASE,
        )

        for line in lines:
            lowered = line.lower()
            if any(
                tok in lowered
                for tok in (
                    "tab.",
                    "tab ",
                    "cap.",
                    "cap ",
                    "syp.",
                    "syr.",
                    "inj.",
                    "ointment",
                    "drops",
                    "tablet",
                    "capsule",
                    "syrup",
                )
            ):
                text = re.sub(r"^\s*[a-z.]+\s*", "", line)
                name_match = re.match(r"^\s*([A-Za-z][A-Za-z0-9 .-]{1,24}?)(?=\s+(\d|$))", line)
                name = name_match.group(1).strip() if name_match else text.split(maxsplit=1)[0].strip() if text else ""
                dose_m = dose_re.search(line)
                freq_m = freq_re.search(line)
                dur_m = dur_re.search(line)
                drugs.append(
                    {
                        "name": name.title() if name else None,
                        "brand_name": None,
                        "dosage": dose_m.group(1).strip() if dose_m else None,
                        "frequency": freq_map.get(freq_m.group(1).lower(), freq_m.group(1).upper()) if freq_m else None,
                        "duration": dur_m.group(0).strip() if dur_m else None,
                        "instructions": None,
                        "confidence": 0.5,
                        "raw_text": line,
                    }
                )
            for m in diag_re.findall(line):
                diagnoses.append(m.capitalize())

        return {"drugs": drugs, "diagnoses": diagnoses}
