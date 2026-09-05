<div align="center">

<!--
  ============================================================
  MediKiosk — Open-source self-service healthcare kiosk system
  ============================================================
  Replace the demo URL + screenshots below when you deploy a
  live instance (see DEPLOYMENT.md). The ANSI banner renders
  identically in light & dark mode on GitHub.
  ============================================================
-->

```text
        ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
       █▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
       █  ████ ████ ████ ██ ██ ██ █████ ██    █
       █  █    █  █ █  █ ██ ██ ██ ████  ██    █
       █  ████ ████ █  █ ██ ██ ██ ███   ██    █
       █  █  █ █    █  █ ██ ██ ██ ██    ██    █
       █  █  █ █    ████  ██████ █████ ██████ █
       █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█
       ▌  ▄▄  ▄▄  ▄▄  ▄▄  ▄▄  ▄▄  ▄▄  ▄▄  ▄▄ ▐▀  <-- TAP TO START
       ▌_██▀▀████▀▀████▀▀████▀▀████▀▀████▀▀██▐▀     _
        ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄     /\_/\
       █▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█   ( >.< )
       █▄▄ ▄▄ ▄▄ ▄▄ ▄▄ ▄▄ ▄▄ ▄▄ ▄▄ ▄▄ ▄▄ ▄▄ █▀  "I feel fine ✓"
         ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
```

# 🩺 MediKiosk

**The open-source, self-service healthcare kiosk that lets patients check themselves in, tell their story in their own language, and gets them in front of the right doctor — in minutes, not hours.**

A voice-first, multilingual kiosk for OPDs, clinics, hospitals and pharmacies that captures symptoms, performs instant red-flag triage, digitizes old prescriptions, and hands the physician a clean, structured summary. Built for low-bandwidth clinics and big-city hospitals alike.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg?style=for-the-badge)](https://github.com/freakyyirus/MediKiosk/actions)
[![Version](https://img.shields.io/badge/version-1.0.0-8b5cf6.svg?style=for-the-badge&logo=github&logoColor=white)](https://github.com/freakyyirus/MediKiosk/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-ff9800.svg?style=for-the-badge&logo=gitmoji&logoColor=white)](CONTRIBUTING.md)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776ab.svg?style=for-the-badge&logo=python&logoColor=white)](backend)
[![FastAPI](https://img.shields.io/badge/FastAPI-✓-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](backend)
[![React](https://img.shields.io/badge/React-18-61dafb.svg?style=for-the-badge&logo=react&logoColor=black)](frontend)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)](database)

<div align="center">

<img alt="Built for healthcare" src="https://img.shields.io/badge/Built%20For-Hospital%20OPDs-0ea5e9.svg?style=for-the-badge">
<img alt="Multilingual" src="https://img.shields.io/badge/Multilingual-English%20%26%20Hindi-0d9488.svg?style=for-the-badge">
<img alt="FHIR R4" src="https://img.shields.io/badge/ABDM-FHIR%20R4%20Ready-16a34a.svg?style=for-the-badge">
<img alt="Hardware" src="https://img.shields.io/badge/Hardware-Raspberry%20Pi-a3e635.svg?style=for-the-badge">

---

🎥&nbsp;[**Watch the 30-second demo**](#-demo--screenshots) &nbsp;·&nbsp; 🚀&nbsp;[**Live demo**](https://medikiosk.vercel.app) &nbsp;·&nbsp; 📚&nbsp;[**API Docs**](#-api-documentation) &nbsp;·&nbsp; 🤝&nbsp;[**Contribute**](#-contributing)

</div>

</div>

---

<br>

## 💡 Problem & Solution

Hospital OPDs everywhere run on the same bottleneck: long queues, paper check-in forms, manual vitals entry, and patient histories scattered across registers, apps, and the doctor's memory. Every patient repeats their story, and every doctor races the clock to reconstruct it.

**MediKiosk replaces that line with a 10-inch touchscreen.** A patient taps their symptoms on a body map or simply *speaks* them, the kiosk detects red-flag emergencies in real time, digitizes old prescriptions in seconds, and pushes a ready-made clinical summary to the physician's queue — so the doctor spends the consultation on medicine, not on intake.

<br>

## ✨ Key Features

| | |
|---|---|
| 🏥 **Patient Self Check-in** | Walk up, tap-to-start, navigate via voice + touch. ABHA phone verification optional. Records the full complaint digitally with zero paper. |
| 📱 **QR Appointment Scanning** | Every check-in mints a signed QR slip — scan at the payment desk, pharmacy, or lab. No re-typing, no wristbands, no confusion. |
| ❤️ **Vital Signs Integration** | Plug in a BP cuff, thermometer or SpO₂ probe. Readings are analyzed against clinical thresholds and surfaced as normal / warning / critical. |
| 🗣️ **Multi-Language Support** | Native voice-first intake in **English & Hindi** via Bhashini ASR; UI is i18n-ready for any language you want to add. |
| 💳 **Payment Gateway** | Pay the consultation or pharmacy fee right from the kiosk — gateway plug-in exposed via `PAYMENT_API_KEY`. |
| 📊 **Real-Time Queue Management** | AI-ordered physician queue with severity-based prioritization and live OPD dashboards. Emergencies leapfrog automatically. |
| 📤 **EMR / EHR Sync** | Exports a **FHIR R4** bundle per encounter and pushes to ABDM (or any EMR) via the standard gateway flow. |
| ♿ **Accessibility Mode** | High-contrast theme, large-touch buttons, screen-reader-friendly markup and reduced-motion — dignified care, regardless of ability. |

> Plus: **handwriting OCR** for old prescriptions (Tesseract + EasyOCR + Gemini validation), **red-flag screening** for stroke/MI/breathlessness, an **AYUSH mode**, and a **DPDPA-compliant data-retention engine** with automatic erasure and audit log.

<br>

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | [![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black&style=flat-square)](frontend) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white&style=flat-square)](frontend) [![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white&style=flat-square)](frontend) [![Tailwind](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss&style=flat-square)](frontend) [![Zustand](https://img.shields.io/badge/State-Zustand-deb887?style=flat-square)](frontend) |
| **Backend** | [![Python](https://img.shields.io/badge/Python-3.11-3776ab?logo=python&logoColor=white&style=flat-square)](backend) [![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square)](backend) [![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.x-d71f00?style=flat-square)](backend) [![Pydantic](https://img.shields.io/badge/Pydantic-e92063?style=flat-square)](backend) |
| **Database & Cache** | [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?logo=postgresql&logoColor=white&style=flat-square)](database) [![Redis](https://img.shields.io/badge/Redis-7-dc382d?logo=redis&logoColor=white&style=flat-square)](docker-compose.yml) [![MinIO](https://img.shields.io/badge/MinIO-S3--compatible-f19c39?logo=minio&style=flat-square)](docker-compose.yml) |
| **Real-time** | [![MQTT](https://img.shields.io/badge/MQTT-IoT%20ready-660066?style=flat-square)](backend) [![WebSockets](https://img.shields.io/badge/WebSockets-Live%20queue-4a90d9?style=flat-square)](backend) |
| **Hardware** | [![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-4%2B-a22846?logo=raspberrypi&style=flat-square)](#-hardware-setup) [![Linux](https://img.shields.io/badge/OS-Linux%20FOSS-fcc624?logo=linux&logoColor=black&style=flat-square)](#-hardware-setup) |
| **AI Services** | Bhashini (ASR) · Google Gemini (LLM) · EasyOCR + Tesseract (OCR) · scikit-learn (priority ML) |

<br>

## 🎬 Demo & Screenshots

<div align="center">

| | |
|---|---|
| **🏥 Kiosk self check-in**<br><sub>Splash → language → identify</sub> | **🗺️ Body-map triage**<br><sub>Tap where it hurts</sub> |
| ![Kiosk check-in](https://placehold.co/420x280/eef2ff/312e81?text=MediKiosk+%C2%B7+Check-in) | ![Body map](https://placehold.co/420x280/eef2ff/312e81?text=Body-map+triage) |

| | |
|---|---|
| **🧑‍⚕️ Physician queue**<br><sub>AI-ordered OPD queue</sub> | **📜 Prescription digitization**<br><sub>Handwriting OCR output</sub> |
| ![Physician queue](https://placehold.co/420x280/eef2ff/312e81?text=Physician+queue) | ![OCR extraction](https://placehold.co/420x280/eef2ff/312e81?text=Prescription+OCR) |

![Demo](https://placehold.co/900x360/eef2ff/312e81?text=30-second+product+demo+GIF)

🚀 **Try the live demo →** [medikiosk.vercel.app](https://medikiosk.vercel.app)

</div>

<br>

## 🚀 Quick Start

> **Prerequisites:** Docker & Docker Compose · Node.js ≥ 18 · Python ≥ 3.10

### 1 — Clone & configure

```bash
git clone https://github.com/freakyyirus/MediKiosk.git
cd MediKiosk

cp .env.template .env        # backends reads ../.env automatically
# add GEMINI_API_KEY (+ BHASHINI_API_KEY for voice) — see Configuration ↓
```

### 2 — Start infrastructure (PostgreSQL, Redis, MinIO)

```bash
docker compose up -d postgres redis minio        # ~30 s, all healthchecked
```

### 3 — Backend (FastAPI on :8000)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -e '.[dev]'
alembic upgrade head                             # or: python -c "import asyncio,app.database; asyncio.run(app.database.init_db())"
uvicorn app.main:app --reload --port 8000
```

▶ Open **http://localhost:8000/docs** — the whole API is there, browsable.

### 4 — Frontend (React on :5173)

```bash
cd frontend
npm install
npm run dev
```

▶ Open **http://localhost:5173** and tap **Start Health Check** 🎉 — the kiosk
proxies `/api/v1` to the local backend automatically.

### 🖥️ Hardware setup (kiosk)

```bash
# On a Raspberry Pi 4+ (Raspberry Pi OS, 64-bit)
sudo apt install -y xserver-xorg-video-fbturbo chromium-browser tesseract-ocr tesseract-ocr-hin
cp frontend/.env.example frontend/.env     # VITE_API_URL=http://<opd-server>/api/v1
npm run build && npm run preview -- --port 80

# Lock it to kiosk mode — e.g. a systemd unit that auto-starts Chromium
# fullscreen at login (kiosk.service: chromium --kiosk http://localhost).
```

<br>

## 🏗️ Architecture

MediKiosk is a clean, modular monolith: a **React SPA** in front, a
**FastAPI service** in the middle, and swap-friendly adapters for storage, AI,
and EMRs — so a clinic can run it on one laptop today and scale to multiple
OPDs tomorrow.

```mermaid
flowchart LR
    subgraph K[Raspberry Pi · 10" Touchscreen]
        UI["🖥️ Kiosk UI<br/>(React SPA — Vite)"]
        HW["🔌 Hardware Controllers<br/>vitals · QR · printer"]
    end

    subgraph API[Cloud / On-prem server]
        GW["🚪 API Gateway<br/>(FastAPI)"]
        AUTH["🔐 Auth Service<br/>JWT + Clerk / Supabase"]
        PT["🧑 Patient Service<br/>check-in · body-map · sessions"]
        QS["📊 Triage & Queue Service<br/>ML priority · vitals"]
        AISM["🧠 AI Services<br/>ASR · LLM · OCR"]
        DB[("🗄️ PostgreSQL")]
        CACHE[("⚡ Redis")]

        GW --> AUTH
        AUTH --> PT
        AUTH --> AISM
        PT --> DB
        PT --> CACHE
        QS --> DB
        AISM --> DB
    end

    subgraph EXT[External systems]
        EMR["🏥 EMR / EHR<br/>(ABDM FHIR R4 · other EMRs)"]
    end

    UI -->|"HTTPS / WSS"| GW
    HW -->|"MQTT / WebSockets"| GW
    QS -->|"FHIR R4 bundle"| EMR

    style GW fill:#6366f1,color:#fff,stroke:none
    style AUTH fill:#0ea5e9,color:#fff,stroke:none
    style PT fill:#0d9488,color:#fff,stroke:none
    style QS fill:#f59e0b,color:#222,stroke:none
    style EMR fill:#16a34a,color:#fff,stroke:none
```

<br>

## 📚 API Documentation

Interactive **Swagger / OpenAPI** docs ship with the backend — just run it and
open **http://localhost:8000/docs** (or `/docs` on your deployed instance).
The schema is auto-generated from typed Pydantic models, so it stays in sync
with the code.

**Example — patient self check-in:**

```bash
curl -X POST http://localhost:8000/api/v1/patients \
  -H "Content-Type: application/json" \
  -d '{
        "name": "Anita Sharma",
        "phone": "+91 98765 43210",
        "language_preference": "hi"
      }'
```

```json
{
  "id": 42,
  "name": "Anita Sharma",
  "phone": "+91 98765 43210",
  "language_preference": "hi",
  "created_at": "2026-09-05T09:00:00Z"
}
```

Want a quick health check of a running instance?

```bash
curl http://localhost:8000/health
```

<br>

## ⚙️ Configuration

Copy `.env.template` → `.env`. Everything is pre-wired; only the values below
need real-world secrets.

| Variable | Description | Default | Required |
|---|---|---|---|
| `DATABASE_URL` | Postgres DSN (`postgresql+asyncpg://…`). Built from the `POSTGRES_*` vars if unset | `postgresql+asyncpg://…localhost/medikiosk` | ✅ |
| `REDIS_URL` | Redis connection for queue/state caching | `redis://localhost:6379/0` | optional |
| `MQTT_BROKER` | Broker address for hardware sensors/VPN (WebSockets used if empty) | *(empty — WebSockets)* | optional |
| `PAYMENT_API_KEY` | Payment gateway credential (kiosk billing) | *(empty)* | optional |
| `GEMINI_API_KEY` | Google Gemini key — summaries, triage, OCR validation | *(empty)* | ✅ for AI |
| `BHASHINI_API_KEY` | Bhashini ASR — voice-first symptom capture | *(empty)* | **for voice** |
| `ABDM_CLIENT_ID` / `ABDM_CLIENT_SECRET` | ABDM gateway credentials (sandbox → prod) | *(empty)* | for ABDM |
| `JWT_SECRET_KEY` | Signing secret for auth tokens | `change-me…` | ✅ change me |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173,…` | ✅ |
| `TESSERACT_CMD` | Local OCR binary path | `/usr/bin/tesseract` | optional |
| `GOOGLE_CLOUD_VISION_API_KEY` | Fallback OCR for faint handwriting | *(empty)* | optional |

<details>
<summary><b>📋 Full variable list & deployment values</b> (click to expand)</summary>

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the complete production matrix
(Vercel + Railway + Supabase), plus the `docker-compose.yml` for local
infrastructure hosts and ports.

</details>

<br>

## 🛡️ Built for Healthcare

| Trust factor | Status |
|---|---|
| 🔒 **Data protection** | DPDPA-informed retention engine — automatic erasure, hard-delete with approval, append-only audit log |
| 🌐 **Interoperability** | **FHIR R4** output · **ABDM/NHA** integration path (sandbox-ready) |
| 🔐 **Auth** | JWT + Clerk/Supabase role-based access (patient · doctor · admin) |
| ⚠️ **Compliance notice** | This project is provided **as-is** and is not HIPAA/GDPR *certified*. If you deploy in a regulated environment, run your own privacy review, BAA/DPA, and security audit before handling real patient data. |

<br>

## 🤝 Contributing

We'd love your help — bug reports, translations, new-locale voice packs,
kiosk hardware hacks, even a better README. 💙

1. **Found something?** [Open an issue](https://github.com/freakyyirus/MediKiosk/issues).
2. **Want to fix it?** Read our [Contributing Guide](CONTRIBUTING.md) and our
   [Code of Conduct](CODE_OF_CONDUCT.md).
3. **Branch strategy:** `main` is always releasable. Short-lived
   `feat/…`, `fix/…`, `i18n/…` branches, squash-merged via PR, one reviewer,
   automated build must pass. No direct pushes to `main`, please.

<details>
<summary><b>🔥 Good first issues</b> (click to expand)</summary>

- Add a new language to `frontend/src/pages/landing/i18n.ts` and the kiosk locales.
- Wire a `PAYMENT_API_KEY` adapter for a gateway (Razorpay, Stripe) behind the existing contract.
- Add more `BODY_PARTS` regions + red-flag rules to `frontend/src/components/advanced/bodyMapData.ts`.
- Ship an MQTT bridge for vitals hardware in `backend/app/services/`.

</details>

<br>

## 📄 License & Acknowledgments

**MediKiosk** is released under the **MIT License** — build on it, fork it,
run it in-house, no strings attached. See [LICENSE](LICENSE).

With ❤️ and enormous respect for the open-source ecosystem that made this possible:

> **FastAPI** · **SQLAlchemy** · **Pydantic** · **React** · **Tailwind CSS** · **Zustand** ·
> **Clerk** · **Supabase** · **Google Gemini & Cloud Vision** · **Bhashini (MeitY)** ·
> **EasyOCR** · **Tesseract OCR** · **scikit-learn** · **PostgreSQL** · **Redis** · **MinIO**

Built for the **Smart India Hackathon 2026** — from a college hostel room to (we hope) a hospital corridor near you.

<br>

<div align="center">

[![Star](https://img.shields.io/github/stars/freakyyirus/MediKiosk?style=social)](https://github.com/freakyyirus/MediKiosk)
[![Watch](https://img.shields.io/github/watchers/freakyyirus/MediKiosk?style=social)](https://github.com/freakyyirus/MediKiosk)
[![Fork](https://img.shields.io/github/forks/freakyyirus/MediKiosk?style=social)](https://github.com/freakyyirus/MediKiosk)

**If MediKiosk helps your clinic, give it a ⭐ — it's one tap that keeps the maintainers caffeinated.** ☕

</div>