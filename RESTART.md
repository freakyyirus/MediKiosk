# 🔄 MediKiosk — Restart Reference (hand this to the AI tomorrow)

> Goal: give an AI assistant (or your team) **full context in one read** so work resumes instantly.
> Verdict first: **project is 82/100 done — all code written & building; the rest is manual setup + ML retraining.**

---

## 0. READ THIS FIRST

1. `PROJECT_STATUS.md` — the single status doc (section breakdown, remaining + solutions)
2. `MediKiosk_Advanced_Features_v2.0.md` — the feature spec F1–F6 that was implemented
3. Grab a 60-sec re-orientation from this file's sections below

> Deleted (don't recreate): `DONE.md`, `YOU_MUST_DO.md`, `ADVANCED_FEATURES_STATUS.md`, `REMAINING.md`, `MEDI_FLOW_GUIDE.md`.

---

## 1. What this project is

**MediKiosk** — AI kiosk + 3-portal hospital OPD platform (Smart India Hackathon 2026).
Stack: **React 18 + TS + Tailwind v4 + Zustand** (frontend) · **FastAPI** (backend AI/ML) · **Supabase Postgres** (data).
Demo: kiosk voice-first symptom capture → doctor QR/OCR → hospital triage/alarm.

## 2. Run everything NOW

```bash
# Backend (real AI/ML)
cd backend && venv/bin/uvicorn app.main:app --reload     # http://localhost:8000/docs  (FastAPI Swagger)
# Frontend
cd frontend && npm run dev                                # http://localhost:5173
# DB: live Supabase — nothing to run locally. psql: /opt/homebrew/opt/libpq/bin/psql
# Tesseract (OCR binary): /opt/homebrew/bin/tesseract
```

Verify backend boots even without local Postgres (lifespan DB-init is non-fatal by design).

## 3. Environment facts (key ring)

| Item | Value / location |
|---|---|
| Supabase project | Web `https://vrtzdlcvkcaqchudsrsf.supabase.co` · ref `vrtzdlcvkcaqchudsrsf` · region ap-northeast-1 (Tokyo) · password in `.env` |
| Frontend creds | `frontend/.env` → `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (points at live Supabase) |
| Backend creds | repo-root **`.env`** (GEMINI_API_KEY=AQ.Ab8…CvPw, TESSERACT_CMD=/opt/homebrew/bin/tesseract, BHASHINI_*, ABDM_* placeholders) |
| Gemini model | `gemini-3.1-flash-lite` via google-genai SDK (`backend/app/ai/llm_client.py`) |
| Backend venv | `backend/venv` · Python 3.14.6 · deps: scikit-learn 1.9.0, joblib, pytesseract 0.3.13, easyocr 1.7.2, qrcode 8.2, opencv, Pillow, google-genai |
| ML cache | `ml_artifacts/priority_model.joblib` (repo root; trained at boot of first predict call) |
| Frontend libs added | `qrcode`, `@types/qrcode`, `html5-qrcode` |
| SQL source | `database/mediflow_schema.sql` (base) + `database/medi_kiosk_advanced_features.sql` (advanced) |

## 4. Architecture map (key files)

```
database/mediflow_schema.sql            base schema — 20 tables now LIVE
database/medi_kiosk_advanced_features.sql  advanced tables + RLS + retention policy seeds
backend/app/main.py                     FastAPI entry; advanced router registered; lifespan graceful
backend/app/routers/advanced.py         8 endpoints (see contracts §7)
backend/app/ai/ocr_pipeline.py          real OCR: OpenCV→Tesseract→EasyOCR→rule NER→Gemini validation
backend/app/ai/priority_model.py        RandomForest(200) on 4k synthetic patients + rule fallback
backend/app/ai/llm_client.py            Gemini: validate_prescription_ocr, verify_emergency
backend/app/config.py                   env loader; tesseract autodetect via shutil.which
frontend/src/App.tsx                    all routes incl. /kiosk/body-map /doctor/scan-qr /doctor/ocr
                                       /hospital/vitals /hospital/data-retention
frontend/src/stores/advancedFeaturesStore.ts  Zustand store: 6 features, live+mock fallback
frontend/src/api/client.ts              supabase client + advancedApi (ocrProcess, ocrValidate, predictPriority, verifyEmergency)
frontend/src/components/advanced/       InteractiveBodyMap, QRCodeSlip, VitalsPanel, EarlyWarningAlarm,
                                       DataDeletionRequest, PrescriptionOcrProcessor, bodyMapData.ts
frontend/src/pages/                     kiosk/BodyMap, doctor/QrScan+OcrReview, hospital/VitalsMonitor+DataRetentionManager
```

## 5. Current DB state (don't re-run schema blindly)

- **20 tables live**: body_map_interactions, data_deletion_logs, data_retention_policies, emergency_alerts, qr_slips, vitals_readings, prescription_ocr_results (advanced) + profiles/patients/hospitals/departments/doctors/opd_slots/visits/prescriptions/prescription_items/lab_tests/documents/queues/audit_logs.
- RLS on, audits + retention seeds (6 policies) applied.
- **Seeds limited to hospitals+departments** — other seeds impossible: profiles FK to `auth.users`, seeds used fake UUIDs.
- Gotcha: `queues` unique index is on raw `queued_at` (a `::date` cast in an index was rejected by PG: "functions in index expression must be marked IMMUTABLE").

## 6. Demo checklist for tomorrow (manual — cannot be automated)

1. Register in-app: `admin@hospital.in`, `dr.sharma@hospital.in`, `npm@patient.in`, `sunita.patient@hospital.in`
2. Run this once in Supabase SQL Editor:
```sql
UPDATE profiles SET role=CASE WHEN email='admin@hospital.in' THEN 'hospital_admin'
 WHEN email='dr.sharma@hospital.in' THEN 'doctor' ELSE 'patient' END
WHERE email IN ('admin@hospital.in','dr.sharma@hospital.in','npm@patient.in','sunita.patient@hospital.in');
```
3. Scan-QR camera needs localhost/HTTPS. 4. Gather 3–5 handwritten prescription photos for the OCR demo. 5. (optional) `brew install tesseract-lang` for Hindi OCR.

## 7. API contracts (backend /api/v1)

```
POST /advanced/ocr/process      multipart image → ocr_raw_text, extracted_drugs[], confidence, validation_status
POST /advanced/ocr/validate     JSON text → Gemini re-check
POST /advanced/qr/create        → {qr_data:"MEDIKIOSK|base64(json)", slip_id, expires_in}
POST /advanced/ml/predict-priority → {priority_score, priority_class, priority_label, top_factors, confidence, model}
POST /advanced/vitals/analyze   → {severity, flags[], readings}
POST /advanced/emergency/verify → rule→Gemini→vitals fallback; verified:true + reason
POST /advanced/body-map/tap     → {part, dept_suggestion, risk_weight, red_flag}
GET  /advanced/retention/policies
```
Smoke-verified 5 Sep: predict-priority (critical/0.943), vitals (3 flags), qr (base64), emergency (critical), body-map (cardiologist).

## 8. What's LEFT (todo for tomorrow, in priority order)

1. **F6 hard-delete backend** — actual `DELETE` clear-job behind approval (currently logs only; keeps DataRetentionManager UI honest).
2. **Real-image OCR test** — `ocr/process` never hit with an actual prescription photo; verify tesseract path + NER + Gemini.
3. **Retrain priority model on real data** — swap `_synthetic_dataset()` in priority_model.py; delete `.joblib` to force retrain.
4. **ABDM wiring** + Bhashini key → real Hindi ASR (browser web-speech fallback active now).
5. **Deploy**: Vercel (frontend) + Render/Fly (backend).
6. (opt) `git init` + first commit — folder is **not** a git repo yet.

## 9. Quick sanity commands

```bash
cd frontend && npx tsc --noEmit && npm run build        # expect clean (chunk-size warning OK)
cd backend && venv/bin/python -c "import app.main"       # expect OK
ls -la ml_artifacts/priority_model.joblib                # 7.1 MB — model cached
```