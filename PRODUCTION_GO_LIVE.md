# MediKiosk — Production Go-Live Guide

Everything left between *"buildable demo"* and *"production"*, explained and
turned into step-by-step fixes. Each section maps 1:1 to the remaining work
breakdown:

| # | Item | Est. weight | Section |
|---|------|-------------|---------|
| 1 | Deploy schema + seed to a live Supabase | 8% | §1 |
| 2 | Configure real Clerk keys + test the full auth path | 8% | §2 |
| 3 | Wire the patient `user_id` claim flow | 7% | §3 |
| 4 | Bhashini (live key) + Gemini email + email/WhatsApp sender | 8% | §4 |
| 5 | RLS: anonymous kiosk can read the directory | 3% | §5 |
| 6 | CI, deployment config, secrets management, e2e tests | 6% | §6 |
|   | **Total remaining** | **~40%** | — |

---

## Architecture you must understand first

The repo has **two parallel backend stacks**. Don't confuse them:

1. **Supabase/PostgREST stack (new)**
   - Talks to PostgREST via the service-role key (`app/data/supabase_client.py`).
   - Used by `routers/outreach.py`, `routers/clerk_webhook.py`.
   - Rows live in `supabase/schema.sql` tables.
   - `service_role` bypasses RLS → the backend can always write.

2. **Direct SQLAlchemy/Postgres stack (older)**
   - Uses sync/async SQLAlchemy via `app.database.get_db` + `app/models/*`.
   - Used by `routers/patients.py`, `sessions.py`, `summaries.py`, etc.
   - Connects with `postgres_*` settings in `backend/app/config.py`.

Both write to the **same Supabase Postgres instance** (schema mirrors the SQLAlchemy
models). The patient claim flow (§3) has to reconcile the two.

**Identity caveat (critical):** RLS policies use `auth.uid()`, which resolves the
*Supabase* auth user — **not** Clerk's `sub` claim. Since every write already goes
through the backend with `service_role` (RLS-bypassing), the clean production model is:

- **All PHI writes → backend only** (already true).
- **RLS is defense-in-depth**, mainly to stop anonymous direct reads.
- Directory tables (hospitals/doctors/slots) are public-by-consent (§5).
- Never hand the Supabase anon key to anything that must read PHI.

---

## §1 — Deploy schema + seed to a live Supabase *(8%)*

### Why
The schema has never been run anywhere. Until it is, every DB-backed flow
(RLS, outreach, profiles, hospitals) is unverified.

### ⚠️ Warning
`supabase/schema.sql` is a **destructive full reset** — it `DROP TABLE ... CASCADE`s
every project table (lines 28–48). Run it ONLY on a **fresh Supabase project**.
For an existing database, extract the additive parts (sections 5–10) instead.

### Steps
1. Create a project at https://supabase.com (free tier is fine).
2. Dashboard → **Project Settings → API**:
   - Copy `Project URL` → `SUPABASE_URL`.
   - Copy `anon public key` → `SUPABASE_ANON_KEY` (frontend only).
   - Reveal + copy `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (backend only, never ship).
3. Dashboard → **SQL Editor → New query** → paste the full `supabase/schema.sql` → **Run**.
4. Fresh session → paste `database/seed.sql` → **Run**.
5. Create the storage bucket:
   `Dashboard → Storage → New bucket → medikiosk-documents` (private).
6. Verify with SQL:

```sql
SELECT count(*) FROM public.hospitals;                          -- 3
SELECT count(*) FROM public.doctors;                            -- 8
SELECT count(*) FROM public.opd_slots;                          -- 3 days x 6 x 8
SELECT count(*) FROM pg_policies WHERE tablename = 'patients';  -- 3
SELECT to_regclass('public.profiles'), to_regclass('public.outreach_requests');
```

7. Turn on the backend: put `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in
   `backend/.env` (root `.env` shared via `config.py`).
8. Turn on the frontend: put `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `frontend/.env`.
9. The startup warning *"running in degraded mode"* must disappear.

### Done when
You can run the backend locally, POST to `/api/v1/outreach/request`, and see a row
in `public.outreach_requests` from the Supabase table browser.

---

## §2 — Configure real Clerk keys + test the full auth path *(8%)*

### Why
Clerk is key-gated today (renders without `<ClerkProvider/>` when no
`VITE_CLERK_PUBLISHABLE_KEY`). Nothing has ever been tested against a real
Clerk instance.

### Two ordering traps in `app/middleware/clerk_auth.py`
- `_verify()` (line 110) checks **Supabase first when `SUPABASE_URL` + `SUPABASE_ANON_KEY` are set**.
  If both are set, Clerk tokens are rejected in production (the code never falls
  through to the Clerk branch — it fails closed instead).
- Supabase RLS `auth.uid()` ≠ Clerk `sub` (see Architecture section).

**Resolution for Clerk-first:** on the **backend**, set
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` **but leave `SUPABASE_ANON_KEY` empty**.
Then `supabase_auth_enabled()` is false and the Clerk branch is active in production.
The backend still reads/writes PostgREST with `service_role`.

### Steps
1. Clerk dashboard (https://dashboard.clerk.com) → **Create application**.
2. **API Keys** page:
   - `Publishable key` → `VITE_CLERK_PUBLISHABLE_KEY` in `frontend/.env`.
   - `Secret key` → `CLERK_SECRET_KEY` in `backend/.env`.
   - `Domains / Issuer` → `CLERK_ISSUER` (e.g. `https://your-app.clerk.accounts.dev`).
   - JWKS URL = `{CLERK_ISSUER}/.well-known/jwks.json` → `CLERK_JWKS_URL` (optional, derived).
3. Restart frontend: `<ClerkProvider/>` now renders (the key-gate flips on).
4. In the kiosk, Clerk's JS context now exists → `useAuth().getToken()` returns a real
   RS256 session token (already wired in `NonPartnerBooking.tsx`).

### Test the full path
```bash
# 1. Get a token from the browser (Sign up via Clerk) and export it
export TOKEN=<paste-session-token>
# 2. Hit a protected route
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/outreach/pending
# 3. Negative test — expired/garbage token must be 401
curl -H "Authorization: Bearer garbage" \
  http://localhost:8000/api/v1/outreach/pending        # expect 401
# 4. Registry creates a profile row automatically via webhook
```
5. Verify the profile row appears in `public.profiles` after signup.

### Webhook security (Svix signature) — the missing 2%
`clerk_webhook.py` is intentionally permissive. Add verification:

```bash
pip install svix
```

```python
# backend/app/routers/clerk_webhook.py
from svix.webhooks import Webhook, WebhookVerificationError
from app.config import get_settings

_webhook_secret = get_settings().clerk_secret_key

def _verify_raw(raw: bytes, headers: dict) -> dict:
    wh = Webhook(_webhook_secret)
    try:
        return wh.verify(raw, headers)
    except WebhookVerificationError as exc:
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

@router.post("/user-created")
async def clerk_user_created(request: Request):
    raw = await request.body()
    payload = _verify_raw(raw, dict(request.headers))
    ...
```

- Clerk dashboard → **Webhooks → Create endpoint** →
  `https://<api-host>/api/v1/webhooks/clerk/user-created`
  and `.../user-updated`; copy the **Signing Secret** into `CLERK_SECRET_KEY`
  (you may want two env vars: `CLERK_SECRET_KEY` for JWT, `CLERK_WEBHOOK_SECRET`
  for Svix — add the latter to `config.py`).

### Done when
Sign-up → webhook sync → profile row exists; protected GET returns 200 with a
valid token and 401 without; a forged webhook payload is rejected.

---

## §3 — Wire the patient `user_id` claim flow *(7%)*

### The problem
- `patients.id` is a **bigint** identity.
- Auth users are **UUID** strings.
- Today `AnatomyFlow` sets `patientId = "kiosk-<timestamp>"`, which
  `outreach.py` (line 68) **silently nulls** because it isn't numeric.
- So outreach rows, visits, and interviews can't link to a real patient row,
  and the RLS "own record" subqueries (`p.id = patient_id AND p.user_id = auth.uid()`)
  never match.

### The design
1. Walk-up kiosk patients register via the **existing public** `POST /api/v1/patients`
   (SQLAlchemy stack) which returns the real **bigint id**.
2. When a Clerk session exists, that bigint row is **claimed** by setting
   `patients.user_id = token.sub`.

### Implementation (sketches to add)

**a) Add `user_id` to the SQLAlchemy model** (`backend/app/models/patient.py`) to
match the schema column:

```python
user_id = Column(types.UUID(as_uuid=True), nullable=True, unique=True)
```

**b) Claim endpoint** (in `routers/patients.py`):

```python
from app.core.auth import verify_clerk_token

@router.post("/{patient_id}/claim", response_model=PatientResponse)
async def claim_patient(
    patient_id: int,
    _claims: dict = Depends(verify_clerk_token),
    db: AsyncSession = Depends(get_db),
):
    patient = (await db.execute(select(Patient).where(Patient.id == patient_id))).scalar_one_or_none()
    if not patient:
        raise NotFoundError("Patient", patient_id)
    if patient.user_id:
        raise HTTPException(status_code=409, detail="Patient already claimed")
    patient.user_id = _claims["sub"]      # Clerk user UUID
    await db.flush(); await db.refresh(patient)
    return patient
```

**c) Frontend (`AnatomyFlow.tsx`)** — replace the fake id:

```tsx
// details step, Continue onClick:
const created = await fetch(`${BASE}/patients`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, phone, date_of_birth: null }),
}).then((r) => r.json());
setPatientId(String(created.id));          // real bigint

// when Clerk token exists:
const token = await getToken();
if (token) await fetch(`${BASE}/patients/${created.id}/claim`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
```

**d) Add backend interview persistence** — `VoiceInterview` currently leaves
`interviewId = null`. Add `POST /api/v1/interviews` that writes the
`conversation_json`, `selected_body_part`, `recommended_department`, `pain_severity`,
`language`, `ai_summary` with the numeric `patient_id`, and thread the returned id
into the outreach `interview_id` field.

**e) `outreach.py`** — now that `patient_id` is the real integer, keep the guard but
**fail loudly** instead of silently nulling:

```python
if not patient_id:
    raise HTTPException(status_code=400, detail="Create/claim a patient row first")
```

### Done when
Kiosk → patient row in `public.patients` (bigint) → `user_id` = Clerk sub after
login → outreach request has a linked non-null `patient_id` → RLS "own record"
queries match for that user.

---

## §4 — Bhashini + Gemini email + email/WhatsApp sender *(8%)*

### Bhashini (live Dhruva key)
- Client is `frontend/src/lib/bhashini.ts` (direct pipeline, not ULCA discover).
- Key: register at https://bhashini.gov.in → issue an **inference API key** →
  put in `frontend/.env` as `VITE_BHASHINI_API_KEY`. The client sends it as the
  `Authorization` header to `https://dhruva-api.bhashini.gov.in/services/inference/pipeline`.
- Test: open `/kiosk/anatomy`, pick a body part, tap the mic, speak a Hindi sentence.
  In DevTools → Network, confirm:
  1. A `POST .../inference/pipeline` (ASR) returns a JSON transcript.
  2. TTS passes the spoken question and returns audio bytes.
- Fallbacks still fire if the key is missing/expired (Web Speech → mock) — verify you
  see the **real** path, not the mock, by checking the transcript quality.

> **Production hardening:** don't ship the Bhashini key to the browser. Proxy ASR/TTS
> through the backend (mirror `backend/app/ai/asr_client.py` / `tts_client.py` over
> one new `/api/v1/bhashini/{asr,tts}` router) so the secret stays server-side.

### Gemini email draft
- Already implemented in `outreach.py._send_outreach_email` (lines 118–146).
- Needs `GEMINI_API_KEY` in `backend/.env` (root `.env`). Confirm the model name:
  `gemini_model` in `config.py` is `gemini-3.1-flash-lite` — verify it exists via
  `curl "https://generativelanguage.googleapis.com/v1beta/models?key=KEY"`.
- Test: POST an outreach request and check logs for `Outreach email to ... — Subject: ...`.

### Real email sender (today it only logs)
Replace the `# TODO` at `outreach.py:148`. Option A (Resend — simplest):

```bash
pip install resend
```

```python
import resend
resend.api_key = settings.resend_api_key
resp = resend.Emails.send({"from": "kiosk@medikiosk.in",
                           "to": [data.hospital_email],
                           "subject": subject, "html": body})
```

- Add `resend_api_key` (or SMTP/SendGrid fields) to `config.py` + `.env.template`.
- **Only** mark `email_sent_at`/status `emailed` when the send returns success;
  otherwise keep it `pending` and surface the failure (currently it marks emailed
  regardless — see lines 152–154).

### WhatsApp (optional, costs money)
- Providers: **Twilio WhatsApp API**, Gupshup, or Meta Cloud API + a verified
  sender number. Outbound: one HTTP POST per message; inbound via a webhook.
- Ship with email first; add WhatsApp behind `settings.whatsapp_enabled`.

### Done when
Real Hindi ASR/TTS, a Gemini-drafted email actually lands in an inbox (or a
mock inbox like Mailpit in CI), and `status` reflects true delivery.

---

## §5 — RLS: anonymous kiosk can read the directory *(3%)*

### Why
Directory policies `SELECT ... USING (auth.role() = 'authenticated')`
(schema lines 510–524) make the **anonymous** kiosk unable to list
hospitals/doctors/slots at all.

### Fix (recommended — public directory, non-PHI)
Swap the policy to public-read and grant `anon`:

```sql
DROP POLICY IF EXISTS "hospitals_select_all" ON public.hospitals;
CREATE POLICY "hospitals_select_all" ON public.hospitals
  FOR SELECT USING (true);                        -- public directory

-- repeat for departments / doctors / opd_slots

GRANT SELECT ON public.hospitals, public.departments,
              public.doctors, public.opd_slots TO anon;
```

**Do NOT** grant `anon` anything on patients/visits/interviews/outreach — no grant
means no access, which is the fail-closed default.

### Alternative (enforce login instead)
Gate the kiosk behind Clerk:
```tsx
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
// wrap <AnatomyFlow/> with <SignedIn>...</SignedIn> and redirect otherwise
```
Then `authenticated` policies work as-is.

### Done when
A fresh (anonymous) browser tab can render the hospital list from PostgREST, while
`anon` reads on any `patients` row still return nothing/403.

---

## §6 — CI, deployment config, secrets management, e2e tests *(6%)*

### Backend deployment (Render/Railway/Fly.io)
- `Procfile`: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- `Dockerfile` (backend):
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
- Set env vars in the platform dashboard (see secrets below), `APP_ENV=production`,
  `CORS_ORIGINS=https://your-frontend-domain`.

### Frontend deployment (Vercel/Netlify)
- Build command `npm run build`, output `dist/`.
- Env: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_BHASHINI_API_KEY`, `VITE_API_URL`.
- Reconnect Clerk "Domains" to the real production domain.

### Secrets management
- Never commit `.env`. Keep a **names-only** `.env.example` (already mostly present).
- Use the platform's env vaults (Vercel/Railway/Fly secret storage), or
  Doppler/1Password for a central source.
- Rotate `service_role` if it ever leaks (it's a project-wide key).
- Full key inventory is in `backend/app/config.py` + `frontend/.env.*` — audit
  that nothing unused is left dangling.

### CI: GitHub Actions (`.github/workflows/ci.yml`)
```yaml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r backend/requirements.txt
      - run: cd backend && ruff check app && pytest -q
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd frontend && npm ci && npx tsc --noEmit && npm run build
```
(There is already a `.github/` directory — check what's inside before adding.)

### e2e tests (Playwright)
- Two suites:
  1. **Kiosk smoke**: go to `/kiosk/anatomy` → details → anatomy → voice →
     hospital → booking (assert successful submit path).
  2. **Auth flow**: use Clerk **Test tokens / "Environment ▶ Try it out"** to get a
     session, then assert a protected backend route returns 200 and an anonymous
     request returns 401.
- Mock the email/WhatsApp sender (Mailpit) so CI stays deterministic.

### Done when
`git push` runs lint+test+build automatically, both apps deploy from CI, secrets are
in a vault, and a Playwright run covers login + the anatomy/outreach happy path.

---

## Final acceptance checklist

- [ ] Schema + seed executed on a fresh Supabase project; startup "degraded mode" gone
- [ ] Clerk publishable/secret/issuer set; signup → webhook → `profiles` row
- [ ] Svix/webhook signature verified; forged payloads rejected (401)
- [ ] Patient rows created with real bigint ids; claimed via `user_id`; outreach has non-null `patient_id`
- [ ] Interviews persisted with the linked patient id
- [ ] Real Bhashini ASR/TTS confirmed (not the mock) — ideally proxied server-side
- [ ] Outreach email drafts via Gemini and delivers via a real provider; status reflects true success
- [ ] Anonymous kiosk can list hospitals via PostgREST; `anon` denied on all PHI tables
- [ ] Backend + frontend deploy from CI; secrets in a vault; Playwright auth+kiosk suites green
- [ ] `APP_ENV=production` fails closed (no legacy JWT fallback) — verify by test