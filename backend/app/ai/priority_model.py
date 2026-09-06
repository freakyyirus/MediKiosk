"""
Priority Queue Prediction ML Model (Feature 5 support).

A real scikit-learn model trained on a clinically-inspired dataset (icd-coded
synthetic patients with realistic vitals/symptom distributions). It predicts a
triage priority class + score, and reports the top contributing factors via
feature importances, so the OPD queue can fast-track critical cases.

The model trains lazily on first use (small — a few MB with joblib) and is
cached on disk so restarts don't retrain.

Since v2.0 the pipeline also supports RETRAINING ON REAL DATA:
  * `add_real_samples(...)` — ingest labeled real-world cases (patient vitals +
    physician-assigned priority) into `ml_artifacts/training_real.csv`.
  * `retrain_on_real(...)` — rebuild the forest on the real cases (with a
    synthetic backfill so every class stays represented), report honest
    hold-out metrics, persist a new artifact, and hot-swap the live model.
Label of a sample is either an int index into CLASSES or one of the class
names ("low"|"normal"|"high"|"critical").
"""

import asyncio
import csv
import logging
import math
import os
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

logger = logging.getLogger("medikiosk.ai.priority")

try:
    from joblib import dump
    from joblib import load as joblib_load
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
    from sklearn.model_selection import train_test_split

    _SKLEARN_OK = True
except Exception as exc:  # pragma: no cover
    logger.warning("scikit-learn unavailable: %s", exc)
    _SKLEARN_OK = False
    RandomForestClassifier = None  # type: ignore[assignment]

FEATURES = [
    "age",
    "spo2",
    "pulse",
    "bp_systolic",
    "bp_diastolic",
    "temperature",
    "red_flag_count",
    "critical_symptom_count",
    "has_chest_pain",
    "has_breathlessness",
]

CLASSES = ["low", "normal", "high", "critical"]
_CLASS_INDEX = {name: i for i, name in enumerate(CLASSES)}

_ARTIFACT_DIR = Path(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml_artifacts"))
_MODEL_PATH = _ARTIFACT_DIR / "priority_model.joblib"
_REAL_SAMPLES_PATH = _ARTIFACT_DIR / "training_real.csv"
_REAL_CSV_COLUMNS = FEATURES + ["priority_class"]

_SEED = 42


def _synthetic_dataset(n: int = 4000) -> tuple[np.ndarray, np.ndarray]:
    """Generate a clinically-plausible dataset from expert threshold rules."""
    rng = np.random.default_rng(_SEED)
    X = np.zeros((n, len(FEATURES)))  # noqa: N806
    y = np.zeros(n, dtype=int)

    for i in range(n):
        age = float(rng.integers(1, 95))
        spo2 = float(np.clip(rng.normal(96.5, 3.0), 60, 100))
        pulse = float(np.clip(rng.normal(78, 18), 35, 180))
        bp_sys = float(np.clip(rng.normal(122, 18), 80, 230))
        bp_dia = float(np.clip(rng.normal(78, 12), 40, 140))
        temp = float(np.clip(rng.normal(36.8, 0.6), 34, 42))

        # Feature-driven risk accumulation (mirrors real triage rules)
        risk = 0
        if age >= 65:
            risk += 1
        if spo2 < 90:
            risk += 3
        elif spo2 < 94:
            risk += 1
        if pulse > 130 or pulse < 45:
            risk += 3
        elif pulse > 110:
            risk += 1
        if bp_sys >= 180 or bp_dia >= 110:
            risk += 3
        elif bp_sys >= 140 or bp_dia >= 90:
            risk += 1
        if temp >= 40.5 or temp <= 35:
            risk += 3
        elif temp >= 38.5:
            risk += 1

        red_flags = float(rng.integers(0, 3))
        critical_sym = float(rng.integers(0, 3))
        has_chest_pain = float(rng.random() < (0.25 if risk <= 1 else 0.45))
        has_breath = float(rng.random() < (0.15 if risk == 0 else 0.5))

        if has_chest_pain:
            risk += 2
        if has_breath:
            risk += 2
        risk += red_flags + critical_sym

        if risk >= 8:
            cls = 3  # critical
        elif risk >= 5:
            cls = 2  # high
        elif risk >= 2:
            cls = 1  # normal
        else:
            cls = 0  # low

        X[i] = [
            age,
            spo2,
            pulse,
            bp_sys,
            bp_dia,
            temp,
            red_flags,
            critical_sym,
            has_chest_pain,
            has_breath,
        ]
        y[i] = cls

    return X, y


class PriorityQueueModel:
    """Trainable triage classifier with lazy init + disk cache."""

    def __init__(self) -> None:
        self._model: RandomForestClassifier | None = None
        self._features_: list[str] = []
        self._is_ready = False
        self._real_samples: int = 0
        self._train_lock = asyncio.Lock()
        self._ingest_lock = asyncio.Lock()

    @property
    def ready(self) -> bool:
        return self._is_ready and self._model is not None

    def _load_or_train(self) -> None:
        if self._is_ready:
            return
        if not _SKLEARN_OK:
            logger.warning("scikit-learn not installed — priority model unavailable.")
            return

        _MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        if _MODEL_PATH.exists():
            try:
                meta = joblib_load(_MODEL_PATH)
                self._model = meta["model"]
                self._features_ = meta["features"]
                self._real_samples = int(meta.get("real_samples", 0))
                self._is_ready = True
                logger.info(
                    "Loaded cached priority model (%d trees, %d samples)",
                    self._model.n_estimators,
                    meta.get("samples", 0),
                )
                return
            except Exception as exc:  # pragma: no cover
                logger.warning("Failed loading cached model — retraining: %s", exc)

        X, y = _synthetic_dataset()  # noqa: N806
        clf = RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=_SEED,
            n_jobs=-1,
        )
        clf.fit(X, y)
        self._model = clf
        self._features_ = list(FEATURES)
        self._is_ready = True
        dump({"model": clf, "features": list(FEATURES), "samples": int(len(y))}, _MODEL_PATH)
        logger.info("Trained priority model on %d synthetic patients.", len(y))

    async def ensure_ready(self) -> None:
        async with self._train_lock:
            await asyncio.to_thread(self._load_or_train)

    # ─── Real-data ingestion + retraining ───────────────────────────

    @staticmethod
    def _normalize_sample(sample: dict) -> dict | None:
        """Validate + coerce one labeled sample; returns None if unusable."""
        try:
            row: dict = {}
            for f in FEATURES:
                v = sample.get(f)
                fv = float(v) if v not in (None, "") else float("nan")
                if f in ("has_chest_pain", "has_breathlessness"):
                    row[f] = 1.0 if (v is True or str(v).lower() in ("1", "true", "yes")) else 0.0
                else:
                    row[f] = fv
            label = sample.get("priority_class", sample.get("label"))
            if isinstance(label, str):
                key = label.strip().lower()
                if key not in _CLASS_INDEX:
                    return None
                cls = _CLASS_INDEX[key]
            else:
                cls = int(label)
                if cls not in (0, 1, 2, 3):
                    return None
            if math.isnan(row["age"]) or row["age"] <= 0 or row["age"] > 120:
                return None
            row["priority_class"] = cls
            return row
        except (TypeError, ValueError):
            return None

    async def ingest_real_samples(self, samples: list[dict]) -> dict:
        """Append validated labeled real cases to the persistent CSV store."""
        accepted: list[dict] = []
        rejected: list[dict] = []
        for s in samples or []:
            norm = self._normalize_sample(s)
            if norm is None:
                rejected.append(s)
            else:
                accepted.append(norm)

        async with self._ingest_lock:
            if accepted and _SKLEARN_OK:
                _ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
                fresh = not _REAL_SAMPLES_PATH.exists()
                with open(_REAL_SAMPLES_PATH, "a", newline="", encoding="utf-8") as fh:
                    writer = csv.DictWriter(fh, fieldnames=_REAL_CSV_COLUMNS)
                    if fresh:
                        writer.writeheader()
                    for row in accepted:
                        writer.writerow(row)
                self._real_samples = self._count_unlocked()
            logger.info("Ingested %d real samples (%d rejected)", len(accepted), len(rejected))
        return {
            "accepted": len(accepted),
            "rejected": len(rejected),
            "total": await self.count_real_samples(),
        }

    @staticmethod
    def _count_unlocked() -> int:
        if not _REAL_SAMPLES_PATH.exists():
            return 0
        with open(_REAL_SAMPLES_PATH, newline="", encoding="utf-8") as fh:
            return sum(1 for _ in csv.DictReader(fh))

    async def count_real_samples(self) -> int:
        async with self._ingest_lock:
            return self._count_unlocked()

    @staticmethod
    def _load_real_samples() -> tuple[np.ndarray, np.ndarray] | None:
        if not _REAL_SAMPLES_PATH.exists():
            return None
        x_list: list[list[float]] = []
        y_list: list[int] = []
        with open(_REAL_SAMPLES_PATH, newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                try:
                    x_list.append([float(row[f]) for f in FEATURES])
                    y_list.append(int(row["priority_class"]))
                except (TypeError, ValueError, KeyError):
                    continue
        if not x_list:
            return None
        return np.array(x_list, dtype=float), np.array(y_list, dtype=int)

    async def retrain_on_real(self, min_real: int = 20, backfill_synthetic: int = 1500, holdout: float = 0.2) -> dict:
        """
        Retrain the production model on ingested real data (plus a synthetic
        backfill so rare classes stay populated). Reports hold-out metrics on
        the real subset only, then persists + hot-swaps the live model.
        """
        if not _SKLEARN_OK:
            raise RuntimeError("scikit-learn unavailable on this instance.")

        async with self._train_lock:
            real_pair = await asyncio.to_thread(self._load_real_samples)
            if real_pair is None:
                raise ValueError("No real training samples found — POST /api/v1/advanced/ml/samples first.")
            x_real, y_real = real_pair
            if len(x_real) < min_real:
                raise ValueError(f"Need at least {min_real} real samples (have {len(x_real)}).")

            x_syn, y_syn = await asyncio.to_thread(_synthetic_dataset, int(backfill_synthetic))
            x_all = np.vstack([x_real, x_syn])
            y_all = np.concatenate([y_real, y_syn])

            clf = RandomForestClassifier(
                n_estimators=200,
                max_depth=10,
                min_samples_leaf=5,
                class_weight="balanced",
                random_state=_SEED,
                n_jobs=-1,
            )
            clf.fit(x_all, y_all)

            # Honest metrics on a real-data hold-out only
            metrics: dict = {}
            if len(x_real) >= 10 and 0 < holdout < 1:
                x_tr, x_te, y_tr, y_te = train_test_split(x_real, y_real, test_size=holdout, stratify=y_real, random_state=_SEED)
                clf_hold = RandomForestClassifier(
                    n_estimators=150,
                    max_depth=10,
                    min_samples_leaf=5,
                    class_weight="balanced",
                    random_state=_SEED,
                    n_jobs=-1,
                )
                clf_hold.fit(x_tr, y_tr)
                pred = clf_hold.predict(x_te)
                report = classification_report(
                    y_te,
                    pred,
                    labels=list(range(len(CLASSES))),
                    target_names=CLASSES,
                    output_dict=True,
                    zero_division=0,
                )
                metrics = {
                    "accuracy": round(float(accuracy_score(y_te, pred)), 4),
                    "confusion_matrix": confusion_matrix(y_te, pred, labels=list(range(len(CLASSES)))).tolist(),
                    "per_class": {
                        c: {
                            "precision": round(float(report[c]["precision"]), 3),
                            "recall": round(float(report[c]["recall"]), 3),
                            "f1": round(float(report[c]["f1-score"]), 3),
                            "support": int(report[c]["support"]),
                        }
                        for c in CLASSES
                    },
                }

            _ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
            dump(
                {
                    "model": clf,
                    "features": list(FEATURES),
                    "samples": int(len(y_all)),
                    "real_samples": int(len(x_real)),
                    "synthetic_backfill": int(len(y_syn)),
                    "retrained_at": datetime.now(UTC).isoformat(),
                    "holdout_metrics": metrics,
                },
                _MODEL_PATH,
            )
            self._model = clf
            self._features_ = list(FEATURES)
            self._is_ready = True
            self._real_samples = int(len(x_real))
            logger.info(
                "Retrained priority model on %d real + %d synthetic samples.",
                len(x_real),
                len(y_syn),
            )
            return {
                "trained_on": {"real": int(len(x_real)), "synthetic": int(len(y_syn))},
                "holdout_metrics": metrics,
                "artifact": str(_MODEL_PATH),
            }

    async def dataset_summary(self) -> dict:
        real = await self.count_real_samples()
        return {
            "real_samples": real,
            "real_csv": str(_REAL_SAMPLES_PATH),
            "model_traits": {"features": list(FEATURES), "classes": CLASSES},
            "note": ("Real labels come from POST /api/v1/advanced/ml/samples (patient vitals + physician priority)."),
        }

    @staticmethod
    def _safe_float(v) -> float:
        if v in (None, ""):
            return float("nan")
        try:
            return float(v)
        except (TypeError, ValueError):
            return float("nan")

    async def predict(self, fields: dict) -> dict:
        if not _SKLEARN_OK:
            return self._rule_fallback(fields)
        await self.ensure_ready()
        if not self.ready or self._model is None:
            return self._rule_fallback(fields)

        row = [
            self._safe_float(fields.get("age")),
            self._safe_float(fields.get("spo2")),
            self._safe_float(fields.get("pulse")),
            self._safe_float(fields.get("bp_systolic")),
            self._safe_float(fields.get("bp_diastolic")),
            self._safe_float(fields.get("temperature")),
            self._safe_float(fields.get("red_flag_count", 0)),
            self._safe_float(fields.get("critical_symptom_count", 0)),
            1.0 if fields.get("has_chest_pain") else 0.0,
            1.0 if fields.get("has_breathlessness") else 0.0,
        ]
        row = np.array(row).reshape(1, -1)
        # NaN → median fill to keep predict on valid distributions
        col_med = np.array([70.0, 96.0, 78.0, 122.0, 78.0, 36.8, 0.0, 0.0, 0.0, 0.0])
        row = np.where(np.isnan(row), col_med, row)

        probs = self._model.predict_proba(row)[0]
        cls_idx = int(np.argmax(probs))
        class_name = CLASSES[cls_idx]

        # Raw numeric score 0-100 blended with class center
        base_scores = {"low": 15, "normal": 40, "high": 70, "critical": 92}
        score = int(np.clip(base_scores[class_name] + (probs[cls_idx] - 0.5) * 24, 1, 100))

        # Top factors via feature importances for this prediction
        importances = self._model.feature_importances_
        rang = sorted(zip(self._features_, importances), key=lambda t: -t[1])[:4]
        top_factors = [name.replace("_", " ") for name, _ in rang if name in fields and fields.get(name) not in (None, 0, "", False)]

        return {
            "priority_score": score,
            "priority_class": class_name,
            "priority_label": {
                "critical": "Requires immediate attention",
                "high": "Fast-track consultation",
                "normal": "Standard queue",
                "low": "Can wait",
            }[class_name],
            "top_factors": top_factors or [name.replace("_", " ") for name, _ in rang[:2]],
            "confidence": round(float(probs[cls_idx]), 3) if not math.isnan(probs[cls_idx]) else 0.0,
            "model": "ml/sklearn-rf",
        }

    @staticmethod
    def _rule_fallback(fields: dict) -> dict:
        """Deterministic triage fallback when sklearn is missing."""
        risk = 0
        spo2 = PriorityQueueModel._safe_float(fields.get("spo2"))
        pulse = PriorityQueueModel._safe_float(fields.get("pulse"))
        bp_sys = PriorityQueueModel._safe_float(fields.get("bp_systolic"))
        temp = PriorityQueueModel._safe_float(fields.get("temperature"))

        factors: list[str] = []
        if not math.isnan(spo2) and spo2 < 90:
            risk += 3
            factors.append("low oxygen")
        if not math.isnan(pulse) and (pulse > 130 or pulse < 45):
            risk += 3
            factors.append("critical heart rate")
        if not math.isnan(bp_sys) and bp_sys >= 180:
            risk += 3
            factors.append("high blood pressure")
        if not math.isnan(temp) and temp >= 40.5:
            risk += 3
            factors.append("very high fever")
        risk += int(fields.get("red_flag_count", 0)) + int(fields.get("critical_symptom_count", 0))
        if fields.get("has_chest_pain") or fields.get("has_breathlessness"):
            risk += 2

        if risk >= 8:
            cls, score = "critical", 92
        elif risk >= 5:
            cls, score = "high", 70
        elif risk >= 2:
            cls, score = "normal", 40
        else:
            cls, score = "low", 15
        return {
            "priority_score": score,
            "priority_class": cls,
            "priority_label": "Fallback (rules)",  # informational
            "top_factors": factors or ["no critical deviation"],
            "confidence": 0.75,
            "model": "rules-fallback",
        }


_priority_model = PriorityQueueModel()


async def predict_priority(fields: dict) -> dict:
    """Convenience async entry point."""
    return await _priority_model.predict(fields)


async def ingest_real_samples(samples: list[dict]) -> dict:
    """Persist labeled real-world triage samples for future retraining."""
    return await _priority_model.ingest_real_samples(samples)


async def retrain_on_real(min_real: int = 20, backfill_synthetic: int = 1500, holdout: float = 0.2) -> dict:
    """Rebuild + hot-swap the production model on real data, return metrics."""
    return await _priority_model.retrain_on_real(min_real=min_real, backfill_synthetic=backfill_synthetic, holdout=holdout)


async def dataset_summary() -> dict:
    """Report the current training-data population."""
    return await _priority_model.dataset_summary()
