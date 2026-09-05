# MediKiosk

AI-Powered Clinical History & Document Digitization Platform for Indian Hospital OPDs.
Built for Smart India Hackathon 2026.

## Features

1. **Voice-First Kiosk**: Captures patient symptoms natively in local languages (Hindi, English) using Bhashini ASR.
2. **AI Clinical Structuring**: Gemini LLM structures symptoms into the SOCRATES medical framework.
3. **Instant Triage**: Rule-based & AI-assisted Red Flag detection (e.g., Stroke, Myocardial Infarction).
4. **Document Digitization**: Auto-extracts details from old prescriptions and lab reports using OCR (Tesseract/EasyOCR).
5. **Physician Dashboard**: Smart queue management and synthesized clinical summaries (one-click review).
6. **ABDM Integration**: Generates FHIR R4 bundles and pushes to ABDM Sandbox using ABHA ID.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend**: FastAPI (Python 3.11+), SQLAlchemy, Pydantic
- **Database**: PostgreSQL 16
- **Caching & State**: Redis 7
- **Storage**: MinIO (S3 compatible)
- **AI Services**: Bhashini (ASR), Google Gemini (LLM), EasyOCR/Tesseract (OCR)

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+)
- Python (v3.11+)

### 1. Environment Variables
Copy `.env.template` to `.env` and fill in your API keys:
```bash
cp .env.template .env
```

You will need:
- `GEMINI_API_KEY`: Get from Google AI Studio
- `BHASHINI_API_KEY`: Get from Bhashini platform

### 2. Start Infrastructure
Start the PostgreSQL, Redis, and MinIO services:
```bash
docker-compose up -d postgres redis minio
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -e '.[dev]'
alembic upgrade head
npm run dev
```
Backend will run at `http://localhost:8000`

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will run at `http://localhost:5174` (or 5173)

## Project Structure
- `/backend`: FastAPI application, AI clients, database models, schemas, and routers.
- `/frontend`: React application, divided into `/kiosk`, `/physician`, and `/admin` routes.
- `/docker-compose.yml`: Infrastructure configuration.
