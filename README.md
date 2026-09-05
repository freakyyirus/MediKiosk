# 🩺 MediKiosk

<div align="center">

```text
        ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
       █▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
       █  ████ ████ ████ ██ ██ ██ █████ ██    █
       █  █    █  █ █  █ ██ ██ ██ ████  ██    █
       █  ████ ████ █  █ ██ ██ ██ ███   ██    █
       █  █  █ █    █  █ ██ ██ ██ ██    ██    █
       █  █  █ █    ████  ██████ █████ ██████ █
       █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█
        ▌█████████████████████████████████████▐▀
        ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
```

**The open-source, self-service healthcare kiosk that lets patients check in, describe their symptoms in their own language, and get in front of the right doctor — in minutes, not hours.**

</div>

A voice-first, multilingual kiosk for OPDs, clinics and hospitals. MediKiosk captures symptoms via touch or speech, runs instant red-flag triage, digitizes old prescriptions, and hands the physician a clean, structured summary. Built for low-bandwidth clinics and big-city hospitals alike.

[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Python 3.11](https://img.shields.io/badge/Python-3.11-3776ab?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?logo=postgresql&logoColor=white)

---

## Features

- **Patient self check-in** — tap-to-start, voice + touch navigation, ABHA phone verification optional.
- **Body-map triage** — patients tap where it hurts; severity-aware red-flag screening surfaces emergencies first.
- **Voice intake** — multilingual ASR (English & Hindi) via Bhashini.
- **Prescription digitization** — OCR that extracts structured medication data from handwritten prescriptions.
- **Smart queuing** — AI-ordered physician queue with live OPD dashboards.
- **EMR ready** — exports FHIR R4 bundles and integrates with ABDM.
- **Data-safe by design** — DPDPA-informed retention engine with automatic erasure and an audit log.

## Quick Start

Prerequisites: Docker & Docker Compose · Node.js ≥ 18 · Python ≥ 3.10

```bash
git clone https://github.com/freakyyirus/MediKiosk.git
cd MediKiosk
cp .env.template .env        # backend reads ../.env automatically

docker compose up -d postgres redis minio

cd backend
python -m venv venv && source venv/bin/activate
pip install -e '.[dev]'
alembic upgrade head
uvicorn app.main:app --reload --port 8000     # API docs → http://localhost:8000/docs
```

```bash
cd frontend
npm install
npm run dev                                      # → http://localhost:5173
```

## Configuration

Copy `.env.template` → `.env`. Key values:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (built from `POSTGRES_*` if unset) |
| `GEMINI_API_KEY` | Google Gemini — summaries, triage, OCR validation |
| `BHASHINI_API_KEY` / `BHASHINI_ULCA_API_KEY` | Bhashini voice ASR |
| `ABDM_CLIENT_ID` / `ABDM_CLIENT_SECRET` | ABDM gateway integration |
| `JWT_SECRET_KEY` | Auth token signing secret |
| `PAYMENT_API_KEY` | Payment gateway plug-in |

## Hardware

Raspberry Pi 4+ with a touchscreen, running the built frontend fullscreen in a kiosk browser. See `backend/` and the kiosk UI for the controller adapters (vitals, QR, printer).

## Project Layout

```
backend/     FastAPI + SQLAlchemy + AI services (ASR, OCR, triage, priority ML)
frontend/    React + TypeScript + Vite SPA (kiosk UI, hospital dashboards)
docker-compose.yml   PostgreSQL · Redis · MinIO
```

## API

Interactive Swagger docs ship with the backend at `http://localhost:8000/docs`. Quick health check:

```bash
curl http://localhost:8000/health
```

## Contributing

Bug reports, translations, new-voice packs and hardware hacks all welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). `main` is always releasable — short-lived branches, squash-merged via PR.

**Built with:** FastAPI · SQLAlchemy · Pydantic · React · Tailwind CSS · Zustand · Clerk · Supabase · Google Gemini · Bhashini (MeitY) · EasyOCR · Tesseract · PostgreSQL · Redis · MinIO

## License

[MIT](LICENSE) — build on it, fork it, run it in-house.