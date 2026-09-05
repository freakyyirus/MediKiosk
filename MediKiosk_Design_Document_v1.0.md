# TECHNICAL DESIGN DOCUMENT (TDD)
# MediKiosk — AI-Powered Clinical History & Document Digitization Platform
# Version: 1.0 | Date: September 2026
# Classification: Internal — Smart India Hackathon 2026 Submission

---

## 1. SYSTEM ARCHITECTURE

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Kiosk Tablet │  │  Smartphone  │  │  Doctor WS   │  │  Admin Dash  │   │
│  │  (React PWA) │  │  (Camera QR) │  │   (React)    │  │   (React)    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
└─────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │                 │
          └─────────────────┴─────────────────┴─────────────────┘
                                    │
                              HTTPS/WSS
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY LAYER                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    Kong / Nginx API Gateway                             │  │
│  │  • Rate Limiting (100 req/min per kiosk)                               │  │
│  │  • JWT Authentication                                                  │  │
│  │  • Request/Response Logging                                            │  │
│  │  • SSL Termination                                                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER (FastAPI)                          │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Session Mgmt   │  │  History Engine │  │  Document AI    │              │
│  │   Service       │  │   Service       │  │   Service       │              │
│  │                 │  │                 │  │                 │              │
│  │ • Create/Resume │  │ • Dialogue Mgr  │  │ • OCR Pipeline  │              │
│  │ • State Machine │  │ • ASR Bridge    │  │ • NER Extraction│              │
│  │ • Token Gen     │  │ • LLM Prompting │  │ • Timeline Gen  │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                  │                  │                         │
│  ┌────────┴──────────────────┴──────────────────┴────────┐                │
│  │              Summary Generator Service                 │                │
│  │         (Conversational + Document Synthesis)          │                │
│  └────────────────────────┬─────────────────────────────┘                │
│                           │                                                │
│  ┌────────────────────────┴─────────────────────────────┐                    │
│  │              Consent & Security Service              │                    │
│  │         (DPDP Compliance, ABDM Consent Mgmt)         │                    │
│  └────────────────────────┬─────────────────────────────┘                    │
│                           │                                                │
│  ┌────────────────────────┴─────────────────────────────┐                    │
│  │              ABDM Integration Service                │                    │
│  │         (FHIR Bundle Gen, HIE Push, ABHA Link)     │                    │
│  └─────────────────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI/ML SERVICES LAYER                                 │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Bhashini ASR  │  │   LLM Engine    │  │   OCR Engine    │              │
│  │   (External)    │  │   (Gemini/GPT)  │  │   (Tesseract +  │              │
│  │                 │  │                 │  │    EasyOCR +    │              │
│  │ • Hindi ASR     │  │ • Clinical      │  │    Vision API)  │              │
│  │ • 22 Languages  │  │   Structuring   │  │                 │              │
│  │ • Accent Adapt  │  │ • Summarization │  │ • Printed Text  │              │
│  │                 │  │ • Red Flag      │  │ • Handwriting   │              │
│  │                 │  │   Detection     │  │ • Multilingual  │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │                    Vector DB (Clinical Knowledge)                       ││
│  │  • Symptom-Disease Embeddings                                           ││
│  │  • Drug Interaction Graph                                               ││
│  │  • Red Flag Pattern Matching                                            ││
│  └────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                          │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   PostgreSQL    │  │     Redis       │  │    MinIO/S3     │              │
│  │   (Primary DB)  │  │   (Cache/Queue) │  │  (File Storage) │              │
│  │                 │  │                 │  │                 │              │
│  │ • Patient Data  │  │ • Session State │  │ • Audio Files   │              │
│  │ • Sessions      │  │ • Active Queues │  │ • Documents     │              │
│  │ • Summaries     │  │ • Rate Limits   │  │ • OCR Images    │              │
│  │ • Audit Logs    │  │ • Pub/Sub       │  │ • Backups       │              │
│  │ • FHIR Bundles  │  │                 │  │                 │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL INTEGRATIONS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   ABDM HIE   │  │   Hospital   │  │   Bhashini   │  │   MeitY/     │   │
│  │   (FHIR)     │  │    HIS/EMR   │  │    Platform  │  │   STQC       │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Microservices Breakdown

| Service | Responsibility | Tech Stack | Scaling |
|---------|---------------|------------|---------|
| **Session Service** | CRUD for patient sessions, state management | FastAPI, SQLAlchemy, Redis | 3 replicas |
| **History Engine** | Dialogue management, ASR orchestration, clinical structuring | FastAPI, LangChain, Bhashini SDK | 5 replicas |
| **Document AI** | OCR, NER, timeline generation | FastAPI, Tesseract, OpenCV, spaCy | 3 replicas |
| **Summary Service** | Synthesis of history + documents into physician summary | FastAPI, Gemini API | 3 replicas |
| **Consent Service** | DPDP compliance, consent lifecycle, audit | FastAPI, PostgreSQL | 2 replicas |
| **ABDM Service** | FHIR mapping, HIE push, ABHA verification | FastAPI, HAPI FHIR client | 2 replicas |
| **Notification Service** | Push alerts, SMS, email for red flags | FastAPI, Firebase FCM, Twilio | 2 replicas |
| **Analytics Service** | Metrics aggregation, reporting | FastAPI, TimescaleDB | 2 replicas |

---

## 2. DATABASE DESIGN

### 2.1 Entity Relationship Diagram (Conceptual)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Patient   │◄─────►│   Session   │◄─────►│   Document  │
│             │  1:M  │             │  1:M  │             │
└─────────────┘       └──────┬──────┘       └─────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌─────────┐   ┌──────────┐   ┌──────────┐
        │ History │   │ Summary  │   │  Consent │
        │  Entry  │   │          │   │  Record  │
        └─────────┘   └──────────┘   └──────────┘
```

### 2.2 PostgreSQL Schema

```sql
-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE patients (
    id BIGSERIAL PRIMARY KEY,
    abha_id VARCHAR(32) UNIQUE,
    aadhaar_hash VARCHAR(64), -- SHA-256 hashed
    name VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    phone VARCHAR(15),
    email VARCHAR(255),
    address TEXT,
    language_preference VARCHAR(10) DEFAULT 'hi',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT REFERENCES patients(id),
    kiosk_id VARCHAR(50),
    department VARCHAR(50) DEFAULT 'allopathy', -- allopathy, ayurveda, unani, siddha, homeopathy
    language VARCHAR(10) DEFAULT 'hi',
    status VARCHAR(20) DEFAULT 'in_progress' 
        CHECK (status IN ('in_progress', 'completed', 'under_review', 'reviewed', 'cancelled')),

    -- Clinical Data (JSONB for flexibility)
    chief_complaint TEXT,
    history_hpi JSONB, -- SOCRATES structured
    past_medical_history JSONB,
    past_surgical_history JSONB,
    drug_history JSONB,
    allergy_history JSONB,
    family_history JSONB,
    personal_history JSONB,
    review_of_systems JSONB,
    ayush_assessment JSONB, -- Dashavidha Pariksha

    -- AI Metadata
    asr_transcript TEXT,
    asr_confidence DECIMAL(4,3),
    llm_raw_response TEXT,
    confidence_score DECIMAL(5,2),
    red_flags JSONB,

    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,

    -- ABDM
    abdm_consent_id VARCHAR(100),
    fhir_bundle_id VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_patient ON sessions(patient_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_kiosk ON sessions(kiosk_id);
CREATE INDEX idx_sessions_created ON sessions(created_at);

CREATE TABLE session_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
    message_type VARCHAR(20) CHECK (message_type IN ('ai_question', 'patient_voice', 'patient_touch', 'system')),
    content TEXT,
    audio_url VARCHAR(500),
    confidence DECIMAL(4,3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_session ON session_messages(session_id);

CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
    patient_id BIGINT REFERENCES patients(id),

    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size_bytes INTEGER,
    mime_type VARCHAR(50),

    document_type VARCHAR(50), -- prescription, lab_report, discharge_summary, imaging, insurance, other
    document_date DATE,
    hospital_name VARCHAR(255),
    doctor_name VARCHAR(255),

    -- OCR Results
    ocr_raw_text TEXT,
    ocr_confidence DECIMAL(4,3),

    -- Structured Extraction
    extracted_diagnoses JSONB,
    extracted_medications JSONB,
    extracted_lab_results JSONB,
    extracted_procedures JSONB,
    extracted_vitals JSONB,

    processing_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_session ON documents(session_id);
CREATE INDEX idx_documents_patient ON documents(patient_id);
CREATE INDEX idx_documents_type ON documents(document_type);

CREATE TABLE summaries (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
    patient_id BIGINT REFERENCES patients(id),

    summary_text TEXT,
    summary_format VARCHAR(20) DEFAULT 'structured_text',

    physician_id BIGINT,
    physician_edits JSONB,
    review_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (review_status IN ('pending', 'confirmed', 'amended', 'rejected')),
    reviewed_at TIMESTAMP,

    -- ABDM
    fhir_bundle JSONB,
    pushed_to_abdm BOOLEAN DEFAULT FALSE,
    pushed_to_his BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_summaries_session ON summaries(session_id);
CREATE INDEX idx_summaries_status ON summaries(review_status);

CREATE TABLE consent_records (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
    patient_id BIGINT REFERENCES patients(id),

    consent_type VARCHAR(50), -- data_capture, his_share, abdm_link, referral_share, research
    granted BOOLEAN DEFAULT FALSE,
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,

    -- Audit
    ip_address INET,
    kiosk_id VARCHAR(50),
    audio_consent_hash VARCHAR(64), -- Hash of consent audio recording

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consent_session ON consent_records(session_id);

CREATE TABLE red_flag_alerts (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES sessions(id),
    patient_id BIGINT REFERENCES patients(id),

    alert_type VARCHAR(100), -- chest_pain_mi, stroke, gi_bleed, etc.
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium')),
    symptoms_triggered JSONB,
    transcript_snippet TEXT,

    notified_roles JSONB, -- [{role: 'triage_nurse', notified_at: ..., acknowledged: ...}]
    priority_token VARCHAR(20),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100)
);

CREATE INDEX idx_alerts_session ON red_flag_alerts(session_id);
CREATE INDEX idx_alerts_severity ON red_flag_alerts(severity);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50),
    record_id BIGINT,
    action VARCHAR(20) CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')),
    performed_by VARCHAR(100),
    performed_by_role VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_user ON audit_logs(performed_by);
CREATE INDEX idx_audit_time ON audit_logs(created_at);

-- ============================================
-- AYUSH-SPECIFIC TABLES
-- ============================================

CREATE TABLE ayush_assessments (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,

    prakriti_vata DECIMAL(3,1),
    prakriti_pitta DECIMAL(3,1),
    prakriti_kapha DECIMAL(3,1),
    prakriti_dominant VARCHAR(20),

    vikriti_vata DECIMAL(3,1),
    vikriti_pitta DECIMAL(3,1),
    vikriti_kapha DECIMAL(3,1),
    vikriti_dominant VARCHAR(20),

    agni_type VARCHAR(20), -- tikshna, vishama, manda, sama
    koshtha_type VARCHAR(20), -- mrudu, madhya, krura
    sara VARCHAR(20),
    samhanana VARCHAR(20),
    pramana VARCHAR(20),
    satmya TEXT,
    sattva VARCHAR(20),
    ahara_shakti VARCHAR(20),
    vyayama_shakti VARCHAR(20),
    vaya VARCHAR(20), -- bala, madhya, vriddha

    nidana TEXT, -- causative factors
    samprapti TEXT, -- pathogenesis

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2.3 Redis Data Structures

```
# Active Session State (TTL: 1 hour)
KEY: session:{session_id}
TYPE: Hash
FIELDS:
  - patient_id
  - language
  - current_question_id
  - conversation_history (JSON array)
  - red_flags_detected (JSON array)
  - documents_uploaded_count
  - status

# ASR Result Cache (TTL: 5 minutes)
KEY: asr:{audio_hash}
TYPE: String
VALUE: transcribed_text

# Rate Limiting
KEY: rate_limit:{kiosk_id}
TYPE: String
VALUE: request_count:timestamp

# Queue Management
KEY: queue:{department}:{date}
TYPE: Sorted Set
SCORE: priority (lower = higher priority)
MEMBER: session_id

# Physician Dashboard Cache (TTL: 30 seconds)
KEY: dashboard:{physician_id}
TYPE: String
VALUE: JSON array of pending summaries
```

---

## 3. API DESIGN

### 3.1 REST API Endpoints

#### Session Management
```
POST   /api/v1/sessions
       Body: {language: "hi", department: "allopathy", kiosk_id: "K001"}
       Response: {session_id: 12345, token: "jwt", expires_in: 3600}

GET    /api/v1/sessions/{id}
       Response: Full session object

PATCH  /api/v1/sessions/{id}
       Body: Partial update (chief_complaint, status, etc.)

DELETE /api/v1/sessions/{id}
       Soft delete with audit log
```

#### Voice & History
```
POST   /api/v1/sessions/{id}/voice
       Content-Type: multipart/form-data
       Body: {audio: <file>, question_id: "q123"}
       Response: {
         transcription: "मेरे सीने में दर्द है",
         confidence: 0.94,
         structured: {...},
         next_question: "कब से है ये दर्द?",
         red_flags: [],
         follow_up_required: true
       }

POST   /api/v1/sessions/{id}/touch
       Body: {question_id: "q123", answer: {...}}
       Response: Same as voice

GET    /api/v1/sessions/{id}/history
       Response: Complete conversation history
```

#### Document Processing
```
POST   /api/v1/sessions/{id}/documents
       Content-Type: multipart/form-data
       Body: {file: <image/pdf>, document_type: "prescription"}
       Response: {
         document_id: 789,
         processing_status: "processing",
         estimated_time: 8
       }

GET    /api/v1/documents/{id}
       Response: Full document with extracted data

GET    /api/v1/documents/{id}/ocr
       Response: Raw OCR text
```

#### Summary
```
POST   /api/v1/sessions/{id}/summarize
       Response: {summary_id: 456, summary_text: "...", confidence: 87.5}

GET    /api/v1/summaries/{id}
       Response: Full summary with FHIR bundle

PATCH  /api/v1/summaries/{id}/review
       Body: {status: "confirmed", physician_edits: {...}, physician_id: 99}
```

#### ABDM Integration
```
POST   /api/v1/abdm/verify-abha
       Body: {abha_id: "1234-5678-9012", otp: "123456"}
       Response: {verified: true, patient_demographics: {...}}

POST   /api/v1/abdm/consent
       Body: {session_id: 123, consent_types: ["data_capture", "his_share"]}
       Response: {consent_id: "cons-abc-123", status: "active"}

POST   /api/v1/abdm/push-fhir
       Body: {session_id: 123}
       Response: {transaction_id: "txn-xyz", status: "accepted"}
```

#### Physician Dashboard
```
GET    /api/v1/physician/dashboard?status=pending&limit=50
       Response: [{session_id, patient_name, chief_complaint, summary_preview, red_flags, wait_time}]

GET    /api/v1/physician/sessions/{id}
       Response: Full session + summary + documents

POST   /api/v1/physician/sessions/{id}/confirm
       Body: {edits: {...}}
```

### 3.2 WebSocket API (Real-time)

```
WS     /ws/sessions/{session_id}
       Events:
         CLIENT -> SERVER:
           {type: "voice_chunk", data: base64_audio}
           {type: "heartbeat"}

         SERVER -> CLIENT:
           {type: "transcription", text: "...", confidence: 0.92}
           {type: "question", question_id: "q123", text: "...", options: [...]}
           {type: "red_flag", alert: {...}, priority: "critical"}
           {type: "document_ready", document_id: 789}
           {type: "summary_ready", summary_id: 456}
           {type: "session_complete", token_number: "A-42"}

WS     /ws/physician/{physician_id}
       Events:
         SERVER -> CLIENT:
           {type: "new_patient", session_id: 123, summary: "..."}
           {type: "red_flag_alert", session_id: 123, symptoms: [...]}
           {type: "queue_update", queue_length: 15, avg_wait: 12}
```

---

## 4. AI/ML PIPELINE DESIGN

### 4.1 ASR Pipeline (Bhashini Integration)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Raw Audio   │───▶│ Preprocess  │───▶│ Bhashini    │───▶│ Postprocess │
│ (WAV/OGG)   │    │ • Noise     │    │ ASR API     │    │ • Medical   │
│             │    │   Reduction │    │             │    │   Dictionary│
│             │    │ • VAD       │    │             │    │ • Confidence│
│             │    │ • Resample  │    │             │    │   Scoring   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
                                                        ┌─────────────┐
                                                        │ Transcript  │
                                                        │ + Confidence│
                                                        └─────────────┘
```

**Audio Preprocessing:**
- Noise reduction: RNNoise or WebRTC AEC3 for hospital ambient noise
- Voice Activity Detection (VAD): Silero VAD to trim silence
- Resampling: 16kHz mono (Bhashini requirement)
- Audio chunking: 10-second segments for streaming

### 4.2 Clinical Structuring LLM Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Transcript     │────▶│  Prompt Builder    │────▶│  Gemini 1.5 Pro │
│  + Context      │     │  • System Prompt   │     │                 │
│  + History      │     │  • Conversation    │     │  • JSON Mode    │
│  + Ontology     │     │  • Few-shot Ex.    │     │  • Temperature  │
│                 │     │  • Constraints     │     │    0.1          │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │ Structured   │
                                                   │ JSON Output  │
                                                   └──────────────┘
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │ Validator    │
                                                   │ • Schema     │
                                                   │ • Red Flags  │
                                                   │ • Contradict.│
                                                   └──────────────┘
```

**System Prompt Template:**
```
You are MediKiosk Clinical AI, an expert medical history-taking assistant.
You are conducting a structured clinical interview in {language}.

CURRENT INTERVIEW STATE:
- Chief Complaint: {chief_complaint or "Not yet captured"}
- Questions Asked: {question_count}
- Last Answer: {last_transcript}

CLINICAL ONTOLOGY (Allopathic):
You must extract and structure the following:
1. Chief Complaint: Primary symptom + duration
2. HPI (SOCRATES): Site, Onset, Character, Radiation, Associations, Time course, Exacerbating/Relieving, Severity
3. Past Medical: Known diseases with onset dates
4. Past Surgical: Procedures with dates
5. Drug History: Current medications (name, dose, frequency)
6. Allergy History: Drug/food allergies with reactions
7. Family History: First-degree relatives with conditions
8. Personal History: Smoking, alcohol, occupation, diet, exercise
9. ROS: Positive and negative findings by system

RED FLAG RULES:
{red_flag_ontology}

OUTPUT FORMAT:
Return STRICT JSON with:
- extracted_fields: {chief_complaint, hpi, past_medical, ...}
- red_flags: [list of triggered alerts or empty]
- next_question: "The next question to ask the patient in {language}"
- confidence: 0-100 score
- reasoning: "Brief clinical reasoning for next question"

CONSTRAINTS:
- Never diagnose. Only structure and elicit.
- If patient mentions emergency symptoms, set red_flags immediately.
- Next question should be conversational, not robotic.
- For elderly/low-literacy patients, use simple language.
```

### 4.3 OCR Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Document    │───▶│ Image       │───▶│ OCR Engine  │───▶│ NER +       │
│ Image/PDF   │    │ Preprocess  │    │ Selection   │    │ Structuring │
│             │    │ • Deskew    │    │ • Printed:  │    │ • spaCy     │
│             │    │ • Denoise   │    │   Tesseract │    │   Medical   │
│             │    │ • Binarize  │    │ • Handwritten│   │   NER       │
│             │    │ • Enhance   │    │   EasyOCR   │    │ • LLM       │
│             │    │   Contrast  │    │ • Fallback: │    │   Fallback  │
│             │    │             │    │   Vision API│    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
                                                        ┌─────────────┐
                                                        │ Structured  │
                                                        │ Extraction  │
                                                        └─────────────┘
```

**Document Classification Model:**
- Input: Preprocessed document image
- Model: Fine-tuned ResNet-50 / EfficientNet-B0
- Classes: prescription, lab_report, discharge_summary, imaging_report, insurance, other
- Accuracy target: >95%

**Medical NER Model:**
- Base: Fine-tuned BERT/BiLSTM-CRF on i2b2/Indian medical corpus
- Entities: DRUG, DOSAGE, FREQUENCY, DIAGNOSIS, TEST_NAME, TEST_VALUE, REF_RANGE, PROCEDURE, VITAL

### 4.4 Red Flag Detection

```python
# Rule-based + ML hybrid approach
RED_FLAG_PATTERNS = {
    "chest_pain_mi": {
        "required": ["chest_pain", "chest_discomfort"],
        "strong_indicators": ["dyspnea", "diaphoresis", "radiation_arm", "radiation_jaw", "nausea"],
        "severity": "critical",
        "action": "immediate_triage"
    },
    "stroke_fast": {
        "required": ["sudden_onset"],
        "strong_indicators": ["facial_droop", "arm_weakness", "speech_difficulty", "vision_loss", "severe_headache"],
        "severity": "critical",
        "action": "immediate_triage"
    },
    # ... 200+ patterns
}

def detect_red_flags(structured_history: dict, transcript: str) -> list:
    flags = []

    # Rule-based matching
    for pattern_name, pattern in RED_FLAG_PATTERNS.items():
        score = calculate_match_score(structured_history, transcript, pattern)
        if score > 0.7:
            flags.append({
                "type": pattern_name,
                "severity": pattern["severity"],
                "confidence": score,
                "triggered_by": extract_triggers(structured_history, pattern)
            })

    # LLM verification (for ambiguous cases)
    if 0.5 < score < 0.7:
        llm_verification = verify_with_llm(transcript, pattern_name)
        if llm_verification["is_emergency"]:
            flags.append({...})

    return flags
```

---

## 5. SECURITY ARCHITECTURE

### 5.1 Authentication & Authorization

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Gateway │────▶│  JWT Auth   │────▶│  RBAC Check │
│             │     │  (Kong/Nginx)│     │  (Verify)   │     │  (Casbin)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                  │
                                                                  ▼
                                                           ┌─────────────┐
                                                           │  Service    │
                                                           │  Handler    │
                                                           └─────────────┘
```

**JWT Claims:**
```json
{
  "sub": "user_uuid",
  "role": "patient|physician|admin|super_admin",
  "session_id": 12345,
  "hospital_id": "H001",
  "iat": 1693843200,
  "exp": 1693846800,
  "permissions": ["session:read", "summary:write"]
}
```

**RBAC Matrix:**
| Resource | Patient | Physician | Admin | Super Admin |
|----------|---------|-----------|-------|-------------|
| Own Session | CRUD | - | R | R |
| Any Session | - | RU (assigned) | R | CRUD |
| Summary | R (own) | CRUD | R | CRUD |
| Documents | R (own) | R (assigned) | R | CRUD |
| Audit Logs | - | - | R | CRUD |
| System Config | - | - | RU | CRUD |

### 5.2 Data Encryption

```
Data at Rest:
  - PostgreSQL: Transparent Data Encryption (TDE) with AES-256
  - Redis: Encrypted snapshots
  - MinIO/S3: Server-side encryption (SSE-S3)
  - Backups: GPG-encrypted before upload

Data in Transit:
  - TLS 1.3 for all API communication
  - mTLS for inter-service communication
  - Certificate pinning for mobile clients

Data in Use:
  - Memory encryption where supported (Intel SGX / AMD SEV)
  - Secure enclaves for LLM inference (sensitive data)
```

### 5.3 DPDP Act 2023 Compliance Matrix

| DPDP Requirement | Implementation |
|-------------------|----------------|
| **Lawful Basis** | Explicit consent per purpose (FR-D1) |
| **Notice** | Audio + visual notice at session start |
| **Consent Management** | Granular, revocable, auditable (consent_records table) |
| **Data Minimization** | Collect only clinically necessary data |
| **Purpose Limitation** | Data used only for treatment + ABDM integration |
| **Data Retention** | Auto-delete voice after 24h; session data after 7 years |
| **Data Security** | E2E encryption, RBAC, audit logs |
| **Data Principal Rights** | Export (FHIR), Correction (physician review), Deletion (soft delete) |
| **Breach Notification** | Automated alerts to DPO within 72 hours |
| **Data Localization** | All servers within India (AWS Mumbai / Azure Pune) |
| **Child Data** | Parental consent flow for <18 patients |

---

## 6. DEPLOYMENT ARCHITECTURE

### 6.1 Kubernetes Manifest Structure

```yaml
# Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: medikiosk-prod

# ConfigMap for environment variables
apiVersion: v1
kind: ConfigMap
metadata:
  name: medikiosk-config
  namespace: medikiosk-prod
data:
  DATABASE_URL: "postgresql://..."
  REDIS_URL: "redis://..."
  BHASHINI_API_KEY: "..."
  GEMINI_API_KEY: "..."
  ABDM_BASE_URL: "https://..."

# Secrets
apiVersion: v1
kind: Secret
metadata:
  name: medikiosk-secrets
  namespace: medikiosk-prod
type: Opaque
stringData:
  DB_PASSWORD: "..."
  JWT_SECRET: "..."
  ABDM_CLIENT_SECRET: "..."

# Session Service Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: session-service
  namespace: medikiosk-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: session-service
  template:
    metadata:
      labels:
        app: session-service
    spec:
      containers:
      - name: session-service
        image: medikiosk/session-service:v1.0
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: medikiosk-config
        - secretRef:
            name: medikiosk-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5

# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: session-service-hpa
  namespace: medikiosk-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: session-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

# Service
apiVersion: v1
kind: Service
metadata:
  name: session-service
  namespace: medikiosk-prod
spec:
  selector:
    app: session-service
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
```

### 6.2 CI/CD Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   GitHub    │───▶│   GitHub    │───▶│   Docker    │───▶│   ArgoCD    │
│   Push      │    │   Actions   │    │   Registry  │    │   Deploy    │
│             │    │  • Lint     │    │             │    │             │
│             │    │  • Test     │    │             │    │  • K8s      │
│             │    │  • Build    │    │             │    │    Apply    │
│             │    │  • Scan     │    │             │    │  • Health   │
│             │    │    (Trivy)  │    │             │    │    Check    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 6.3 Monitoring & Observability

| Layer | Tool | Metrics |
|-------|------|---------|
| Infrastructure | Prometheus + Grafana | CPU, Memory, Disk, Network |
| Application | Datadog / New Relic | API latency, error rates, throughput |
| Logs | ELK Stack (Elasticsearch, Logstash, Kibana) | Structured logs, audit trails |
| APM | Jaeger | Distributed tracing across microservices |
| Uptime | PagerDuty + UptimeRobot | Alert on 99.5% SLA breach |
| AI Performance | Custom dashboards | ASR WER, OCR accuracy, LLM hallucination rate |

---

## 7. SCALABILITY & PERFORMANCE DESIGN

### 7.1 Load Estimates

| Metric | Small Hospital (500 OPD/day) | Large Hospital (5000 OPD/day) | Tertiary (10000 OPD/day) |
|--------|------------------------------|-------------------------------|--------------------------|
| Peak concurrent sessions | 20 | 150 | 300 |
| API requests/min (peak) | 200 | 1500 | 3000 |
| Audio data/day | 50 GB | 500 GB | 1 TB |
| Document images/day | 1000 | 10000 | 20000 |
| Database writes/min | 100 | 800 | 1500 |

### 7.2 Caching Strategy

```
L1 Cache (In-Memory): 
  - Active session state in Redis (TTL: 1h)
  - Hot question templates (TTL: 24h)

L2 Cache (Redis Cluster):
  - ASR results by audio hash (TTL: 5min)
  - Physician dashboard data (TTL: 30sec)
  - Drug interaction lookups (TTL: 1h)

L3 Cache (CDN):
  - Static UI assets
  - Icon libraries
  - Audio prompt files
```

### 7.3 Database Sharding

```
Shard Key: hospital_id + date_range
- Shard 1: Hospital IDs 1-50, Current Month
- Shard 2: Hospital IDs 51-100, Current Month
- Archive Shard: All hospitals, >6 months old
```

---

## 8. DISASTER RECOVERY & BUSINESS CONTINUITY

| Scenario | RPO | RTO | Strategy |
|----------|-----|-----|----------|
| Database corruption | 1 hour | 4 hours | Point-in-time recovery from WAL backups |
| Kiosk hardware failure | 0 | 5 minutes | Hot standby kiosk auto-activation |
| ASR service down | 0 | Immediate | Fallback to touch-only mode |
| Internet outage | 0 | Immediate | Offline mode: store locally, sync on reconnect |
| Complete data center failure | 1 hour | 8 hours | Multi-AZ deployment (Mumbai + Pune) |

---

## 9. TECHNOLOGY STACK SUMMARY

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Frontend** | React 18 + TypeScript | 18.2 | Component-based, strong typing, PWA support |
| **Styling** | Tailwind CSS | 3.4 | Rapid UI development, responsive design |
| **State Management** | Zustand | 4.5 | Lightweight, no boilerplate |
| **Backend** | FastAPI | 0.110 | Async Python, auto-generated docs, easy ML integration |
| **Database** | PostgreSQL | 16 | ACID compliance, JSONB for flexible schema, mature |
| **Cache** | Redis | 7.2 | Session state, pub/sub, rate limiting |
| **Message Queue** | Redis Streams / RabbitMQ | - | Async task processing |
| **Object Storage** | MinIO | 2024 | S3-compatible, on-premise deployable |
| **ASR** | Bhashini API | v1 | Government-backed, free, 22 Indian languages |
| **LLM** | Google Gemini 1.5 Pro | - | Multilingual, long context, structured output |
| **OCR** | Tesseract + EasyOCR | 5.x | Open source, multilingual, handwriting support |
| **Document AI** | Google Vision API (fallback) | v1 | High accuracy for poor quality scans |
| **Containerization** | Docker + Docker Compose | 24.x | Dev/prod parity |
| **Orchestration** | Kubernetes | 1.29 | Auto-scaling, self-healing |
| **API Gateway** | Kong / Nginx | 3.5 | Rate limiting, auth, SSL termination |
| **Monitoring** | Prometheus + Grafana | - | Industry standard, extensive ecosystem |
| **Logging** | ELK Stack | 8.x | Centralized log aggregation |
| **CI/CD** | GitHub Actions + ArgoCD | - | GitOps deployment |
| **Cloud** | AWS India (Mumbai) / Azure India (Pune) | - | DPDP compliance, low latency |

---

## 10. APPENDICES

### Appendix A: FHIR Resource Mapping

| MediKiosk Data | FHIR Resource | Profile |
|----------------|---------------|---------|
| Patient demographics | Patient | ABDM Patient Profile |
| Chief Complaint | Condition | ABDM Condition Profile |
| HPI | Condition + Encounter | ABDM Encounter Profile |
| Past Medical History | Condition (history) | ABDM Condition Profile |
| Medications | MedicationStatement | ABDM Medication Profile |
| Allergies | AllergyIntolerance | ABDM Allergy Profile |
| Lab Results | Observation | ABDM Observation Profile |
| Vitals | Observation | ABDM Vital Signs Profile |
| Documents | DocumentReference | ABDM Document Profile |
| Summary | Composition | ABDM Composition Profile |
| Consent | Consent | ABDM Consent Profile |

### Appendix B: Error Codes

| Code | Description | HTTP Status | Retryable |
|------|-------------|-------------|-----------|
| MK001 | Invalid session ID | 404 | No |
| MK002 | ASR service timeout | 504 | Yes |
| MK003 | LLM rate limit exceeded | 429 | Yes (exponential backoff) |
| MK004 | OCR quality too low | 422 | No (re-scan required) |
| MK005 | ABDM authentication failed | 401 | No |
| MK006 | Red flag triggered | 200 | N/A |
| MK007 | Consent not granted | 403 | No |
| MK008 | Session expired | 410 | No (new session required) |

### Appendix C: Third-Party API Specifications

[Bhashini API docs, ABDM FHIR API docs, Gemini API docs attached]

---

Document Owner: MediKiosk Engineering Team
Review Cycle: Weekly during development
Approval: [Pending CTO Sign-off]
