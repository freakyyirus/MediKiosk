# STEP-BY-STEP EXECUTION PLAN
# MediKiosk — AI-Powered Clinical History & Document Digitization Platform
# Version: 1.0 | Date: September 2026
# Classification: Internal — Smart India Hackathon 2026 Submission

---

## EXECUTIVE OVERVIEW

This document provides a granular, day-by-day execution roadmap for building MediKiosk from zero to MVP demo. The plan is structured into 6 major phases, 18 sprints, and 200+ specific tasks. Each task includes:
- **Task ID**: Unique identifier for tracking
- **Description**: What needs to be done
- **Effort**: Estimated hours
- **Dependencies**: Prerequisites
- **Acceptance Criteria**: Definition of done
- **Assignee Role**: Who should do this
- **Risk Level**: Low / Medium / High

**Total Estimated Effort: 480 engineering hours (6 weeks full-time team of 3)**
**SIH Hackathon Compression: 120 hours (2 weeks, 3 developers, 12-hour days)**

---

## PHASE 0: FOUNDATION & SETUP (Days 1-2)
*Goal: Development environment, project scaffolding, API keys, team alignment*

### Sprint 0.1: Environment Setup (Day 1)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **0.1.1** | Create GitHub organization + repositories (medikiosk-backend, medikiosk-frontend, medikiosk-infra) | 1h | None | 3 repos created with README, LICENSE (MIT), .gitignore | Tech Lead | Low |
| **0.1.2** | Set up branch protection rules (main requires PR, 1 review) | 30m | 0.1.1 | Branch protection active on all repos | Tech Lead | Low |
| **0.1.3** | Create Docker Compose development environment | 2h | None | `docker-compose up` spins up Postgres 16, Redis 7, MinIO, backend, frontend | DevOps | Low |
| **0.1.4** | Set up pre-commit hooks (black, isort, flake8 for Python; ESLint, Prettier for TS) | 1h | 0.1.1 | Pre-commit hooks run on every commit, zero lint errors | Backend Dev | Low |
| **0.1.5** | Create shared environment configuration (.env.template with all required variables) | 30m | None | .env.template documents every env var with description | Tech Lead | Low |
| **0.1.6** | Set up project management board (GitHub Projects / Jira) with all sprints | 1h | None | Board has 6 phases, 18 sprints, all 200+ tasks | Product Manager | Low |
| **0.1.7** | Team alignment meeting: architecture review, coding standards, git workflow | 2h | 0.1.1-0.1.6 | Meeting notes documented, all team members signed off | Tech Lead | Low |

### Sprint 0.2: API Keys & External Access (Day 1-2)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **0.2.1** | Register for Bhashini API key (bhashini.ai) | 1h | None | Valid API key received, test request returns 200 | Backend Dev | Medium |
| **0.2.2** | Register for Google Gemini API key (ai.google.dev) | 30m | None | Valid API key, quota confirmed (1M tokens/day free tier) | Backend Dev | Low |
| **0.2.3** | Register for ABDM Sandbox account (sandbox.abdm.gov.in) | 2h | None | Sandbox credentials received, can access test APIs | Backend Dev | High |
| **0.2.4** | Set up Google Cloud Vision API (fallback OCR) | 30m | Google Cloud account | API key active, test OCR on sample prescription works | Backend Dev | Low |
| **0.2.5** | Install and test Tesseract OCR locally | 1h | None | `tesseract --version` works, test on sample image | Backend Dev | Low |
| **0.2.6** | Install and test EasyOCR | 1h | None | EasyOCR imports successfully, test on Hindi text | Backend Dev | Low |
| **0.2.7** | Create API key rotation strategy document | 30m | 0.2.1-0.2.6 | Document specifies rotation schedule, storage in secrets manager | Tech Lead | Low |
| **0.2.8** | Set up local secrets management (Doppler / HashiCorp Vault local) | 1h | 0.2.7 | Secrets injected at runtime, never in code | DevOps | Medium |

### Sprint 0.3: Database Schema & Migrations (Day 2)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **0.3.1** | Implement PostgreSQL schema (all tables from Design Doc Section 2.2) | 3h | 0.1.3 | `psql -f schema.sql` creates all tables, indexes, triggers | Backend Dev | Medium |
| **0.3.2** | Set up Alembic for database migrations | 1h | 0.3.1 | `alembic revision --autogenerate` works, initial migration created | Backend Dev | Low |
| **0.3.3** | Create seed data: 5 sample patients, 3 sample sessions, 2 sample documents | 1h | 0.3.2 | Seed script runs successfully, data queryable | Backend Dev | Low |
| **0.3.4** | Set up SQLAlchemy models with relationships | 2h | 0.3.1 | All models defined with proper relationships, type hints | Backend Dev | Medium |
| **0.3.5** | Create database connection pool configuration | 1h | 0.3.4 | Pool size: 10, max overflow: 20, pool timeout: 30s | Backend Dev | Low |
| **0.3.6** | Implement audit log trigger function | 1h | 0.3.1 | Any INSERT/UPDATE/DELETE on patient/session tables creates audit record | Backend Dev | Medium |
| **0.3.7** | Write database integration tests (pytest) | 2h | 0.3.4 | 10+ tests covering CRUD, relationships, constraints | Backend Dev | Medium |

### Sprint 0.4: Backend Skeleton (Day 2)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **0.4.1** | Initialize FastAPI project structure | 1h | None | `app/` directory with routers, models, services, utils | Backend Dev | Low |
| **0.4.2** | Implement health check endpoints (`/health`, `/ready`, `/metrics`) | 30m | 0.4.1 | All endpoints return 200 with proper JSON | Backend Dev | Low |
| **0.4.3** | Implement global exception handler | 1h | 0.4.1 | All exceptions return structured error JSON with error codes | Backend Dev | Low |
| **0.4.4** | Implement request/response logging middleware | 1h | 0.4.1 | Every request logged with method, path, status, duration | Backend Dev | Low |
| **0.4.5** | Implement CORS configuration | 30m | 0.4.1 | Frontend can access API from localhost:3000 | Backend Dev | Low |
| **0.4.6** | Implement API versioning (`/api/v1/` prefix) | 30m | 0.4.1 | All routes under `/api/v1/` | Backend Dev | Low |
| **0.4.7** | Set up pytest with async support and test database | 1h | 0.4.1 | `pytest` runs with 0 failures on skeleton | Backend Dev | Low |
| **0.4.8** | Implement dependency injection container | 1h | 0.4.1 | Services injectable via FastAPI Depends | Backend Dev | Medium |

### Sprint 0.5: Frontend Skeleton (Day 2)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **0.5.1** | Initialize React 18 + TypeScript + Vite project | 30m | None | `npm run dev` serves on localhost:3000 | Frontend Dev | Low |
| **0.5.2** | Configure Tailwind CSS with custom theme (hospital colors: blue-600 primary) | 1h | 0.5.1 | Tailwind classes work, custom colors in tailwind.config.js | Frontend Dev | Low |
| **0.5.3** | Set up React Router with route structure | 1h | 0.5.1 | Routes: /, /kiosk, /physician, /admin, /ayush | Frontend Dev | Low |
| **0.5.4** | Set up Zustand store with slices (session, ui, audio) | 1h | 0.5.1 | Store persists session state, devtools enabled | Frontend Dev | Low |
| **0.5.5** | Create API client (axios instance with interceptors) | 1h | 0.5.1 | Base URL configurable, auth header injection, error handling | Frontend Dev | Low |
| **0.5.6** | Create shared UI component library (Button, Card, Modal, Loading, Alert) | 2h | 0.5.2 | 6 components in Storybook-style display page | Frontend Dev | Low |
| **0.5.7** | Implement responsive layout shell (header, main, footer) | 1h | 0.5.6 | Layout adapts to mobile, tablet, desktop | Frontend Dev | Low |
| **0.5.8** | Set up ESLint + Prettier + Husky pre-commit | 30m | 0.5.1 | Pre-commit runs lint and format | Frontend Dev | Low |

---

## PHASE 1: CORE BACKEND — SESSION & PATIENT MANAGEMENT (Days 3-5)
*Goal: Complete CRUD for patients, sessions, conversation history. JWT auth. Redis caching.*

### Sprint 1.1: Patient Management API (Day 3)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **1.1.1** | Implement Patient model with validation (Pydantic) | 1h | 0.3.4 | All fields validated, phone regex, DOB in past | Backend Dev | Low |
| **1.1.2** | Implement POST /api/v1/patients (create with ABHA or walk-in) | 2h | 1.1.1 | Creates patient, returns 201 with patient object | Backend Dev | Medium |
| **1.1.3** | Implement GET /api/v1/patients/{id} | 1h | 1.1.2 | Returns patient with 200, 404 if not found | Backend Dev | Low |
| **1.1.4** | Implement PATCH /api/v1/patients/{id} | 1h | 1.1.2 | Partial update works, only provided fields updated | Backend Dev | Low |
| **1.1.5** | Implement patient search by ABHA ID or phone | 1h | 1.1.2 | Search returns matching patients, fuzzy matching on name | Backend Dev | Low |
| **1.1.6** | Write integration tests for all patient endpoints | 2h | 1.1.2-1.1.5 | 15+ tests, 90%+ coverage | Backend Dev | Medium |
| **1.1.7** | Implement patient data anonymization helper (for research consent) | 1h | 1.1.1 | Function removes PII, retains clinical data | Backend Dev | Low |

### Sprint 1.2: Session Management API (Day 3-4)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **1.2.1** | Implement Session model with JSONB fields for flexible history | 1h | 0.3.4 | Model supports all clinical sections as JSONB | Backend Dev | Medium |
| **1.2.2** | Implement POST /api/v1/sessions (create new session) | 2h | 1.2.1 | Creates session, initializes Redis state, returns session_id + JWT | Backend Dev | Medium |
| **1.2.3** | Implement session state machine (in_progress → completed → under_review → reviewed) | 2h | 1.2.2 | State transitions validated, invalid transitions rejected | Backend Dev | Medium |
| **1.2.4** | Implement GET /api/v1/sessions/{id} with full history | 1h | 1.2.2 | Returns session with nested messages, documents, summary | Backend Dev | Low |
| **1.2.5** | Implement session resume (patient can continue from last question) | 2h | 1.2.3 | GET /sessions/{id}/resume returns current_question_id + context | Backend Dev | Medium |
| **1.2.6** | Implement session timeout handling (auto-save, warning, cleanup) | 2h | 1.2.3 | After 3 min inactivity: warning. After 5 min: auto-save + cleanup | Backend Dev | Medium |
| **1.2.7** | Implement Redis session state caching | 2h | 0.1.3 | Session state cached in Redis, TTL 1 hour, fallback to DB | Backend Dev | Medium |
| **1.2.8** | Write integration tests for session lifecycle | 2h | 1.2.1-1.2.7 | 20+ tests covering create, resume, timeout, state transitions | Backend Dev | Medium |

### Sprint 1.3: Authentication & Authorization (Day 4-5)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **1.3.1** | Implement JWT token generation (access + refresh tokens) | 2h | 0.4.1 | Tokens generated with proper claims, expiry | Backend Dev | Medium |
| **1.3.2** | Implement JWT verification middleware | 1h | 1.3.1 | All protected routes verify JWT, reject expired/invalid | Backend Dev | Medium |
| **1.3.3** | Implement role-based access control (RBAC) with Casbin | 2h | 1.3.2 | Policy file defines roles, middleware enforces permissions | Backend Dev | High |
| **1.3.4** | Implement patient-level data isolation (patients can only access own data) | 1h | 1.3.3 | Patient JWT can only access their sessions | Backend Dev | Medium |
| **1.3.5** | Implement physician assignment (physicians see only assigned sessions) | 1h | 1.3.3 | Physician JWT filters sessions by assignment | Backend Dev | Medium |
| **1.3.6** | Implement API rate limiting (100 req/min per token) | 1h | 0.1.3 | Rate limit returns 429 with Retry-After header | Backend Dev | Low |
| **1.3.7** | Write auth integration tests | 2h | 1.3.1-1.3.6 | 15+ tests for login, token refresh, unauthorized access, RBAC | Backend Dev | Medium |

### Sprint 1.4: Conversation Message API (Day 5)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **1.4.1** | Implement SessionMessage model | 30m | 0.3.4 | Model stores message_type, content, audio_url, confidence | Backend Dev | Low |
| **1.4.2** | Implement POST /api/v1/sessions/{id}/messages | 1h | 1.4.1 | Stores AI question or patient response | Backend Dev | Low |
| **1.4.3** | Implement GET /api/v1/sessions/{id}/messages (paginated) | 1h | 1.4.2 | Returns messages ordered by time, 20 per page | Backend Dev | Low |
| **1.4.4** | Implement conversation history reconstruction | 1h | 1.4.3 | Returns full dialogue in chronological order for LLM context | Backend Dev | Low |
| **1.4.5** | Write message API tests | 1h | 1.4.1-1.4.4 | 8+ tests for CRUD, pagination, ordering | Backend Dev | Low |

---

## PHASE 2: AI SERVICES — ASR, LLM, OCR (Days 6-10)
*Goal: Working voice transcription, clinical structuring, document OCR. This is the AI core.*

### Sprint 2.1: Bhashini ASR Integration (Day 6)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **2.1.1** | Create Bhashini API client wrapper class | 2h | 0.2.1 | Client handles auth, retries, timeout, error mapping | Backend Dev | Medium |
| **2.1.2** | Implement audio preprocessing pipeline (noise reduction, VAD, resampling) | 3h | 2.1.1 | Audio converted to 16kHz mono WAV, silence trimmed | Backend Dev | High |
| **2.1.3** | Implement streaming ASR (chunk audio, send to Bhashini, aggregate) | 3h | 2.1.2 | 10-second chunks processed, results concatenated | Backend Dev | High |
| **2.1.4** | Implement ASR result caching (cache by audio hash) | 1h | 0.1.3 | Same audio returns cached result, TTL 5 minutes | Backend Dev | Low |
| **2.1.5** | Implement ASR fallback chain (Bhashini → Whisper local → touch mode) | 2h | 2.1.3 | If Bhashini fails, tries local Whisper, then falls back to touch | Backend Dev | High |
| **2.1.6** | Create ASR test suite with 20 sample audio clips (Hindi, English, mixed) | 2h | 2.1.3 | Tests verify transcription accuracy >80% on sample clips | Backend Dev | Medium |
| **2.1.7** | Implement real-time transcription WebSocket endpoint | 3h | 2.1.3 | Client sends audio chunks, receives transcription in <3s | Backend Dev | High |
| **2.1.8** | Document ASR latency benchmarks per language | 1h | 2.1.7 | Benchmark report: avg latency, accuracy by language | Backend Dev | Low |

### Sprint 2.2: Clinical Structuring LLM (Day 7-8)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **2.2.1** | Design clinical ontology JSON schema (all history sections) | 2h | None | Schema validates all required fields, types defined | AI Engineer | Medium |
| **2.2.2** | Implement prompt builder with conversation context injection | 3h | 2.2.1 | Prompt includes: system instructions, ontology, conversation history, current state | AI Engineer | Medium |
| **2.2.3** | Implement Gemini API client with structured JSON mode | 2h | 0.2.2 | Client forces JSON output, handles rate limits, retries | AI Engineer | Medium |
| **2.2.4** | Implement SOCRATES question generator based on chief complaint | 3h | 2.2.2 | Given "chest pain", generates SOCRATES questions in sequence | AI Engineer | High |
| **2.2.5** | Implement adaptive branching logic (if chest pain → cardiac ROS; if headache → neuro ROS) | 3h | 2.2.4 | Branching tree with 50+ nodes, each node has conditions and next questions | AI Engineer | High |
| **2.2.6** | Implement response validator (schema validation, required fields check) | 2h | 2.2.1 | Invalid LLM responses trigger retry with stricter prompt | AI Engineer | Medium |
| **2.2.7** | Implement confidence scoring (based on transcription quality + extraction completeness) | 2h | 2.2.6 | Score 0-100 based on: ASR confidence, fields filled, contradictions found | AI Engineer | Medium |
| **2.2.8** | Create few-shot examples dataset (20 examples: Hindi transcript → structured JSON) | 3h | 2.2.2 | Examples cover common complaints: chest pain, fever, diabetes, pregnancy | AI Engineer | Medium |
| **2.2.9** | Implement AYUSH mode prompt extension (Dashavidha Pariksha) | 2h | 2.2.2 | AYUSH prompt adds 10-parameter assessment, dosha scoring | AI Engineer | Medium |
| **2.2.10** | Write LLM integration tests (mock Gemini, test prompt building, test validation) | 2h | 2.2.1-2.2.9 | 15+ tests, mock LLM responses, verify prompt structure | AI Engineer | Medium |
| **2.2.11** | Benchmark LLM response time and cost per session | 1h | 2.2.10 | Report: avg tokens used, cost per session, latency | AI Engineer | Low |

### Sprint 2.3: Red Flag Detection Engine (Day 8)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **2.3.1** | Design red flag ontology (200+ patterns in structured format) | 3h | None | YAML/JSON file with patterns, severity, required/optional indicators | AI Engineer | High |
| **2.3.2** | Implement pattern matching engine (rule-based scoring) | 2h | 2.3.1 | Given structured history, returns match scores for each pattern | AI Engineer | Medium |
| **2.3.3** | Implement LLM verification for borderline cases (score 0.5-0.7) | 2h | 2.3.2 | Ambiguous cases sent to LLM for second opinion | AI Engineer | Medium |
| **2.3.4** | Implement red flag alert creation (database + notification) | 2h | 2.3.3 | Alert record created, WebSocket push to triage station | Backend Dev | Medium |
| **2.3.5** | Implement priority token generation (bypass queue) | 1h | 2.3.4 | Critical alerts generate "P-001" style priority tokens | Backend Dev | Low |
| **2.3.6** | Write red flag tests with 50 test cases (true positives, false positives, edge cases) | 2h | 2.3.1-2.3.5 | 50 test cases, >90% true positive rate, <5% false positive rate | AI Engineer | High |
| **2.3.7** | Create red flag dashboard widget for triage staff | 2h | 2.3.4 | Real-time alert list with patient info, symptoms, severity | Frontend Dev | Medium |

### Sprint 2.4: Document OCR Pipeline (Day 9-10)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **2.4.1** | Implement document upload endpoint (multipart, max 10MB, validate mime type) | 1h | 0.4.1 | Accepts JPEG/PNG/PDF, rejects other types, saves to MinIO | Backend Dev | Low |
| **2.4.2** | Implement image preprocessing (deskew, denoise, binarization, contrast enhancement) | 3h | 2.4.1 | OpenCV pipeline improves OCR accuracy by >15% on test images | Backend Dev | High |
| **2.4.3** | Implement document classification (ResNet-50 fine-tuned or rule-based) | 2h | 2.4.2 | Classifies document type with >90% accuracy | AI Engineer | Medium |
| **2.4.4** | Implement OCR engine selection (printed → Tesseract, handwritten → EasyOCR, poor quality → Vision API) | 2h | 2.4.3 | Auto-selects best engine based on image quality metrics | Backend Dev | Medium |
| **2.4.5** | Implement medical NER extraction (drugs, dosages, diagnoses, lab values) | 3h | 2.4.4 | Extracts entities with spaCy/regex + LLM fallback | AI Engineer | High |
| **2.4.6** | Implement date parsing and chronological ordering | 2h | 2.4.5 | Parses multiple date formats, orders documents by date | Backend Dev | Medium |
| **2.4.7** | Implement abnormal lab value detection (compare against reference ranges) | 2h | 2.4.5 | Flags out-of-range values with color coding | Backend Dev | Medium |
| **2.4.8** | Implement drug interaction checking (against current medication list) | 2h | 2.4.5 | Checks for known interactions, severity classification | AI Engineer | Medium |
| **2.4.9** | Create document timeline visualization data structure | 1h | 2.4.6 | JSON structure ready for frontend timeline rendering | Backend Dev | Low |
| **2.4.10** | Write OCR integration tests (10 sample documents: prescriptions, lab reports, discharge summaries) | 2h | 2.4.1-2.4.9 | 10 tests, verify extraction accuracy >75% | AI Engineer | Medium |
| **2.4.11** | Create document processing status tracking (pending → processing → completed → failed) | 1h | 2.4.1 | Status updates visible via API and WebSocket | Backend Dev | Low |

---

## PHASE 3: FRONTEND — KIOSK UI & PHYSICIAN DASHBOARD (Days 11-15)
*Goal: Complete patient-facing kiosk flow, physician review interface, admin analytics*

### Sprint 3.1: Kiosk Language & Onboarding Screens (Day 11)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **3.1.1** | Implement language selection screen with 12 languages + icons + audio | 2h | 0.5.1 | Screen shows grid of languages, each with flag/icon, audio plays on hover | Frontend Dev | Low |
| **3.1.2** | Implement ABHA ID input screen (manual entry + QR scan simulation) | 2h | 3.1.1 | Input field with validation, QR scan placeholder (camera access) | Frontend Dev | Medium |
| **3.1.3** | Implement walk-in registration screen (minimal fields: name, age, gender, phone) | 2h | 3.1.1 | Form with large touch targets, voice input for name | Frontend Dev | Low |
| **3.1.4** | Implement consent collection screen (granular toggles + audio explanation) | 3h | 3.1.1 | 5 consent toggles, each with info icon, audio plays consent text | Frontend Dev | Medium |
| **3.1.5** | Implement low-literacy mode toggle (icon-only + audio) | 2h | 3.1.1 | When enabled, text hidden, icons enlarged, audio prompts mandatory | Frontend Dev | Medium |
| **3.1.6** | Implement progress indicator (step 1 of 5) | 1h | 3.1.1 | Visual progress bar at top of kiosk | Frontend Dev | Low |
| **3.1.7** | Add haptic feedback on all touch interactions | 30m | 3.1.1 | Vibration API triggers on button press (supported devices) | Frontend Dev | Low |
| **3.1.8** | Implement emergency help button (always visible, connects to attendant) | 1h | 3.1.1 | Button triggers alert sound, shows "Help is coming" message | Frontend Dev | Low |

### Sprint 3.2: Voice Interview Screen (Day 12-13)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **3.2.1** | Implement Web Audio API recording (start/stop, visualize waveform) | 3h | 0.5.1 | Record button shows live waveform, stop button ends recording | Frontend Dev | High |
| **3.2.2** | Implement audio chunking and streaming to backend WebSocket | 2h | 3.2.1 | Audio sent in 5-second chunks, real-time transcription display | Frontend Dev | High |
| **3.2.3** | Implement transcription display with confidence indicator | 2h | 3.2.2 | Text appears with color-coded confidence (green >90%, yellow 70-90%, red <70%) | Frontend Dev | Medium |
| **3.2.4** | Implement "Did we hear you correctly?" confirmation flow | 2h | 3.2.3 | Patient can confirm (proceed) or re-record | Frontend Dev | Medium |
| **3.2.5** | Implement touch-based answer alternatives for every question | 3h | 3.2.1 | Multiple choice, sliders, yes/no buttons, body diagram tap | Frontend Dev | High |
| **3.2.6** | Implement body diagram component (tap to indicate pain location) | 3h | 3.2.5 | SVG body diagram, tap highlights area, supports front/back view | Frontend Dev | Medium |
| **3.2.7** | Implement pain scale slider (1-10 visual) | 1h | 3.2.5 | Emoji-based pain scale, draggable slider | Frontend Dev | Low |
| **3.2.8** | Implement question navigation (back, skip, repeat audio) | 2h | 3.2.1 | Back button goes to previous question, skip available for non-critical | Frontend Dev | Medium |
| **3.2.9** | Implement SOCRATES question sequence UI | 2h | 3.2.5 | Questions flow in SOCRATES order with progress indicator | Frontend Dev | Medium |
| **3.2.10** | Implement red flag alert overlay (full screen, audio alarm, priority token) | 2h | 2.3.4 | Overlay blocks UI, shows emergency instructions, prints token | Frontend Dev | Medium |
| **3.2.11** | Implement session timeout warning (countdown modal) | 1h | 1.2.6 | 30-second countdown, option to continue | Frontend Dev | Low |
| **3.2.12** | Add TTS for all questions (Web Speech API or backend TTS) | 2h | 3.2.1 | Every question spoken aloud in selected language | Frontend Dev | Medium |

### Sprint 3.3: Document Upload Screen (Day 13-14)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **3.3.1** | Implement camera capture component (getUserMedia API) | 2h | 0.5.1 | Camera preview, capture button, retake option | Frontend Dev | Medium |
| **3.3.2** | Implement file upload dropzone (drag & drop + click) | 1h | 3.3.1 | Visual dropzone, file validation, progress bar | Frontend Dev | Low |
| **3.3.3** | Implement multi-page document handling (reorder, delete pages) | 2h | 3.3.2 | Thumbnail grid, drag to reorder, X to delete | Frontend Dev | Medium |
| **3.3.4** | Implement document preview with zoom/pan | 1h | 3.3.3 | Pinch to zoom, pan, full-screen view | Frontend Dev | Low |
| **3.3.5** | Implement document type selector (prescription, lab, discharge, etc.) | 1h | 3.3.1 | Dropdown with icons, auto-suggest based on OCR | Frontend Dev | Low |
| **3.3.6** | Implement processing status indicator (spinner → checkmark) | 1h | 2.4.11 | Real-time status updates via WebSocket | Frontend Dev | Low |
| **3.3.7** | Implement extracted data preview (editable table of medications, diagnoses) | 2h | 2.4.5 | Table shows extracted entities, patient can correct | Frontend Dev | Medium |
| **3.3.8** | Implement document timeline preview | 1h | 2.4.9 | Vertical timeline showing all uploaded documents by date | Frontend Dev | Low |

### Sprint 3.4: Summary & Completion Screen (Day 14)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **3.4.1** | Implement summary generation loading screen | 1h | 3.2.12 | Animated loader with "Preparing your summary..." message | Frontend Dev | Low |
| **3.4.2** | Implement patient-facing summary confirmation (audio readout in local language) | 2h | 3.4.1 | Summary read aloud, patient confirms accuracy | Frontend Dev | Medium |
| **3.4.3** | Implement token number display (OPD queue position) | 1h | 3.4.2 | Large display: "Your token: A-42", estimated wait time | Frontend Dev | Low |
| **3.4.4** | Implement "Thank you" screen with next steps | 30m | 3.4.3 | Simple screen with directions to waiting area | Frontend Dev | Low |
| **3.4.5** | Implement session data cleanup on completion | 1h | 3.4.4 | Local storage cleared, sensitive data removed from browser | Frontend Dev | Low |

### Sprint 3.5: Physician Dashboard (Day 14-15)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **3.5.1** | Implement physician login screen | 1h | 1.3.1 | Username/password, JWT stored in memory | Frontend Dev | Low |
| **3.5.2** | Implement patient queue list (pending summaries, sortable by priority) | 2h | 3.5.1 | List shows patient name, chief complaint, wait time, red flag badge | Frontend Dev | Medium |
| **3.5.3** | Implement auto-refresh queue (WebSocket or polling every 5 seconds) | 1h | 3.5.2 | New patients appear automatically, sound notification | Frontend Dev | Low |
| **3.5.4** | Implement summary detail view (structured sections, expandable) | 3h | 3.5.2 | All history sections displayed, abnormal values highlighted | Frontend Dev | Medium |
| **3.5.5** | Implement inline editing for all summary fields | 2h | 3.5.4 | Click to edit, save/cancel, auto-save draft | Frontend Dev | Medium |
| **3.5.6** | Implement document viewer in summary (thumbnails, full view) | 2h | 3.5.4 | Side panel shows document thumbnails, click to view full | Frontend Dev | Medium |
| **3.5.7** | Implement timeline visualization (medical history timeline) | 2h | 3.5.6 | Horizontal timeline with document markers, zoomable | Frontend Dev | Medium |
| **3.5.8** | Implement confirm/amend/reject actions | 1h | 3.5.4 | Three buttons, confirmation modal, status update | Frontend Dev | Low |
| **3.5.9** | Implement red flag alert banner in summary view | 1h | 2.3.4 | Red banner with symptoms, severity, time detected | Frontend Dev | Low |
| **3.5.10** | Implement AYUSH summary view (dosha scores, tridosha diagram) | 2h | 3.5.4 | Visual tridosha chart, parameter scores, nidana/samprapti text | Frontend Dev | Medium |
| **3.5.11** | Implement search/filter in queue (by name, complaint, date) | 1h | 3.5.2 | Search bar filters queue in real-time | Frontend Dev | Low |
| **3.5.12** | Implement physician performance metrics (patients seen, avg review time) | 1h | 3.5.1 | Simple stats cards on dashboard | Frontend Dev | Low |

### Sprint 3.6: Admin Dashboard (Day 15)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **3.6.1** | Implement admin login + role check | 30m | 1.3.3 | Rejects non-admin users | Frontend Dev | Low |
| **3.6.2** | Implement real-time OPD metrics (active kiosks, sessions today, avg duration) | 2h | 3.6.1 | Auto-updating cards with current numbers | Frontend Dev | Low |
| **3.6.3** | Implement queue visualization (live queue length by department) | 1h | 3.6.2 | Bar chart showing queue per department | Frontend Dev | Low |
| **3.6.4** | Implement kiosk status monitoring (online/offline, last ping) | 1h | 3.6.1 | Table of kiosks with status indicators | Frontend Dev | Low |
| **3.6.5** | Implement audit log viewer (filterable by user, action, date) | 2h | 0.3.6 | Table with pagination, export to CSV | Frontend Dev | Medium |
| **3.6.6** | Implement consent management view (consent rates by type) | 1h | 3.6.1 | Pie chart showing consent statistics | Frontend Dev | Low |
| **3.6.7** | Implement ASR accuracy report (by language, over time) | 1h | 2.1.8 | Line chart of ASR accuracy trends | Frontend Dev | Low |
| **3.6.8** | Implement red flag report (alerts today, response times) | 1h | 2.3.7 | Table of alerts with resolution status | Frontend Dev | Low |

---

## PHASE 4: INTEGRATION & ABDM (Days 16-18)
*Goal: Connect all modules, ABDM FHIR integration, HIS push, end-to-end flow*

### Sprint 4.1: Summary Generator Service (Day 16)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **4.1.1** | Implement summary synthesis prompt (combine conversation + documents) | 2h | 2.2.2 | Prompt instructs LLM to synthesize all data into structured summary | AI Engineer | Medium |
| **4.1.2** | Implement bilingual summary generation (patient language + English for physician) | 2h | 4.1.1 | Two versions generated: audio script in Hindi, text in English | AI Engineer | Medium |
| **4.1.3** | Implement confidence scoring for final summary | 1h | 2.2.7 | Composite score based on data completeness, consistency, source confidence | AI Engineer | Low |
| **4.1.4** | Implement summary storage and linking to session | 1h | 4.1.2 | Summary saved to DB, accessible via API | Backend Dev | Low |
| **4.1.5** | Implement summary generation trigger (on session completion) | 1h | 4.1.4 | Auto-triggered when patient clicks "Finish", async processing | Backend Dev | Low |
| **4.1.6** | Write summary generator tests | 1h | 4.1.1-4.1.5 | 5 tests with sample data, verify output structure | AI Engineer | Low |

### Sprint 4.2: ABDM Integration (Day 16-17)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **4.2.1** | Implement ABHA ID verification API client | 2h | 0.2.3 | Calls ABDM sandbox verify endpoint, handles OTP flow | Backend Dev | High |
| **4.2.2** | Implement FHIR R4 resource mapping (all MediKiosk data → FHIR) | 3h | Design Doc App B | Patient, Condition, MedicationStatement, Observation, Composition resources | Backend Dev | High |
| **4.2.3** | Implement FHIR Bundle assembly | 2h | 4.2.2 | Bundle created with proper references, valid per FHIR spec | Backend Dev | Medium |
| **4.2.4** | Implement ABDM consent artifact generation | 2h | 4.2.1 | Consent resource created per ABDM framework | Backend Dev | Medium |
| **4.2.5** | Implement HIE push API (POST to ABDM notify endpoint) | 2h | 4.2.3 | Bundle pushed, transaction ID returned, status tracked | Backend Dev | High |
| **4.2.6** | Implement HIS/EMR push adapter (configurable webhook) | 2h | 4.1.4 | POST summary to hospital HIS endpoint, configurable URL | Backend Dev | Medium |
| **4.2.7** | Implement ABDM error handling and retry logic | 1h | 4.2.5 | Exponential backoff, max 3 retries, dead letter queue | Backend Dev | Medium |
| **4.2.8** | Write ABDM integration tests (mock ABDM server) | 2h | 4.2.1-4.2.7 | Mock server verifies FHIR bundle structure, consent validity | Backend Dev | Medium |

### Sprint 4.3: Consent & Privacy (Day 17)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **4.3.1** | Implement granular consent collection API | 2h | 1.1.2 | 5 consent types, each stored independently | Backend Dev | Medium |
| **4.3.2** | Implement consent revocation API | 1h | 4.3.1 | Patient can revoke any consent before submission | Backend Dev | Low |
| **4.3.3** | Implement consent audit trail | 1h | 4.3.1 | Every consent action logged with timestamp, IP, audio hash | Backend Dev | Low |
| **4.3.4** | Implement data retention policy enforcement | 2h | 4.3.1 | Auto-delete voice after 24h, session archive after 7 years | Backend Dev | Medium |
| **4.3.5** | Implement data principal rights (export, correction, deletion) | 2h | 4.3.1 | APIs for: export FHIR bundle, request correction, request deletion | Backend Dev | Medium |
| **4.3.6** | Implement encryption at rest verification | 1h | 0.3.1 | Verify TDE active on PostgreSQL, SSE on MinIO | DevOps | Low |
| **4.3.7** | Write DPDP compliance tests | 2h | 4.3.1-4.3.6 | Tests verify consent flow, audit trails, data isolation | Backend Dev | Medium |

### Sprint 4.4: End-to-End Integration (Day 18)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **4.4.1** | Implement complete patient journey API flow test | 3h | ALL PRIOR | Script simulates: create session → voice input → document upload → summary → ABDM push | Backend Dev | High |
| **4.4.2** | Implement WebSocket integration between kiosk and physician dashboard | 2h | 3.2.2, 3.5.3 | Real-time push: new patient → appears on physician screen in <2s | Backend Dev | High |
| **4.4.3** | Implement queue management integration (token generation, priority handling) | 2h | 2.3.5 | Token generated on completion, priority patients skip queue | Backend Dev | Medium |
| **4.4.4** | Implement error recovery flows (network down, ASR fail, LLM timeout) | 2h | ALL PRIOR | Graceful degradation: touch fallback, local storage, retry queues | Backend Dev | High |
| **4.4.5** | Performance testing: 50 concurrent sessions | 2h | 4.4.1 | System handles 50 concurrent sessions, <5s response time | Backend Dev | Medium |
| **4.4.6** | End-to-end demo script preparation | 2h | 4.4.1-4.4.5 | Documented demo flow with sample data, timing | Product Manager | Low |

---

## PHASE 5: TESTING, QA & POLISH (Days 19-20)
*Goal: Comprehensive testing, bug fixes, UI polish, documentation*

### Sprint 5.1: Testing (Day 19)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **5.1.1** | Write unit tests for all service layers (target: 80% coverage) | 4h | ALL PRIOR | pytest coverage report shows >80% | Backend Dev | Medium |
| **5.1.2** | Write integration tests for all API endpoints | 3h | ALL PRIOR | All endpoints tested with happy path and error cases | Backend Dev | Medium |
| **5.1.3** | Write frontend component tests (React Testing Library) | 3h | ALL PRIOR | 30+ component tests, all passing | Frontend Dev | Medium |
| **5.1.4** | Conduct usability testing with 3 non-technical users | 2h | ALL PRIOR | Users can complete session without assistance | Product Manager | Medium |
| **5.1.5** | Conduct accessibility audit (WCAG 2.1 AA checklist) | 2h | ALL PRIOR | All AA criteria met or documented exceptions | Frontend Dev | Medium |
| **5.1.6** | Security audit: OWASP Top 10 scan | 2h | ALL PRIOR | No critical or high vulnerabilities | DevOps | High |
| **5.1.7** | Load testing: 100 concurrent users | 2h | ALL PRIOR | System stable, <3s avg response time | DevOps | Medium |

### Sprint 5.2: Bug Fixes & Polish (Day 19-20)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **5.2.1** | Fix all P0 and P1 bugs from testing | 4h | 5.1.1-5.1.7 | Zero P0/P1 bugs remaining | All Devs | High |
| **5.2.2** | UI polish: animations, transitions, loading states | 2h | 5.2.1 | Smooth 300ms transitions, no jarring state changes | Frontend Dev | Low |
| **5.2.3** | Mobile responsiveness final check | 1h | 5.2.1 | Kiosk UI works on 10" tablet, physician dashboard on laptop | Frontend Dev | Low |
| **5.2.4** | Error message localization (all 12 languages) | 2h | 5.2.1 | All user-facing errors in selected language | Frontend Dev | Medium |
| **5.2.5** | Final data seeding for demo (10 realistic patient scenarios) | 2h | 5.2.1 | 10 complete demo scenarios with audio, documents, summaries | Product Manager | Low |
| **5.2.6** | Performance optimization (image lazy loading, API caching) | 2h | 5.2.1 | Lighthouse score >80 on kiosk, >90 on dashboard | Frontend Dev | Medium |

### Sprint 5.3: Documentation (Day 20)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **5.3.1** | Write API documentation (OpenAPI/Swagger) | 2h | ALL PRIOR | Swagger UI accessible at /docs, all endpoints documented | Backend Dev | Low |
| **5.3.2** | Write deployment guide (Docker, Kubernetes) | 2h | ALL PRIOR | New developer can deploy in <30 minutes following guide | DevOps | Low |
| **5.3.3** | Write user manual for kiosk (illustrated, multilingual) | 2h | ALL PRIOR | 5-page visual guide for hospital staff | Product Manager | Low |
| **5.3.4** | Write SIH submission document (problem, solution, innovation, impact) | 3h | ALL PRIOR | 10-page document with screenshots, architecture diagram | Product Manager | Low |
| **5.3.5** | Create demo video (3-minute walkthrough) | 2h | 5.2.5 | Screen recording with voiceover, shows complete patient journey | Product Manager | Low |
| **5.3.6** | Prepare pitch deck (10 slides) | 2h | 5.3.4 | Covers: problem, solution, tech stack, demo, impact, roadmap | Product Manager | Low |

---

## PHASE 6: DEPLOYMENT & DEMO PREP (Day 20-21)
*Goal: Production deployment, final demo rehearsal, team presentation*

### Sprint 6.1: Production Deployment (Day 20)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **6.1.1** | Build production Docker images | 1h | 5.2.1 | All services built with `--target production` | DevOps | Low |
| **6.1.2** | Deploy to cloud instance (AWS EC2 / Azure VM) | 2h | 6.1.1 | Application accessible via public IP/domain | DevOps | Medium |
| **6.1.3** | Configure SSL certificate (Let's Encrypt) | 1h | 6.1.2 | HTTPS enforced, certificate valid | DevOps | Low |
| **6.1.4** | Configure environment variables for production | 30m | 6.1.2 | Production DB, Redis, API keys configured | DevOps | Low |
| **6.1.5** | Run smoke tests on production | 1h | 6.1.4 | All critical paths tested on production URL | Backend Dev | Medium |
| **6.1.6** | Set up log aggregation and monitoring | 1h | 6.1.2 | Logs visible in Kibana/Grafana, alerts configured | DevOps | Low |

### Sprint 6.2: Demo Rehearsal (Day 20-21)

| Task ID | Description | Effort | Dependencies | Acceptance Criteria | Role | Risk |
|---------|-------------|--------|-------------|---------------------|------|------|
| **6.2.1** | Full demo run-through (patient journey + physician dashboard) | 1h | 6.1.5 | Complete flow in <5 minutes, no errors | All Team | Medium |
| **6.2.2** | Prepare demo backup plan (pre-recorded video if live fails) | 1h | 6.2.1 | 5-minute backup video ready on USB + cloud | Product Manager | Low |
| **6.2.3** | Prepare Q&A responses (expected judge questions) | 1h | ALL PRIOR | Document with 20 anticipated questions + answers | Product Manager | Low |
| **6.2.4** | Prepare technical deep-dive responses | 1h | ALL PRIOR | Architecture, scalability, security answers ready | Tech Lead | Low |
| **6.2.5** | Final team presentation rehearsal | 1h | 6.2.1 | Timing: 10-min pitch + 5-min demo + 5-min Q&A | All Team | Low |
| **6.2.6** | Prepare printed handouts (architecture diagram, feature list) | 30m | ALL PRIOR | 10 copies printed | Product Manager | Low |

---

## FEATURE IMPLEMENTATION MATRIX

### Must-Have (P0) — SIH MVP
| Feature | Phase | Sprint | Status |
|---------|-------|--------|--------|
| Patient session creation | 1 | 1.2 | Required |
| Voice recording + ASR (Hindi + English) | 2 | 2.1 | Required |
| Clinical history structuring (allopathic) | 2 | 2.2 | Required |
| Chief complaint + HPI (SOCRATES) | 2 | 2.2 | Required |
| Red flag detection (top 10 emergencies) | 2 | 2.3 | Required |
| Document upload + OCR (prescriptions) | 2 | 2.4 | Required |
| Summary generation | 4 | 4.1 | Required |
| Physician dashboard (view + confirm) | 3 | 3.5 | Required |
| ABHA ID verification | 4 | 4.2 | Required |
| Consent collection | 4 | 4.3 | Required |
| Kiosk UI (language select → voice → summary) | 3 | 3.1-3.4 | Required |

### Should-Have (P1) — Post-SIH Enhancement
| Feature | Phase | Sprint | Status |
|---------|-------|--------|--------|
| AYUSH history mode (Dashavidha Pariksha) | 2 | 2.2 | P1 |
| Full ABDM FHIR push | 4 | 4.2 | P1 |
| HIS/EMR webhook integration | 4 | 4.2 | P1 |
| 12-language ASR support | 2 | 2.1 | P1 |
| Handwritten prescription OCR | 2 | 2.4 | P1 |
| Drug interaction checking | 2 | 2.4 | P1 |
| Admin analytics dashboard | 3 | 3.6 | P1 |
| Offline mode | 4 | 4.4 | P1 |

### Nice-to-Have (P2) — Future Roadmap
| Feature | Phase | Sprint | Status |
|---------|-------|--------|--------|
| Multi-hospital deployment | 6 | Post-SIH | P2 |
| AI model fine-tuning on hospital data | 6 | Post-SIH | P2 |
| Patient mobile app | 6 | Post-SIH | P2 |
| Telemedicine integration | 6 | Post-SIH | P2 |
| Predictive analytics (readmission risk) | 6 | Post-SIH | P2 |
| Blockchain audit trail | 6 | Post-SIH | P2 |

---

## RISK MITIGATION PLAN

| Risk | Probability | Impact | Mitigation Strategy | Owner |
|------|-------------|--------|---------------------|-------|
| Bhashini ASR unavailable | Medium | Critical | Fallback to Whisper local model; touch-only mode | Backend Dev |
| Gemini API rate limit | Medium | High | Implement request queuing, caching, local LLM fallback (Llama 3) | AI Engineer |
| OCR accuracy <75% | High | Medium | Human verification queue, confidence flags, manual entry fallback | AI Engineer |
| Frontend performance on low-end tablet | Medium | High | Optimize bundle size (<500KB), lazy loading, reduce re-renders | Frontend Dev |
| ABDM sandbox unstable | Medium | Medium | Mock ABDM for demo, document production integration path | Backend Dev |
| Team member unavailable | Low | High | Cross-train on critical components, document all code | Tech Lead |
| Scope creep | High | High | Strict P0/P1/P2 classification, daily standup scope review | Product Manager |

---

## DAILY STANDUP TEMPLATE

```
Date: [DD/MM/YYYY]
Sprint: [X.Y]

1. What did you complete yesterday?
   - [Task IDs completed]

2. What will you work on today?
   - [Task IDs planned]

3. Blockers?
   - [Any dependencies, technical issues]

4. Scope changes?
   - [Any new requirements or descoping]

5. Demo readiness?
   - [Percentage complete by module]
```

---

## DEFINITION OF DONE

For every task in this plan:
- [ ] Code written and committed to feature branch
- [ ] Code reviewed by at least 1 team member
- [ ] Unit/integration tests written and passing
- [ ] No linting errors
- [ ] Documentation updated (code comments + README if applicable)
- [ ] Demo-verified (works in the full flow)
- [ ] Merged to main branch

---

## POST-SIH ROADMAP

| Quarter | Milestone | Key Deliverables |
|---------|-----------|------------------|
| **Q1 2027** | Pilot Deployment | 1 government hospital, 5 kiosks, 500 patients/day |
| **Q2 2027** | AYUSH Launch | Dashavidha Pariksha live in 3 AYUSH hospitals |
| **Q3 2027** | Scale & Optimize | 10 hospitals, ASR accuracy >90%, OCR >85% |
| **Q4 2027** | Full ABDM Integration | Production FHIR push, ABHA linkage >90% |
| **Q1 2028** | AI Enhancement | Fine-tuned models, predictive analytics, research module |
| **Q2 2028** | National Expansion | 50+ hospitals across 10 states, multilingual expansion |

---

Document Owner: MediKiosk Project Team
Last Updated: September 2026
Next Review: Post-SIH Demo
