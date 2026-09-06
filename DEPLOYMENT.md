# MediKiosk — Production Deployment Runbook

Deploy target: **Vercel** (React/Vite frontend) + **Railway** (FastAPI backend) + **Supabase** (already live, Postgres).

> Read this top-to-bottom once before running anything. It includes the exact env vars, the
> container setup, and the post-deploy wiring (CORS, demo users) that make the demo work end-to-end.

---

## 0. Readiness check

The codebase is **deploy-ready** — verified on 5 Sep 2026:

- ✅ Frontend `tsc && vite build` passes clean
- ✅ Backend imports + all 11 routers mount; `/health` exposed
- ✅ DB: 20 tables live on Supabase with RLS; retention policies seeded
- ✅ ML: `ml_artifacts/priority_model.joblib` committed (7 MB, lazy-loaded)
- ✅ OCR is lazy + guarded (`tesseract` optional at load, `easyocr` on-demand)
- ✅ Redis is **not required** in production (unused by routers)
- ✅ Secrets: `.env` files are gitignored — only `.env.example` / `.env.template` are tracked
- ✅ `vercel.json` (SPA fallback rewrites) added
- ✅ API client now honors `VITE_API_URL` (absolute backend URL in prod, Vite proxy in dev)

Remaining work is **configuration, not code** (steps 1–5 below).

---

## 1. Prerequisites & accounts

| Service | Account you need | What to grab |
|---|---|---|
| GitHub | Existing (`freakyyirus/MediKiosk`) | Push access |
| Vercel | vercel.com | — (free tier OK) |
| Railway | railway.com | Container service (paid: starts ~$5/mo) |
| Supabase | Existing project (Tokyo) | `Project URL`, `anon key`, `service_role` key, Postgres host/port/password |
| Google AI Studio | aistudio.google.com | `GEMINI_API_KEY` |
| Bhashini (optional) | bhashini.gov.in | `BHASHINI_API_KEY` etc. |
| ABDM (optional/stretch) | sandbox.abdm.gov.in | `ABDM_CLIENT_ID/SECRET` |

**Note on Railway:** free trial credits are limited; a Hobby plan is recommended because the
Docker image (PyTorch/EasyOCR + tesseract) needs build time and ~4 GB RAM during OCR calls.

---

## 2. Push the code (do this first — nothing deploys before it)

Everything below is currently **uncommitted** working-tree state, so commit and push before
creating any deployment:

```bash
cd <path-to-repo>          # e.g. ~/MediKiosk
git add -A
git status            # eyeball: no .env, no dist/, no node_modules
git commit -m "Deploy: VITE_API_URL support, SPA rewrites, hero polish"
git push origin main
```

Wait — confirm `.env` files are **not** in the staged list (they're ignored). If anything like
`backend/.env` sneaks in, unstage it before committing.

---

## 3. Supabase (database) — verify schema

The 20-table schema is already applied (PROJECT_STATUS.md). If you ever create a **fresh**
Supabase project, apply these SQL files via **SQL Editor** in this order:
`database/mediflow_schema.sql` then `database/medi_kiosk_advanced_features.sql`.

Gather the connection values → used in Railway env `POSTGRES_*`:

| Field | Where in Supabase |
|---|---|
| `POSTGRES_HOST` | Dashboard → Project Settings → Database → Host (e.g. `db.xxxx.supabase.co`) |
| `POSTGRES_PORT` | `5432` (or `6543` for pooler) |
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | Database settings → database password |
| `POSTGRES_DB` | `postgres` |

> The backend's `config.py` builds its connection string from the five `POSTGRES_*` vars — do
> **not** rely on a single `DATABASE_URL` (it is ignored by the app).

---

## 4. Backend → Railway

### 4.1 Add a Dockerfile (needed for tesseract + system libs)

Create `Dockerfile` at the repository root:

```dockerfile
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TESSERACT_CMD=/usr/bin/tesseract

# System deps: OCR engine + OpenCV runtime libs + ffmpeg (pydub audio)
RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr \
      tesseract-ocr-hin \
      libgl1 \
      libglib2.0-0 \
      ffmpeg \
      curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Install from pyproject (install_requires) — no dev extras in prod
RUN pip install --no-cache-dir ./backend

WORKDIR /app/backend
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

Also add a `.dockerignore` (root):

```
backend/venv
node_modules
frontend/node_modules
frontend/dist
*.env
.git
.DS_Store
```

> This image is large (~1.5–2 GB, PyTorch/EasyOCR) and the first build takes 3–6 minutes —
> normal. The `ml_artifacts/` folder is copied in as part of `COPY . .`.

### 4.2 Create the service

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** → select `MediKiosk`.
2. Railway auto-detects the `Dockerfile` → **Deploy**. Confirm the deploy config:
   - **Start command** (if Railway doesn't pick it from the CMD): `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Wait for the build to finish, then the service boots.

### 4.3 Env vars for the backend service (Variables tab)

| Variable | Example / source |
|---|---|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_SECRET_KEY` | random 32+ char string (`openssl rand -hex 32`) |
| `CORS_ORIGINS` | `https://<your-app>.vercel.app` (comma-separate if multiple) |
| `POSTGRES_HOST` | `db.xxxx.supabase.co` |
| `POSTGRES_PORT` | `5432` |
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | Supabase DB password |
| `POSTGRES_DB` | `postgres` |
| `JWT_SECRET_KEY` | random 32+ char string |
| `GEMINI_API_KEY` | from Google AI Studio |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` (default, no change needed) |
| `BHASHINI_API_KEY` / `BHASHINI_USER_ID` / `BHASHINI_ULCA_API_KEY` | optional — live ASR; falls back to browser speech if blank |
| `ABDM_CLIENT_ID` / `ABDM_CLIENT_SECRET` | optional — leave blank until ABDM wiring |
| `GOOGLE_CLOUD_VISION_API_KEY` | optional OCR fallback |
| `TESSERACT_CMD` | `/usr/bin/tesseract` (already set) |

> Deps you do **not** need on Railway: `REDIS_*`, `MINIO_*` (both are dev-only leftovers;
> Redis isn't used by any router).

### 4.4 Verify the backend

- Open the service's public domain → `https://<railway-host>.up.railway.app/health` → expect `200`.
- `https://<railway-host>.up.railway.app/docs` → Swagger loads.
- Test an AI call (Postman/cURL): `POST /api/v1/advanced/ml/predict-priority` with a JSON body
  (e.g. `{"age":58,"spo2":88,"pulse":110,"red_flag_count":1,"critical_symptom_count":1,"bp_systolic":150,"bp_diastolic":95}`) → expect `priority_class`.

---

## 5. Frontend → Vercel

### 5.1 Import the project

1. vercel.com → **Add New → Project** → import the same GitHub repo.
2. In **Root Directory** select `frontend`.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output dir `dist`.
4. **Deploy.** `vercel.json` is picked up automatically for SPA route fallback.

### 5.2 Env vars (Project → Settings → Environment Variables → Production)

| Variable | Example / source |
|---|---|
| `VITE_API_URL` | `https://<railway-host>.up.railway.app/api/v1` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

> Clerk has been removed from the frontend — there is no `VITE_CLERK_PUBLISHABLE_KEY` anymore.

> `VITE_API_URL` must end with `/api/v1` (the client appends nothing). It is **required** —
> without it the app calls `/api/v1` relative, which 404s on Vercel with no `/api` server.

Add these, then **Redeploy** so the values are baked into the build.

### 5.3 Post-deploy free-floating checks

1. Open `https://<your-app>.vercel.app` → landing loads, fonts/images render.
2. `Ctrl/Cmd+Shift+I` → Network: an XHR to `<railway>/api/v1/...` must return `200` (no CORS error). If CORS shows, re-save exactly the Vercel URL in `CORS_ORIGINS` and redeploy backend.
3. Run the kiosk demo journey (language → consent → interview → summary) against the live API.

---

## 6. Post-deploy demo setup (optional but recommended)

Use the Supabase **SQL Editor** to register the demo personas so the portals have data.

1. In the app, register 4 accounts: `admin@hospital.in`, `dr.sharma@hospital.in`,
   `npm@patient.in`, `sunita.patient@hospital.in` (any strong passwords).
2. Assign roles:

```sql
UPDATE profiles SET role=CASE
  WHEN email='admin@hospital.in'           THEN 'hospital_admin'
  WHEN email='dr.sharma@hospital.in'       THEN 'doctor'
  ELSE 'patient'
END
WHERE email IN ('admin@hospital.in','dr.sharma@hospital.in','npm@patient.in','sunita.patient@hospital.in');
```

Optional wiring:

- **Live ASR** — paste the Bhashini keys into Railway env and redeploy.
- **Camera QR scan** (`/doctor/scan-qr`) — requires HTTPS; both Vercel and Railway provide it. Tip on legacy browsers: enable `unifiedPlan`/camera flag.
- **ABDM / Health-ID** — stub only; add sandbox creds to Railway env when ready.

---

## 7. Architecture summary + costs

```
Browser ──HTTPS──► Vercel (static SPA, Supabase-js)
                      │  VITE_API_URL (absolute)
                      ▼
                 Railway / Render (FastAPI container: tesseract + EasyOCR + Gemini + ML)
                      │  asyncpg
                      ▼
                 Supabase Postgres (20 tables, RLS)
```

Costs (approx, per month): Vercel $0 · Railway ~$5 (Hobby) or Render (Free/Python) · Supabase ≈$0–$25 (free tier unless
you outgrow it).

---

## 8. Verification suite (run after both apps are live)

```bash
# 1) Backend API click-through — every router, incl. ML + F6 retention.
#    (DB-backed checks auto-run when Postgres is reachable; add --skip-db otherwise)
python backend/scripts/smoke_test.py --base https://<your-railway-domain>   # expects .../api/v1 already? no — pass the bare host
#    Actually: pass the Railway root — the script appends full paths itself:
python backend/scripts/smoke_test.py --base https://<your-railway-domain>

# 2) Frontend click-through — landing, kiosk language, kiosk body-map→interview,
#    and the protected-route redirect (mock data, no backend needed).
cd frontend && npx playwright install chromium   # once
npm run test:e2e                                  # builds + previews + runs 4 specs
```

Expected: backend prints `11/11 checks passed` (or all with DB) and exits 0;
Playwright prints `4 passed`.

---

## 8a. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `API Error [404]: No matching route` in console | `VITE_API_URL` missing/mis-typed — set it to `https://…up.railway.app/api/v1`, redeploy |
| CORS error on `/api/v1…` calls | `CORS_ORIGINS` on Railway doesn't include the exact Vercel origin (no trailing slash) |
| `/health` 200 but `/docs` 404 | You hit Vercel, not Railway — the backend route only exists on the Railway domain |
| Build fails at `pip install` on Railway | Missing `[build-system]` in `backend/pyproject.toml` — add `setuptools>=68` if your build complains |
| OCR endpoints error "tesseract not found" | `libgl1`/`tesseract-ocr` apt packages not installed — verify the Dockerfile incl. those lines |
| Backend boots but AI endpoints 500 | `GEMINI_API_KEY` blank on Railway — non-AI endpoints still work |
| Frontend renders but no images/icons | Hard refresh; if persists, check `VITE_SUPABASE_URL` — some assets load via Supabase storage |
| Slow first OCR call | EasyOCR downloads its detection/recognition models on first use (~90 MB) — run one OCR warm-up right after deploy |

---

## 9. Day-2 notes

- **Env changes require redeploys** on both platforms (not just Runtime variables on Railway — on Vercel they bake at build; on Railway they're runtime but a restart helps).
- **Rollback:** Vercel → Deployments → promote previous; Railway → right-click service → previous deploy.
- **Secrets hygiene:** never commit `.env`; rotate `APP_SECRET_KEY`/`JWT_SECRET_KEY` if ever leaked.
- Next up (non-blocking): ABDM wiring, real prescription-image OCR test, full-credentials E2E (hospital flows need an authenticated demo user).