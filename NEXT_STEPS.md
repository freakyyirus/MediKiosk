# MediKiosk — What's Done, What's Remaining, and How to Do It

> Companion to the latest round of changes. It covers (1) what was just shipped,
> (2) the exact steps to deploy the backend on **Render** and the frontend on
> **Vercel**, (3) the Supabase setup steps, and (4) the remaining roadmap items.

---

## 1. What was just completed

### Clerk removed (frontend is now 100% Supabase)
- `@clerk/clerk-react` removed from `frontend/package.json` + lockfile; `lenis` added.
- Deleted `frontend/src/lib/clerk.ts` and `frontend/src/components/auth/ClerkBridge.tsx`.
- `frontend/src/main.tsx` renders plain `<BrowserRouter>` — no `ClerkProvider`.
- `frontend/src/stores/authStore.ts` — all Clerk branches/types (`ClerkUserLike`,
  `syncFromClerk`, `clerkInstance`, etc.) removed. Login/logout/fetch/profile all
  Supabase-only, demo-mock fallback preserved (`isSupabaseConfigured`).
- `frontend/src/pages/auth/LoginPage.tsx` and `RegisterPage.tsx` — Clerk forwarders,
  refs, UI (email verification-code step) and `clerkEnabled` branches removed.
- `frontend/src/App.tsx` — `HomeRedirect` deleted; `/` always renders `LandingPage`.
- `frontend/src/pages/landing/PrivacyPolicy.tsx` no longer mentions Clerk.
- `frontend/.env` — `VITE_CLERK_PUBLISHABLE_KEY` removed.
- Backend Clerk disabled: `CLERK_ISSUER=` / `CLERK_JWKS_URL=` blanked in `.env` and
  `.env.template`; backend now verifies the legacy HS256 JWT from
  `POST /api/v1/auth/login` (Clerk JWKS code stays dormant in
  `backend/app/middleware/clerk_auth.py`).
- Docs updated: `README.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `ROUTING_FIX.md`.

### Landing → Auth → Portal flow (fixed)
- `/` is always the landing page; portals are reached via role-aware buttons.
- Back-button replay: leaving the landing page saves your scroll position; pressing
  **Back** to `/` re-shows the Preloader, then restores exactly where you were.
  (Implemented in `frontend/src/lib/navigationController.ts`).
- Back-button inside the landing (between sections) scrolls smoothly to the anchor —
  it does **not** re-trigger the loader.

### Smooth scrolling (Lenis + GSAP)
- `frontend/src/lib/smoothScroll.ts` — Lenis singleton driven by GSAP's ticker,
  synced with ScrollTrigger, honors `prefers-reduced-motion`, disposes cleanly.
- `frontend/src/index.css` — Lenis required CSS (`html.lenis`, `.lenis-stopped`, etc.).
- `frontend/src/pages/landing/Nav.tsx` — mobile drawer now calls `lockScroll()` /
  `unlockScroll()` (freezes Lenis + body scroll) and marks its nav `data-lenis-prevent`.

### Render deployment (config already correct — apply it)
- `render.yaml` is a **Python** runtime blueprint: `rootDir: backend`,
  `build: pip install -r requirements.txt`,
  `start: uvicorn app.main:app --host 0.0.0.0 --port $PORT`,
  `healthCheckPath: /health`.
- Supabase env placeholders (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET=medikiosk-documents`) added.
- The `npm start` failure you saw is because the service was created as a **Node**
  service (or from the repo root) — Render couldn't find a root `package.json`.
  There is intentionally **no** root `package.json`. See §2.

---

## 2. Deploy the backend on Render (detailed how-to)

### Option A — Blueprint (recommended, reproducible)
1. Push the current repo to GitHub (`main`).
2. Render Dashboard → **Blueprints** → **New Blueprint Instance** → connect repo.
3. Render reads `render.yaml`. Review the `medikiosk-backend` service and **Apply**.
4. Render will ask you to fill the `sync: false` env vars (see §3). Save + deploy.

### Option B — Manual Web Service
1. Render Dashboard → **New** → **Web Service** → connect repo.
2. **Runtime/Environment:** choose **Python 3** (or `Docker` if you later add a
   `Dockerfile` for EasyOCR). Do **not** choose Node/npm.
3. **Root Directory:** `backend`  ← this is the fix for the `package.json` ENOENT.
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. **Health Check Path:** `/health` (Render-safe; the app also serves `/api/v1/health`).
7. Auto-deploy on push: on. Instance type: Free is fine to start (OCR/ML endpoints need
   more RAM — see §2 note).
8. Add env vars (§3), then **Create Web Service**.

> Render note — OCR/ML endpoints (`/advanced/ocr/*`, `/advanced/ml/*`) pull heavy
> deps (EasyOCR/PyTorch) and run long jobs. On the free tier, first request may be
> slow/timeout. Start free; move to a paid instance (Starter ~$7/mo, 512 MB–2 GB) if
> you rely on them. Tesseract `TESSERACT_CMD=/usr/bin/tesseract` is bundled on
> Render's Python image.

---

## 3. Environment variables (fill these)

### In Render (backend `medikiosk-backend`)
| Variable | Value |
|---|---|
| `PYTHON_VERSION` | `3.14.0` (already in render.yaml) |
| `APP_SECRET_KEY` | auto-generated (already generating) |
| `JWT_SECRET_KEY` | auto-generated, or paste a long random string |
| `CORS_ORIGINS` | `https://<your-vercel-app>.vercel.app,http://localhost:5173,http://localhost:3000` |
| `SUPABASE_URL` | `https://vrtzdlcvkcaqchudsrsf.supabase.co` |
| `SUPABASE_ANON_KEY` | your Supabase **anon** (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase **service_role** key (keep secret) |
| `SUPABASE_BUCKET` | `medikiosk-documents` |
| `GEMINI_API_KEY` | your Google AI Studio key |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` (already default) |
| `BHASHINI_API_KEY` / `BHASHINI_ULCA_API_KEY` / `BHASHINI_USER_ID` | from bhashini.gov.in |
| `ABDM_CLIENT_ID` / `ABDM_CLIENT_SECRET` | from sandbox.abdm.gov.in (optional) |
| `LOG_LEVEL` / `LOG_FORMAT` | `INFO` / `json` |

Leave empty: `DATABASE_URL`, `POSTGRES_*`, `REDIS_URL`, `GOOGLE_CLOUD_VISION_API_KEY`,
`CLERK_ISSUER`, `CLERK_JWKS_URL` (Clerk removed).

### In Vercel (frontend)
| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://vrtzdlcvkcaqchudsrsf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your Supabase **anon** key |
| `VITE_API_URL` | `https://<your-render-backend>.onrender.com/api/v1` |

No `VITE_CLERK_PUBLISHABLE_KEY` — it no longer exists.

---

## 4. Supabase setup (do this once)

1. Open the Supabase Dashboard for the Tokyo project.
2. **SQL Editor** → new query → paste the contents of `supabase/schema.sql` → **Run**.
   (Creates the 9 backend tables + indexes. RLS stays off for service_role-backed calls;
   the schema applies RLS and revokes anon where PHI could leak.)
3. **Storage** → **New bucket** → name `medikiosk-documents`, **Private** bucket.
   File size cap 15 MB; allowed MIME types `image/png`, `image/jpeg`, `image/webp`,
   `application/pdf` (already enforced in the app + schema).
4. **Project Settings → API** — copy `service_role` (secret) into Render's
   `SUPABASE_SERVICE_ROLE_KEY` and the **anon** key into the frontend env.

---

## 5. Run locally (dev)

```bash
# Backend (repo root has the .env; backend/ has the venv)
cd backend
./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
#   → http://localhost:8000/health  (degraded is normal without local DB/Redis)

# Frontend
cd frontend
npm install         # done already for lenis
npm run dev         # → http://localhost:5173
```

Login: Supabase users (or, if you blank `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
in `frontend/.env`, the **Demo Mode** mock-login buttons on `/login`).

Verify: `frontend/$ npx tsc --noEmit && npm run build` · `backend/$ ./venv/bin/python -m pytest tests -q` (32 pass) · `ruff check app/`.

---

## 6. What's remaining / roadmap

### Blockers you must do (deployment)
- [ ] Apply the Render blueprint (or manual service per §2) — the `npm start` failure
      happens until the service is created as a **Python** service with
      **Root Directory = backend**.
- [ ] Fill Render env vars (§3) — especially `SUPABASE_SERVICE_ROLE_KEY`,
      `CORS_ORIGINS` with your real Vercel URL, and `VITE_API_URL` on Vercel pointing
      to the deployed Render backend.
- [ ] Run `supabase/schema.sql` + create the private `medikiosk-documents` bucket (§4).

### Backend / infra follow-ups
- [ ] **Local Postgres/Redis/MinIO are down** — `/health` shows `degraded` locally
      (expected). `docker compose up` (the repo has a compose file) or rely on
      Supabase. `app/data/supabase_client.py` is wired (degraded → live now that
      `SUPABASE_SERVICE_ROLE_KEY` is set) but **routers still use SQLAlchemy
      `get_db`** — migrating kiosk/session/voice/document writes to Supabase Storage is
      the natural next step.
- [ ] **Document/OCR storage**: `documentApi.upload` posts to MinIO-backed
      `/documents/upload`. On Render there is no MinIO — decide: keep MinIO via Docker,
      or route documents to the Supabase private bucket (recommended; code scaffolding
      `supabase_client.upload_file` already exists).
- [ ] **OCR on free instance**: EasyOCR/PyTorch packages inflate build time & RAM.
      Consider a `Dockerfile` (pip deps + tesseract) and a paid instance before relying
      on `/advanced/ocr/*`.
- [ ] **ABDM**: only sandbox client creds are set. Full ABHA consent/artifact loop
      needs a registered HIP (`X-HIP-ID`) and callback endpoints.

### Product / polish
- [ ] Seed real demo data into Supabase (hospitals, doctors, departments, OPD slots)
      so sign-ups don't fall back to mock data.
- [ ] Re-run `npm run test:e2e` (Playwright) after deploy — specs already cover
      landing `/`, kiosk flow and portal guard → `/login`.
- [ ] Update `DEPLOYMENT.md` "Railway" references if you standardize on Render.