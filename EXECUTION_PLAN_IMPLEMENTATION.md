# MediKiosk — Execution & Implementation Plan

**Sprint:** Anatomy Interview + Bhashini Voice Fix + Non-Partner Booking + Clerk Auth + Production Blockers
**Status:** In progress
**Branch:** `feat/anatomy-voice-clerk-*`
**Rules:** Ayush stays untouched · High contrast fully removed · Clerk activated

---

## 0. Current-State Audit (verified against repo)

| Area | State |
|---|---|
| Auth (frontend) | `@supabase/supabase-js` via `stores/authStore.ts`; Clerk NOT wired |
| Auth (backend) | `app/middleware/clerk_auth.py` — Clerk JWKS verification fully written but **dormant** (`CLERK_ISSUER` blank). Supabase GoTrue verification is the active path; legacy HS256 for dev/tests |
| Schema | Canonical file: `supabase/schema.sql` (NOT `database/schema.sql`). `database/` only holds old Mediflow schemas |
| RLS | Enabled on 9 core tables; no policies for hospitals/departments/doctors/slots/visits |
| Voice | Backend proxy (`/api/v1/voice/transcribe` + `/tts`) uses **direct Dhruva compute** (verified 2026). Frontend `BhashiniService.ts` proxies to it |
| High contrast | `stores/index.ts`, `index.css`, `KioskLayout.tsx`, `KioskMode.tsx`, `Home.tsx`, `InteractiveBodyMap.tsx` |
| Ayush | `pages/kiosk/AyushAssessment.tsx`, `ayush_mode` CSS — **do not touch** |
| Env keys | `BHASHINI_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_URL` set; `CLERK_ISSUER`, `CLERK_JWKS_URL` blank |

### Key adaptations vs. original sprint doc (justified)
1. **Schema file path** → append new tables/RLS to `supabase/schema.sql` (the real canonical schema).
2. **Clerk activation is key-gated** → Clerk code + provider are fully wired, but only activate when real Clerk keys exist. Until then the existing Supabase-auth demo keeps working (same graceful-degradation pattern used across the repo). No keys → no hard crash.
3. **Backend auth module** → create `backend/app/core/auth.py` exposing the plan's API (`verify_clerk_token`, `require_staff`, `require_role`) but built **on the existing proven verifier** (`middleware/clerk_auth.get_current_user`) rather than a second divergent PyJWT path.
4. **Bhashini `lib/bhashini.ts`** → direct Dhruva compute flow (verified working), NOT the ULCA `getModelsPipeline` "discover" flow that 500s on the 2026 platform. Mirrors `asr_client.py`/`tts_client.py` request shapes exactly.
5. **Outreach POST** → requires any *authenticated* user (a patient must be able to submit). The pending/staff listings require staff.
6. **`patients` RLS** → this repo's `patients.id` == auth user id (no separate `user_id` column), so policies use `auth.uid() = id`.
7. **`profiles`** → already exists with proper schema; we only add RLS policies, never recreate.

---

## Hour 0 — Pre-Flight ✅

- [x] Backup schema → `supabase/schema_backup_*` + `database/mediflow_schema_backup_*`
- [x] Feature branch `feat/anatomy-voice-clerk-*`
- [x] `npm install @clerk/clerk-react` (frontend)
- [x] `pip install "pyjwt[crypto]"` (backend; already present)

**Env vars to add (when keys are issued):**
```
# frontend/.env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_BHASHINI_API_KEY=...
VITE_GEMINI_API_KEY=...
# .env (backend via config.py)
CLERK_ISSUER=https://clerk.yourdomain.com
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://clerk.yourdomain.com/.well-known/jwks.json
```

---

## Hour 1 — Production Blockers (Schema + Seed + Clerk)

### 1.1 `supabase/schema.sql` — append
- New tables: `hospitals`, `departments`, `doctors`, `opd_slots`, `visits`, `interviews`, `outreach_requests` (feature tables)
- RLS on all tables incl. new ones + `profiles`
- Policies:
  - `patients_select_own` (USING `auth.uid() = id`), `patients_insert_own`
  - `sessions_*`, `messages_*`, `interviews_*`, `outreach_*` (own-row)
  - `hospitals/departments/doctors/opd_slots` → readable by any `authenticated`
  - `visits` → patient own + hospital_admin via profile
  - `profiles` → select/update own
- Security fixes: function `search_path` + revoke anon/authenticated execute on sensitive functions

### 1.2 `database/seed.sql` — new
Seed 3 hospitals, departments, doctors, and 3 days of OPD slots.

### 1.3 Clerk frontend
- `frontend/src/main.tsx`: conditional `ClerkProvider` when `VITE_CLERK_PUBLISHABLE_KEY` set (never throws — graceful).

### 1.4 Clerk backend
- `backend/app/core/auth.py`: `verify_clerk_token`, `require_staff`, `require_role` built on `middleware/clerk_auth`.
- `backend/app/config.py`: already has `clerk_issuer`, `clerk_jwks_url` fields. ✅

---

## Hour 2 — Anatomy Body Map
- `frontend/src/components/kiosk/AnatomyMap.tsx` — self-contained SVG anatomy map (no highContrast prop).

## Hour 3 — Voice Fix + Bhashini Pipeline
- `frontend/src/hooks/useVoiceRecorder.ts` — fixed MediaRecorder (mime fallback, sampleRate, cleanup, error).
- `frontend/src/lib/bhashini.ts` — direct Dhruva compute ASR/TTS + translation (with browser fallback).
- `frontend/src/components/kiosk/VoiceInterview.tsx` — Gemini-driven triage dialogue, Bhashini TTS, recorder.

## Hour 4 — Non-Partner Booking + Outreach
- `backend/app/routers/outreach.py` — POST `/api/v1/outreach/request`, confirm, pending list; Gemini email draft.
- `backend/app/main.py` — include router.
- `frontend/src/components/kiosk/NonPartnerBooking.tsx` — date/time/consent UI → POST with Clerk token.

## Hour 5 — Clerk Wiring + Integration + High-Contrast Removal
- `main.tsx` ClerkProvider + `App.tsx` kiosk flow route wiring (protected by Clerk when active).
- Remove high contrast from: `stores/index.ts`, `index.css`, `KioskLayout.tsx`, `KioskMode.tsx`, `Home.tsx`, `InteractiveBodyMap.tsx`.
- DO NOT touch `AyushAssessment.tsx` or `ayush-mode`.

---

## Final Checklist
- [x] Schema appended (new tables + RLS + security fixes)
- [x] `database/seed.sql` created
- [x] `@clerk/clerk-react` + `pyjwt[crypto]` installed
- [x] `main.tsx` ClerkProvider (key-gated)
- [x] `backend/app/core/auth.py` verifies Clerk JWT on the proven verifier chain
- [x] `AnatomyMap.tsx` created (no highContrast)
- [x] `useVoiceRecorder.ts` created (recording bug fixed)
- [x] `bhashini.ts` created (direct Dhruva compute ASR/TTS + Gemini NMT)
- [x] `VoiceInterview.tsx` created (no highContrast)
- [x] `outreach.py` wired into `main.py` (+ `/api/v1/webhooks/clerk/*`)
- [x] `NonPartnerBooking.tsx` created (no highContrast)
- [x] High contrast removed everywhere; Ayush untouched
- [x] `frontend` build passes; `backend` ruff passes; 41/41 tests pass

### Delivery notes
- New kiosk flow: `/kiosk/anatomy` → details → `AnatomyMap` → `VoiceInterview` → hospitals picker → `NonPartnerBooking`.
- Clerk activates with real keys:
  `VITE_CLERK_PUBLISHABLE_KEY` (frontend) + `CLERK_ISSUER`/`CLERK_JWKS_URL` (backend `.env`).
- Bhashini inference key (`VITE_BHASHINI_API_KEY`) enables real ASR/TTS; without it the browser Web Speech + deterministic mock keep the demo flowing.
- Functions/revokes in the linter-fix block are guarded with `DO $$` so they are safe even when legacy Mediflow functions aren't present.
- New tables are `CREATE TABLE IF NOT EXISTS`; `hospitals/departments/doctors/opd_slots/visits/profiles` were previously dropped+recreated in this schema file.