# MediKiosk — Real-User Deployment Roadmap

This plan moves MediKiosk from **demo/mock mode → real, live product**: real patients, real doctors, real hospitals, real medical records. No fake logins, no placeholder data.

**Current state (what is real, what is not)**

| Area | Status |
| --- | --- |
| Frontend auth | Clerk **removed**. Login/Register now uses **Supabase Auth** (email/password). Still has a demo fallback when env vars are missing. |
| Backend auth | **Mock** — `POST /api/v1/auth/login` accepts any credentials and mints a JWT with the backend's secret. **This is the thing to delete.** |
| Backend → DB | Mixed: SQLAlchemy (Postgres) models + a half-migrated Supabase service-role layer. |
| Doctors / Hospitals / Patients | **Frontend mock data only** (`mockData.ts`, `mockService.ts`). Nothing real yet. |
| Documents | Saved to local `/tmp` — not yet on managed object storage. |
| Deployment | Render blueprint (backend) + Vercel (frontend) exist but are NOT wired to a live Supabase project. |

---

## Phase 0 — Security hardening (no new features; done mostly)

- [x] Clerk removed from frontend & backend (single identity provider going forward = Supabase).
- [x] Physician + advanced staff endpoints gated behind `require_role("physician")` / `require_staff()`.
- [x] Frontend: entry bundle cut 815 KB → 123 KB; vendor code-splitting; scroll jank fixed; Preloader trimmed.
- [ ] Wire the remaining routers (`patients`, `sessions`, `documents`, `summaries`, `consent`, `voice`, `abdm`, `ai`) — keep kiosk walk-up endpoints public **by design** (documented), gate staff/PHI reads.
- [ ] Delete `POST /api/v1/auth/login` (mock) once server-side Supabase verification (Phase 1) lands.
- [ ] Harden document upload: size cap, MIME/extension allowlist, session ownership, object-storage routing.
- [ ] Force `APP_DEBUG=false` + strict `CORS_ORIGINS` in production (config already clamps on `APP_ENV=production`).

## Phase 1 — One real identity system (Supabase = single source of truth)

**Goal: the only way "in" is a real Supabase account. The backend trusts Supabase, not its own mock.**

1. Backend verifies every bearer token against **Supabase** (`GET {project}/auth/v1/user` + short cache), never the mock secret.
2. Roles ride on the Supabase user's `user_metadata`:
   - `patient` → `/patient/*`
   - `doctor` → `/doctor/*`
   - `hospital_admin` → `/hospital/*`
3. Staff that have claimed a role are real, verified accounts (see Phase 3).
4. `getRoleRedirect`, route guards, and `ProtectedRoute` already key off the Supabase user's role — no frontend rework needed beyond removing the demo fallback.
5. Delete the mock login endpoint + legacy HS256 fallback in production.

**You do (in the meantime):**
- Create a Supabase project (free tier). Grab `Project URL`, `anon key`, `service_role key`.
- In Auth settings: enable email/password; set the redirect/`siteURL` to your Vercel domain + `http://localhost:5173` for dev.
- Run `supabase/schema.sql` when the data layer is wired (Phase 2) — it creates `profiles`, hospitals, doctors, and RLS.

## Phase 2 — Real data + storage

1. Supabase Postgres + PostgREST becomes the source of truth (backed by `supabase/schema.sql`).
2. Replace the SQLAlchemy mock reads in the kiosk/dashboards with real Supabase queries through the existing service-role client.
3. Documents go to **Supabase Storage** (private bucket + signed URLs) or an S3/MinIO bucket — no `/tmp`.
4. `profiles` table holds real user data per role; doctors link to `hospitals`; patients link to `sessions`, `documents`, `summaries`.

**You do (in the meantime):**
- Run `supabase/schema.sql` in the SQL editor.
- Create a private storage bucket `medikiosk-documents` and set the RLS rules from the schema.
- Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to:
  - `.env` (local) — already has the service role key
  - Render service env vars
  - Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for the frontend)

## Phase 3 — Real users: hospitals, doctors, patients

1. **Hospital admin onboarding** — admin account + `hospitals` registration form (name, address, phone, registration number). Only verified hospital admins can add doctors.
2. **Doctor onboarding** — under a hospital; fields: qualification, specialization, license number. (Optional: license-number verification webhook.)
3. **Patient registration** — email/password + profile (DOB, gender, blood group, ABHA optional). Existing kiosk walk-up still works without login; its data anchors to a patient profile when one is created.
4. No more `mockData`/`mockService` in those screens; every list/queue is real Supabase data.

**You do (in the meantime):**
- Create **test accounts for each role** in your Supabase project:
  1. a hospital admin (`hospital_admin`),
  2. a doctor under that hospital (`doctor`),
  3. a patient (`patient`).
- Fill in the doctor license number + hospital registration number with realistic (or sandbox) values.

## Phase 4 — Real clinical journey

1. OPD booking → appointments with real doctors/slots/hospitals.
2. Kiosk interview creates a real session tied to the patient profile.
3. Physician review, queue, prescriptions (OCR), clinical summary end-to-end.
4. ABHA/ABDM integration (FHIR push) with sandbox creds.

**You do (in the meantime):**
- Get **ABDM sandbox credentials** from `https://sandbox.abdm.gov.in` (client id + secret).
- Get a **Gemini API key** (already supported via `GEMINI_API_KEY`).
- Get **Bhashini** ASR/TTS keys (or confirm Gemini fallback is enough for launch).

## Phase 5 — Go live / ops

1. Render backend (the blueprint is already Python-correct) + Vercel frontend with `/api` proxy to Render.
2. `APP_ENV=production`, `APP_DEBUG=false`, production `CORS_ORIGINS` = your Vercel domain.
3. Monitoring, structured logs, DB backups, DPDPA retention (already scaffolded) active.

---

## What YOU should do in the meantime (single checklist)

> Do these now — they are prerequisites I can't create for you (only you can create accounts/projects).

- [ ] **Supabase project**: URL, anon key, service-role key.
- [ ] **Run `supabase/schema.sql`** in the Supabase SQL editor.
- [ ] **Storage bucket** `medikiosk-documents` (private) + RLS policies (in schema).
- [ ] **3 test accounts** with the right `user_metadata.role` (`hospital_admin`, `doctor`, `patient`).
- [ ] **ABDM sandbox** client id/secret.
- [ ] **Gemini API key** (+ Bhashini keys if used).
- [ ] **Vercel project**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.
- [ ] **Render service**: recreate/verify blueprint with Root Directory `backend`; set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_DEBUG=false`, production `CORS_ORIGINS`, `APP_SECRET_KEY`/`JWT_SECRET_KEY` (generated), plus third-party keys.
- [ ] Authorize me to flip off the demo fallbacks once Phase 1 verification passes.

## What I'll build next

Start with **Phase 0 → 1** (they're combined anyway):

1. Server-side Supabase token verification + single login flow (delete mock login).
2. Wire guards onto every non-public router; document why kiosk endpoints stay public.
3. Harden document upload (size/MIME/ownership/storage).
4. Enforce `APP_DEBUG=false` + strict CORS in prod config.
5. Add `tests/test_auth_wiring.py` (401s on non-public routes, one real login flow) and run the full suite + `ruff`.