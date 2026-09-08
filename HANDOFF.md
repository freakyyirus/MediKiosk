# MediKiosk — Continuation Handoff

Read this file first to resume where the previous session stopped.

## Objective
Finish implementing the full MediKiosk kiosk spec (`spec/kiosk.md`) into `/Users/yuvraj/Study/DEV/SIH/Medikiosk` (branch `feat/anatomy-voice-clerk-1788750229`):
- 13-language Bhashini STT/TTS/NMT, WAV 16 kHz recorder
- Strict patient flow: Language Selection → Basic Patient Details → Anatomy Screen → AI Interview → Summary → OPD Booking
- Backend `/api/v1/kiosk/*` endpoints (done)
- Latest user directives: **body map in both kiosk files**, **Google Map for nearby hospitals**, **AI chooses the relevant hospital**

## Last session — what was done (DO NOT redo)

### Backend (COMPLETE + verified)
- `./venv/bin/pytest` → **58 passed, 3 warnings**; `./venv/bin/ruff check app tests` → all passed.
- `backend/app/config.py`: google_places_api_key, google_places_radius_m (10000), smtp_*, whatsapp_*.
- `backend/app/ai/asr_client.py`: all 13 langs mapped (ur→`ai4bharat/whisper-medium-ur--gpu--t4`, or/as→indo-aryan conformer).
- `backend/app/ai/tts_client.py`: all 13 mapped (ur→`indic-tts-coqui-misc-gpu--t4`).
- NEW `backend/app/ai/translation_client.py`: Bhashini NMT passthrough.
- NEW `backend/app/data/kiosk_data.py`: SUPPORTED_LANGUAGES (13), ALLOWED_BODY_PARTS, BODY_PART_DEPARTMENTS, DEMO_PARTNER_HOSPITALS (Bangalore H001–H005), DEMO_NON_PARTNER_HOSPITALS, OPD_TIME_SLOTS, INTERVIEW_QUESTION_BANK, EMERGENCY_KEYWORDS, MAX_INTERVIEW_QUESTIONS=7.
- NEW `backend/app/services/notifications.py`: send_email, send_whatsapp, notify_booking_confirmation.
- NEW `backend/app/routers/kiosk.py`: start-session, select-language, patient-details, select-body-part, ask-question, submit-response, interview-summary, nearby-hospitals (Google Places proxy), book-opd, external-booking-request. In-memory session store, lazy TTL prune.
- `backend/app/routers/outreach.py`: real SMTP send.
- `backend/app/main.py`: kiosk router registered.
- `.env.template`: GOOGLE_PLACES_API_KEY, GOOGLE_PLACES_RADIUS_M, SMTP_*, WHATSAPP_* added.
- `backend/tests/test_kiosk.py` (15 tests) + `backend/tests/test_bhashini.py` (13 langs incl ur test).

### Frontend (PARTIAL — resume here)
- `frontend/src/stores/index.ts`: `highContrast` + `toggleHighContrast` added to useUIStore.
- `frontend/src/App.tsx`: removed `/kiosk/ayush` route + KioskAyush lazy; root div gets `high-contrast` class; legacy routes (`/kiosk/identify`, `/kiosk/consent`, `/kiosk/body-map`, `/kiosk/interview`, `/kiosk/documents`, `/kiosk/summary`, `/kiosk/emergency`) all redirect to `/kiosk/anatomy`.
- `frontend/src/pages/kiosk/Home.tsx`: Accessibility + AYUSH buttons REMOVED; High Contrast toggle added (uses `Contrast` icon, `toggleHighContrast`).
- `frontend/src/lib/i18n.ts`: `LangCode` union = 13 (incl ur); `DICTS` is now `Partial<Record<LangCode, Dict>>` (8 non-core langs fall back to en); `APP_LANGS` = 13. Build NOT broken.

## Next steps (in order)

1. `frontend/src/pages/kiosk/LanguageSelect.tsx`
   - Add `ur` (اردو) to the LANGUAGES grid (currently 12) + LANGUAGE_FLAGS map.
   - On language select: request mic permission, call `kioskApi.startSession` + `selectLanguage`, persist `sessionId` (zustand kiosk store / sessionStorage), navigate to `/kiosk/anatomy` (currently goes to `/kiosk/identify`).
2. Rewrite `frontend/src/hooks/useVoiceRecorder.ts` — WAV/PCM 16 kHz mono (Web Audio API), 60s cap, 5s-silence auto-stop, <1s reject, gain hints.
3. Update `frontend/src/services/BhashiniService.ts` — ur/or/as service maps, confidence-returning STT, NMT translate.
4. NEW `frontend/src/api/client.ts` kioskApi methods: startSession, selectLanguage, patientDetails, selectBodyPart, askQuestion, submitResponse, interviewSummary, nearbyHospitals, bookOpd, externalBookingRequest.
5. `frontend/src/components/kiosk/AnatomyMap.tsx` — confirmation dialog ("You have selected: [body part]. Is this correct?" Yes/No), red-pulse on selected part, change-selection, multi-language labels. **Also add/enhance body map in `frontend/src/pages/kiosk/BodyMap.tsx`** (body map in BOTH kiosk files).
6. `frontend/src/components/kiosk/VoiceInterview.tsx` — rewire to backend kiosk endpoints (ask-question / submit-response / interview-summary), fix stale-closure question-count bug, auto-listen, thinking loader, low-confidence retry, severity.
7. `frontend/src/pages/kiosk/AnatomyFlow.tsx` — add Summary step before hospitals; use kiosk backend API + Bangalore demo data; partner booking via `/book-opd`, non-partner via `/external-booking-request`.
8. NEW `frontend/src/components/kiosk/MapView.tsx` — Google Maps JS API when `VITE_GOOGLE_MAPS_API_KEY`, else keyless iframe embed (`https://maps.google.com/maps?q=..&output=embed`). NEW hospital-recommendation logic: Gemini when `VITE_GEMINI_API_KEY`, else deterministic score (partner + department match + rating + distance).
9. `frontend/src/index.css` — `.high-contrast` block (black bg, white text, yellow primary, cyan borders 3px, min text sizes), red-pulse + waveform animations.
10. `frontend/.env.example` — VITE_GOOGLE_MAPS_API_KEY etc.
11. Verify: `npm run build` in frontend; update `frontend/e2e/kiosk.spec.ts` (currently expects old `/kiosk/body-map` → `/kiosk/interview`); rerun `ruff` + `pytest` in backend; update `database/seed.sql` with spec §8 Bangalore demo hospitals (still has Delhi data).

## Constraints / notes
- Strict spec WINS over old EXECUTION_PLAN: NO Accessibility button, NO AYUSH in kiosk; keep ONLY High Contrast (bg #000000, text #FFFFFF, primary #FFFF00 with black text, borders #00FFFF 3px, min 24px text / 32px headings, no gradients/shadows/transparency).
- 13 languages locked per session with explicit per-language error messages.
- Kiosk endpoints intentionally unauthenticated; staff screens keep Clerk.
- Frontend build check: `npm run build` (`tsc && vite build`); tsconfig has `noUnusedLocals: false`.
- `rg`/`find` unavailable in shell — use grep tool; scope searches to `backend/app` to avoid venv noise.
- Bhashini direct Dhruva compute URL: `https://dhruva-api.bhashini.gov.in/services/inference/pipeline`, `Authorization: <key>`, response in `pipelineResponse[0].output[0]`.
- Mock OPD slots: `["09:00","10:00","11:00","14:00","15:00"]`.
- Spec §8 hospitals are Bangalore; `database/seed.sql` still has Delhi data (update pending).

## Key files
- Backend: `backend/app/routers/kiosk.py`, `backend/app/data/kiosk_data.py`, `backend/app/services/notifications.py`, `backend/tests/test_kiosk.py`.
- Frontend (done): `frontend/src/App.tsx`, `frontend/src/stores/index.ts`, `frontend/src/pages/kiosk/Home.tsx`, `frontend/src/lib/i18n.ts`.
- Frontend (remaining): `pages/kiosk/LanguageSelect.tsx`, `pages/kiosk/AnatomyFlow.tsx`, `pages/kiosk/BodyMap.tsx`, `components/kiosk/AnatomyMap.tsx`, `components/kiosk/VoiceInterview.tsx`, `hooks/useVoiceRecorder.ts`, `services/BhashiniService.ts`, `api/client.ts`, `index.css`, `e2e/kiosk.spec.ts`.