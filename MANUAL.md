# MANUAL.md — What You Must Do By Hand

This file lists everything that **cannot be automated** and requires your manual action.

---

## ✅ Already Done By the Assistant (do NOT redo)

These have been fixed automatically in this session:

- **Mock auth removed** — confirmed `POST /api/v1/auth/login` no longer exists; no auth router is wired in `main.py`.
- **Dockerfile** added (Python 3.14-slim, tesseract, libgl1, multi-stage build for the heavy OCR/PyTorch image).
- **.dockerignore** added.
- **LICENSE** added (MIT, referenced by README).
- **Python version aligned** — README badge, render.yaml, and CI all now target Python 3.14 to match the pip-compiled `requirements.txt`.
- **`DATABASE_URL` now honored** — `backend/app/config.py` prefers `DATABASE_URL` over `POSTGRES_*` components (previously it was ignored on Render/Railway).
- **Build errors fixed** — `Identification.tsx` was missing the `kt` import; `BookOPD.tsx` had a type mismatch with `OpdDraftHospital` and missing Google Maps typings. `npm run build` is green.
- **Makefile `test`/`lint` targets fixed** — they called `npm test` / `npm run lint` which don't exist; now use `npm run test:e2e` and `tsc --noEmit`.
- **Playwright artifacts** — `frontend/test-results/` is now gitignored and untracked.
- **Verification** — backend `62 passed`, `ruff check` clean, frontend `tsc + vite build` green.

---

## 1. Commit Everything (CRITICAL)

Your working tree has ~34 modified + ~25 untracked files (the entire kiosk flow, voice, anatomy, i18n, etc.). **Every deploy doc depends on this.**

```bash
git add -A
git commit -m "feat: complete kiosk flow — anatomy, voice, i18n, map, booking"
git push origin feat/anatomy-voice-clerk-1788750229
```

---

## 2. Mock Auth — Already Removed ✅

Verified: no `/api/v1/auth/login` endpoint exists; no auth router is registered. Just do a final sweep:

```bash
grep -r "auth/login" frontend/src/ backend/app/ || echo "clean"
```

---

## 3. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → your project → SQL Editor
2. Run `supabase/schema.sql` (the full schema)
3. Run `database/seed.sql` (Bengaluru demo hospitals)
4. Note your project URL, anon key, and service_role key
5. Set **RLS policies** — the kiosk needs `anon` role to read `hospitals`, `departments`, `doctors`, `opd_slots`. Current policies require `authenticated`.

---

## 4. Deploy Frontend to Vercel

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

- Set env var: `VITE_SUPABASE_URL` = your Supabase project URL
- Set env var: `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
- Set env var: `VITE_API_URL` = your backend URL (e.g. `https://medikiosk-backend.onrender.com`)
- Set env var: `VITE_GOOGLE_MAPS_API_KEY` = your Google Maps JS key

---

## 5. Deploy Backend to Render (Dockerfile provided)

The root `Dockerfile` and updated `render.yaml` are ready. Use the blueprint:

1. Go to [render.com](https://render.com) → **Blueprints** → **New Blueprint Instance**
2. Select this repo — Render reads `render.yaml`
3. Set the `sync: false` env vars in the dashboard (values from your `.env`):
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (Supabase Postgres connection string — preferred over `POSTGRES_*`)
   - `BHASHINI_API_KEY`, `BHASHINI_ULCA_API_KEY`, `BHASHINI_USER_ID`
   - `GEMINI_API_KEY`
   - `CORS_ORIGINS` = your Vercel frontend URL
4. Fill `JWT_SECRET_KEY` and `APP_SECRET_KEY` (Render auto-generates them; override if you want fixed values)

> **Note:** `render.yaml` now pins `plan: starter` (~$7/mo) because EasyOCR/PyTorch needs ~1.5-2 GB RAM. The old free tier (512 MB) will crash on OCR. Without OCR the app still degrades gracefully.

---

## 6. Configure Google Cloud

1. Enable **Google Places API** (for nearby hospital discovery)
2. Enable billing on your GCP project
3. Set `GOOGLE_PLACES_API_KEY` in both backend env and frontend env

---

## 7. Configure Bhashini (Voice)

1. Register at [bhashini.gov.in](https://bhashini.gov.in)
2. Get your API key and UCIL/ULCA key
3. Set `BHASHINI_API_KEY`, `BHASHINI_ULCA_API_KEY`, `BHASHINI_USER_ID` in backend env

---

## 8. Configure Gemini (AI)

1. Get API key from [ai.google.dev](https://ai.google.dev)
2. Set `GEMINI_API_KEY` in backend env

---

## 9. Configure Email (Optional)

For booking confirmations and hospital outreach emails:

1. Set up SMTP credentials (Gmail app password, SendGrid, etc.)
2. Set in backend env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

Without SMTP, emails are logged to the server log but not delivered.

---

## 10. Configure WhatsApp (Optional)

For patient booking confirmations via WhatsApp:

1. Set up WhatsApp Business API provider
2. Set: `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`, `WHATSAPP_FROM_PHONE`

---

## 11. Wire Voice UI

The Bhashini service exists but the kiosk "Tap to Speak" is still placeholder text in `VoiceInterview.tsx`. You need to:

1. Connect the microphone recording to `BhashiniService`
2. Wire ASR (speech-to-text) results to the interview flow
3. Wire TTS for question playback
4. Test with actual audio hardware on the kiosk

---

## 12. Fix Patient Identity Flow

The kiosk currently generates fake `kiosk-<timestamp>` patient IDs. The outreach service silently nulls these. You need to:

1. Decide: use Supabase Auth (anon kiosk sessions) or create anonymous patient rows
2. Update `kioskApi.startSession()` to persist a real patient row
3. Link interviews and outreach requests to the real patient ID

---

## 13. Hardware Testing (Kiosk)

If deploying on a Raspberry Pi:

1. Test touchscreen responsiveness
2. Test microphone input (USB mic or built-in)
3. Test camera for document capture
4. Set up kiosk mode (Chromium fullscreen, auto-restart)
5. Test network connectivity (low-bandwidth scenario)

---

## 14. Domain & SSL

1. Point your domain to Vercel (frontend)
2. Point subdomain to Render (backend, e.g. `api.medikiosk.in`)
3. Update `CORS_ORIGINS` in backend to include your production frontend URL

---

## 15. Run Lint & Typecheck

After I make my fixes, verify everything passes:

```bash
# Backend
cd backend && ruff check . && ruff format --check .

# Frontend
cd frontend && npm run build   # includes tsc --noEmit

# Full test suite
cd backend && pytest -v
```
