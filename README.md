# MediKiosk

Open-source, self-service healthcare kiosk software that lets patients check in, describe their symptoms in their own language, and reach the right doctor — in minutes instead of hours.

A voice-first, multilingual kiosk for OPDs, clinics and hospitals. It captures symptoms through touch or speech, runs real-time red-flag triage, digitizes old prescriptions, and hands the physician a clean, structured summary. Built to work for low-bandwidth clinics and busy city hospitals alike.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776ab?logo=python&logoColor=white)](backend)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](backend)
[![React 18](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)](frontend)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](frontend)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?logo=postgresql&logoColor=white)](docker-compose.yml)
[![GitHub stars](https://img.shields.io/github/stars/freakyyirus/MediKiosk?style=social)](https://github.com/freakyyirus/MediKiosk)

## Features

- **Patient self check-in** — tap-to-start, voice + touch navigation, optional ABHA phone verification.
- **Body-map triage** — patients tap where it hurts; red-flag screening flags emergencies so they move ahead of the queue.
- **Voice intake** — multilingual ASR (English & Hindi) powered by Bhashini.
- **Prescription digitization** — OCR that turns handwritten prescriptions into structured medication data.
- **Smart queuing** — severity-aware ordering with live OPD dashboards for staff.
- **EMR-ready** — exports FHIR R4 bundles and integrates with ABDM.
- **Private by design** — DPDPA-informed retention engine with automatic erasure and an audit log.
- **Accessible** — high-contrast theme, large touch targets, screen-reader-friendly markup.

## Getting Started

Prerequisites: Docker & Docker Compose · Node.js 18+ · Python 3.10+

```bash
git clone https://github.com/freakyyirus/MediKiosk.git
cd MediKiosk
cp .env.template .env        # backend reads ../.env automatically

# 1. Infrastructure
docker compose up -d postgres redis minio

# 2. Backend (runs on :8000)
cd backend
python -m venv venv && source venv/bin/activate
pip install -e '.[dev]'
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Frontend (runs on :5173)
cd ../frontend
npm install
npm run dev
```

- API docs: http://localhost:8000/docs
- Kiosk UI: http://localhost:5173
- Health check: `curl http://localhost:8000/health`

## Configuration

Copy `.env.template` to `.env` and fill in the values you need:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (derived from `POSTGRES_*` if unset) |
| `REDIS_URL` | Redis connection for queue / state caching |
| `GEMINI_API_KEY` | Google Gemini — summaries, triage, OCR validation |
| `BHASHINI_API_KEY` / `BHASHINI_ULCA_API_KEY` | Bhashini voice ASR (English & Hindi) |
| `ABDM_CLIENT_ID` / `ABDM_CLIENT_SECRET` | ABDM gateway integration |
| `JWT_SECRET_KEY` | Auth token signing secret (change it) |
| `CORS_ORIGINS` | Allowed frontend origins |
| `PAYMENT_API_KEY` | Payment gateway plug-in |

See `.env.template` for the full list and defaults.

## Hardware

Raspberry Pi 4+ with a touchscreen running the built frontend fullscreen in kiosk mode. Controller adapters (vitals, QR, printer) live in the backend and connect via WebSockets/MQTT.

## Project Layout

```
backend/            FastAPI + SQLAlchemy + AI services (ASR, OCR, triage, priority ML)
frontend/           React + TypeScript + Vite SPA (kiosk UI, hospital dashboards)
docker-compose.yml  PostgreSQL · Redis · MinIO
```

## Contributing

Bug reports, translations, new language packs and hardware hacks are all welcome. Please open an issue first or read [CONTRIBUTING.md](CONTRIBUTING.md). Work on short-lived branches and open a PR — `main` stays releasable at all times.

Built with: FastAPI · SQLAlchemy · Pydantic · React · TypeScript · Vite · Tailwind CSS · Zustand · Supabase · Google Gemini · Bhashini · EasyOCR · Tesseract · PostgreSQL · Redis · MinIO

## License

[MIT](LICENSE) — build on it, fork it, run it in-house.