# MediKiosk Kiosk Specification & Parity Map

This document is the single source of truth for the public health kiosk flow. It
maps every spec requirement to its implementation (frontend → backend → data)
so future changes can be checked for parity.

## 1. Scope

The public kiosk is a self-service, voice-first health-check terminal available
in 13 Indian languages. It is NOT the patient portal (the patient-facing ward
terminal is a separate surface under `/patient`).

- Kiosk routes are served under `/kiosk/home`.
- Legacy fragmented routes (`/kiosk/identify`, `/kiosk/consent`, `/kiosk/body-map`,
  `/kiosk/interview`, `/kiosk/documents`, `/kiosk/summary`, `/kiosk/emergency`)
  all redirect into the combined flow at `/kiosk/anatomy` (see `frontend/src/App.tsx`).

## 2. Journey

```
Home (-/kiosk/home)
  → Language (-/kiosk/language)         [13 languages]
  → AnatomyFlow (-/kiosk/anatomy)
      1. Patient details (name, phone, age, gender)
      2. Body map (9 body parts + organ picker)
      3. Voice interview (5–8 questions, ASR→Gemini/NMT→TTS)
      4. Summary (department, summary, conversation)
          → non-emergency → hospitals → date/slot → book
          → EMERGENCY     → emergency screen (ambulance + nearest ER, NO OPD booking)
```

Implementation: `frontend/src/pages/kiosk/AnatomyFlow.tsx`, `src/components/kiosk/`.

## 3. Language (13 production languages)

`en, hi, bn, te, mr, ta, gu, kn, ml, pa, or, as, ur` — matches
`backend/app/data/kiosk_data.py:SUPPORTED_LANGUAGES` and the NMT/ASR/TTS clients.

- UI copy: `frontend/src/lib/kioskI18n.ts` (13 languages).
- Body-map labels: `frontend/src/components/kiosk/AnatomyMap.tsx` (13 languages).
- Speech ASR/TTS: `backend/app/ai/asr_client.py`, `tts_client.py`.
- NMT translation: `backend/app/ai/translation_client.py` (+ proxy `POST /api/v1/voice/translate`).
- Never dead-end: missing credentials/upstream failures degrade to passthrough.

## 4. Accessibility

Kiosk surfaces implement **High Contrast** only (there is NO "Easy Read" /
low-literacy toggle anywhere in the kiosk):

| Token      | Value                          |
|------------|--------------------------------|
| Background | `#000000`                      |
| Text       | `#FFFFFF`                      |
| Primary    | `#FFFF00` w/ black text        |
| Borders    | `#00FFFF`, ≥3px                |
| Min text   | 24px; headings 32px            |

- Global overrides: `frontend/src/index.css` (`.high-contrast`, lines ~698+).
- Toggle (`A`/`AA`) is persisted via `useUIStore().highContrast` and rendered in
  `AnatomyFlow` (fixed top-right) and the public kiosk Home header.
- The patient-portal kiosk lander (`pages/patient/KioskMode.tsx`) also offers the
  High Contrast toggle instead of the removed "Easy Read" button.

## 5. Emergency (red-flag) routing

Backend: `backend/app/routers/kiosk.py`

- Rule-based + Gemini severity/emergency detection runs on every `submit-response`.
- Emergency sessions return `status: "emergency"` + localized `emergency_message`.

Frontend: `AnatomyFlow.tsx` branches to a dedicated **emergency step**:

- "🚨 Emergency detected — visit the ER immediately".
- Call 108/112 CTAs (`tel:` links).
- "Find Nearest Emergency Room" → `GET /api/v1/kiosk/nearby-hospitals`,
  sorted by distance, each hospital offers a call button.
- NO date/slot OPD booking is shown on the emergency path.

## 6. Hospitals & booking

- Partners: `backend/app/data/kiosk_data.py` (Bengaluru H001–H005) and
  `database/seed.sql` (same five).
- Google Places nearby (when `GOOGLE_PLACES_API_KEY` is set): `_places_nearby` in
  `backend/app/routers/kiosk.py` merges non-partner hospitals into `nearby-hospitals`.
- Partner booking: `POST /api/v1/kiosk/book-opd`; non-partner: `external-booking-request`.
- Offline fallback: frontend `AnatomyFlow` falls back to demo hospitals and demo booking.

## 7. Data parity

`database/` must stay consistent with `backend/app/data/kiosk_data.py`:

- `seed.sql` — Bengaluru partners (H001–H005), includes departments/doctors/slots.
- `mediflow_schema.sql` + backup — same Bengaluru `City Heart Hospital` demo row.
- Legacy Delhi references intentionally removed (audit: `grep -i delhi database/ supabase/` → empty).

## 8. Test parity

- Backend pytest: `backend/tests/` — `test_kiosk.py` (API journey),
  `test_bhashini.py` (all 13 langs + `/voice/translate` proxy), etc. Run:
  `cd backend && ./venv/bin/ruff check app tests && ./venv/bin/pytest`.
- Backend smoke (live, non-Postgres parts): `backend/scripts/smoke_test.py` —
  includes the full kiosk journey + `/voice/translate`.
- Frontend e2e (Playwright, offline): `frontend/e2e/kiosk.spec.ts`. Run:
  `cd frontend && npx playwright test`. Wired into CI in `.github/workflows/test.yml`.
- CI: backend job (pytest + ruff) and frontend job (tsc + build + Playwright chromium).

## 9. Verifying locally

```bash
# backend
cd backend
./venv/bin/ruff check app tests && ./venv/bin/pytest

# frontend
cd frontend
npm run build          # runs tsc + vite build
npx playwright test    # e2e smoke (offline)

# live API smoke (start backend first)
cd backend && ./venv/bin/uvicorn app.main:app --port 8000
./venv/bin/python scripts/smoke_test.py --skip-db
```