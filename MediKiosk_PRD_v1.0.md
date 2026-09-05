# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# MediKiosk — AI-Powered Clinical History & Document Digitization Platform
# Version: 1.0 | Date: September 2026
# Classification: Internal — Smart India Hackathon 2026 Submission

---

## 1. EXECUTIVE SUMMARY

### 1.1 Product Vision
MediKiosk is a patient-facing, AI-powered clinical history-taking and medical document digitization software platform designed for deployment in Indian public hospital OPDs and AYUSH institutions. The platform enables patients — including low-literacy, elderly, and first-time users — to independently record comprehensive clinical histories through natural voice conversation and guided touchscreen interaction, digitize physical medical documents, and generate structured, physician-ready summaries that integrate with hospital information systems (HIS) and the Ayushman Bharat Digital Mission (ABDM) ecosystem before the patient enters the consultation room.

### 1.2 Problem Statement
India's public hospital OPDs register 4,000–10,000 patients daily with average doctor-patient consultation times of 2–5 minutes. Within this window, physicians must elicit history, examine, review records, diagnose, counsel, and prescribe — leading to systematic under-elicitation, missed comorbidities, and diagnostic error. There is no existing patient-facing platform that combines AI-driven multimodal clinical history acquisition with medical document digitization and ABDM integration.

### 1.3 Target Users
| User Segment | Role | Pain Points Addressed |
|-------------|------|------------------------|
| **Primary: Patients** | OPD visitors in public/AYUSH hospitals | Cannot articulate history clearly; intimidated by forms; carry disorganized paper records |
| **Secondary: Physicians** | Government hospital doctors, AYUSH practitioners | Time-constrained; need structured history; overwhelmed by paper records |
| **Tertiary: Hospital Admin** | Medical superintendents, HMIS officers | Need throughput metrics; ABDM compliance; reduced queue times |
| **Quaternary: Triage Staff** | Nurses, emergency coordinators | Need red-flag alerts; priority routing |

### 1.4 Success Metrics (KPIs)
| Metric | Baseline | Target (MVP) | Target (Scale) |
|--------|----------|--------------|----------------|
| History-taking time | 4–5 minutes (manual) | <90 seconds | <60 seconds |
| Physician review time | 3–4 minutes | <30 seconds | <15 seconds |
| History completeness score | ~45% (physician audit) | >80% | >90% |
| Patient satisfaction (NPS) | N/A | >50 | >70 |
| Document digitization accuracy | N/A | >85% | >95% |
| Red flag detection rate | ~30% (missed) | >90% capture | >95% capture |
| ABHA linkage rate | <5% | >70% | >90% |

---

## 2. FUNCTIONAL REQUIREMENTS

### 2.1 Module A — Conversational Multimodal History Engine

#### FR-A1: Patient Identification & Onboarding
- **FR-A1.1**: Patient shall authenticate using ABHA ID (scan QR, manual entry, or Aadhaar-linked OTP)
- **FR-A1.2**: System shall support walk-in registration without ABHA (generate temporary ID, prompt ABHA creation)
- **FR-A1.3**: Language selection shall be the first screen with audio narration of each option
- **FR-A1.4**: System shall support minimum 12 languages: Hindi, English, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese
- **FR-A1.5**: Consent collection shall be audio-guided with touch confirmation, available in selected language
- **FR-A1.6**: Consent shall be granular: (a) data capture, (b) HIS sharing, (c) ABDM linkage, (d) research anonymization
- **FR-A1.7**: Low-literacy mode shall activate icon-driven UI with minimal text, audio prompts for every interaction

#### FR-A2: Adaptive Voice + Touch History Interview
- **FR-A2.1**: System shall ask chief complaint first via voice prompt + icon grid (body parts + symptom categories)
- **FR-A2.2**: On receiving chief complaint, system shall branch into complaint-specific HPI questionnaire using SOCRATES framework
- **FR-A2.3**: Every question shall be answerable via voice OR touch (multiple choice / severity slider / yes-no)
- **FR-A2.4**: Voice input shall stream to ASR with <3 second latency for transcription display
- **FR-A2.5**: System shall display transcribed text in real-time with "Did we hear you correctly?" confirmation
- **FR-A2.6**: If confidence <80%, system shall auto-re-prompt with simpler phrasing
- **FR-A2.7**: Dialogue manager shall maintain conversation state across 50+ question nodes
- **FR-A2.8**: System shall handle conversational repair ("no, I meant...", "go back", "skip")
- **FR-A2.9**: Interview shall cover: Chief Complaint → HPI → Past Medical → Past Surgical → Drug History → Allergy History → Family History → Personal History → Review of Systems (ROS) → AYUSH-specific (if enabled)

#### FR-A2.10: SOCRATES Framework Implementation
| Parameter | Voice Prompt Example | Touch Alternative |
|-----------|---------------------|-------------------|
| Site | "Where exactly is the pain?" | Body diagram tap |
| Onset | "When did it start?" | Duration picker |
| Character | "How would you describe it?" | [Sharp/Dull/Burning/Throbbing] |
| Radiation | "Does it spread anywhere?" | Body diagram with arrows |
| Associations | "Any other symptoms with it?" | Multi-select checklist |
| Time course | "Is it constant or comes and goes?" | [Constant/Intermittent/Progressive] |
| Exacerbating | "What makes it worse?" | Multi-select + voice |
| Relieving | "What makes it better?" | Multi-select + voice |
| Severity | "Rate it from 1 to 10" | Visual pain scale slider |

#### FR-A3: AYUSH History Mode (Dashavidha Pariksha)
- **FR-A3.1**: When department = Ayurveda/Unani/Siddha/Homeopathy, extended interview activates
- **FR-A3.2**: System shall assess:
  1. **Prakriti** (Constitution): Vata/Pitta/Kapha dominance via 20-question validated questionnaire
  2. **Vikriti** (Current Imbalance): Current dosha disturbance assessment
  3. **Sara** (Tissue Quality): Dhatu assessment
  4. **Samhanana** (Body Build): Structural compactness
  5. **Pramana** (Body Proportions): Height/weight/frame
  6. **Satmya** (Adaptability): Diet/lifestyle compatibility
  7. **Sattva** (Mental Constitution): Mental resilience scale
  8. **Ahara Shakti** (Digestive Capacity): Food intake and digestion quality
  9. **Vyayama Shakti** (Exercise Capacity): Physical endurance
  10. **Vaya** (Age Factor): Age-appropriate assessment
- **FR-A3.3**: AYUSH output shall include Nidana (causative factors) and Samprapti (pathogenesis) summary
- **FR-A3.4**: Icons shall represent Ayurvedic concepts (Agni = fire symbol, Dosha = tridosha diagram)

#### FR-A4: Red Flag Detection & Emergency Routing
- **FR-A4.1**: System shall maintain a real-time red flag ontology with 200+ emergency symptom patterns
- **FR-A4.2**: Critical patterns include:
  - Chest pain + dyspnea/diaphoresis/radiation to arm/jaw
  - Sudden severe headache + neurological deficit (FAST stroke check)
  - Hematemesis, melena, or hematochezia
  - Altered mental status / seizures
  - Severe abdominal pain + rigid abdomen
  - Anaphylaxis symptoms (angioedema, bronchospasm)
  - Pregnancy + severe abdominal pain/bleeding
  - High fever + altered sensorium
  - Trauma with loss of consciousness
- **FR-A4.3**: On red flag detection, system shall:
  1. Immediately halt routine questionnaire
  2. Display large visual alert on kiosk
  3. Trigger audible alarm to triage station
  4. Send push notification to emergency coordinator
  5. Print priority slip (bypass queue)
  6. Log incident with timestamp and symptom transcript
- **FR-A4.4**: False positive rate target: <5%

#### FR-A5: Audio & Accessibility Features
- **FR-A5.1**: All questions shall have text-to-speech (TTS) in selected language
- **FR-A5.2**: TTS speed shall be adjustable (0.75x, 1x, 1.25x, 1.5x)
- **FR-A5.3**: Font size shall be adjustable (small, medium, large, extra-large)
- **FR-A5.4**: High contrast mode for visually impaired
- **FR-A5.5**: Haptic feedback on touch interactions
- **FR-A5.6**: Session timeout warning at 3 minutes of inactivity with audio alert
- **FR-A5.7**: Emergency help button always visible — connects to human attendant

---

### 2.2 Module B — Medical Document Digitization & Intelligence

#### FR-B1: Document Capture
- **FR-B1.1**: System shall support capture via: (a) kiosk document scanner, (b) phone camera via QR link, (c) uploaded image files
- **FR-B1.2**: Supported formats: JPEG, PNG, PDF, TIFF
- **FR-B1.3**: Auto-crop and perspective correction using edge detection
- **FR-B1.4**: Multi-page document handling with page reordering
- **FR-B1.5**: Real-time quality check: blur detection, lighting check, resolution check (min 300 DPI equivalent)

#### FR-B2: OCR & Text Extraction
- **FR-B2.1**: OCR shall support printed text in English, Hindi, and major regional languages
- **FR-B2.2**: OCR shall support handwritten text (doctor prescriptions) with >75% accuracy
- **FR-B2.3**: Pre-processing pipeline: deskew → denoise → binarization → line segmentation → OCR
- **FR-B2.4**: Post-processing: medical dictionary correction, context-aware spell checking
- **FR-B2.5**: Handwriting confidence scoring — flag low-confidence words for manual review

#### FR-B3: Clinical Entity Extraction
- **FR-B3.1**: System shall extract and structure:
  - **Document metadata**: Date, hospital name, doctor name, document type
  - **Diagnoses**: Primary and secondary diagnoses with ICD-10 coding
  - **Medications**: Drug name, generic name, brand name, dosage, frequency, duration, route
  - **Lab results**: Test name, value, unit, reference range, abnormal flag
  - **Procedures**: Surgery name, date, hospital, outcome
  - **Vitals**: BP, pulse, temperature, SpO2, weight, height
  - **Impressions**: Radiology findings, pathology reports
- **FR-B3.2**: Drug interaction checking against current medication list
- **FR-B3.3**: Abnormal lab value highlighting with color coding
- **FR-B3.4**: Document classification: Prescription / Lab Report / Discharge Summary / Imaging Report / Insurance / Other

#### FR-B4: Chronological Organization
- **FR-B4.1**: System shall parse dates from documents (multiple formats: DD/MM/YYYY, DD-MM-YY, Month YYYY)
- **FR-B4.2**: Documents shall be ordered into a medical timeline view
- **FR-B4.3**: Timeline shall display: date, document type, key findings, source hospital
- **FR-B4.4**: Conflicting information detection (e.g., different diagnoses for same date)

---

### 2.3 Module C — Structured History Summary Generator

#### FR-C1: AI Summarization Engine
- **FR-C1.1**: System shall synthesize conversational history + digitized documents into unified summary
- **FR-C1.2**: Output format shall follow standard clinical documentation:

```
MEDI KIOSK CLINICAL SUMMARY
═══════════════════════════════════════════════════════════════
Patient ID: [ABHA/Temp ID]    Date: [DD/MM/YYYY HH:MM]
Language: [X]    Mode: [Voice+Touch]    Duration: [X min]

CHIEF COMPLAINT:
[Text]

HISTORY OF PRESENT ILLNESS:
[SOCRATES structured text]

PAST MEDICAL HISTORY:
[Conditions with dates]

PAST SURGICAL HISTORY:
[Procedures with dates]

CURRENT MEDICATIONS:
[Drug | Dose | Frequency | Since]

ALLERGIES:
[Drug/Food | Reaction | Severity]

FAMILY HISTORY:
[Relation | Condition | Age of Onset]

PERSONAL HISTORY:
[Smoking/Alcohol/Occupation/Diet/Exercise]

REVIEW OF SYSTEMS:
[Positive findings by system]
[Relevant negative findings]

AYUSH ASSESSMENT (if applicable):
[Prakriti/Vikriti/Agni/etc.]

PRIOR INVESTIGATIONS SUMMARY:
[Timeline of key lab values]
[Abnormal values highlighted]

DOCUMENTS ATTACHED: [N] files
RED FLAGS: [None / List]
CONFIDENCE SCORE: [X%]
═══════════════════════════════════════════════════════════════
Generated by MediKiosk AI | Physician Review Required
```

- **FR-C1.3**: Summary shall be bilingual: patient-facing audio confirmation in local language; physician-facing text in English/Hindi
- **FR-C1.4**: Confidence score shall indicate AI certainty (based on transcription quality, entity extraction confidence, contradictions found)
- **FR-C1.5**: Summary generation latency: <5 seconds after session completion

#### FR-C2: Physician Review Interface
- **FR-C2.1**: Summary shall appear on physician dashboard the moment patient enters consultation
- **FR-C2.2**: Physician shall be able to edit any field inline
- **FR-C2.3**: Physician shall confirm, amend, or reject the summary
- **FR-C2.4**: Rejection shall trigger feedback loop to improve AI model
- **FR-C2.5**: Final confirmed summary shall auto-save to HIS/EMR

---

### 2.4 Module D — Consent, Privacy & ABDM Integration

#### FR-D1: Consent Management
- **FR-D1.1**: Granular consent with visual icons + audio explanation
- **FR-D1.2**: Consent categories:
  - Data capture during this session
  - Storage in hospital records
  - Sharing with treating physician
  - Linking to ABHA record
  - Sharing with other providers (referral)
  - Anonymized research use
- **FR-D1.3**: Consent shall be revocable — patient can withdraw any consent before final submission
- **FR-D1.4**: Consent audit trail: timestamp, IP/kiosk ID, consent bitmap, audio hash

#### FR-D2: Data Security
- **FR-D2.1**: All PHI (Protected Health Information) encrypted at rest (AES-256) and in transit (TLS 1.3)
- **FR-D2.2**: Voice recordings deleted immediately after transcription (max retention: 24 hours for quality audit)
- **FR-D2.3**: Session data cleared from kiosk cache immediately after submission
- **FR-D2.4**: Role-based access control (RBAC): Patient, Physician, Admin, Super Admin
- **FR-D2.5**: Audit logging: all data access logged with user ID, timestamp, action, data elements accessed

#### FR-D3: ABDM Integration
- **FR-D3.1**: ABHA ID verification via ABDM sandbox/production API
- **FR-D3.2**: FHIR R4 Bundle generation for all clinical data
- **FR-D3.3**: Push to ABDM Health Information Exchange (HIE) via FHIR APIs
- **FR-D3.4**: ABHA-linked Personal Health Record (PHR) update
- **FR-D3.5**: Consent artifact generation per ABDM consent framework
- **FR-D3.6**: Support for ABDM HIU (Health Information User) and HIP (Health Information Provider) roles

---

### 2.5 Module E — Hospital Administration & Analytics

#### FR-E1: Queue Management Integration
- **FR-E1.1**: On session completion, auto-generate OPD token number
- **FR-E1.2**: Priority flagging for red flag / elderly / disability
- **FR-E1.3**: Integration with existing hospital queue systems

#### FR-E2: Analytics Dashboard
- **FR-E2.1**: Real-time metrics: active sessions, completed sessions, avg duration, queue length
- **FR-E2.2**: Quality metrics: history completeness scores, physician edit rates, red flag accuracy
- **FR-E2.3**: Operational metrics: kiosk uptime, ASR accuracy by language, OCR accuracy by document type
- **FR-E2.4**: Exportable reports (CSV, PDF)

---

## 3. NON-FUNCTIONAL REQUIREMENTS

### 3.1 Performance
| Requirement | Specification |
|-------------|---------------|
| Concurrent kiosk sessions | Min 50 per hospital deployment |
| ASR latency | <3 seconds end-to-end |
| LLM summarization | <5 seconds for complete summary |
| OCR processing | <10 seconds per page |
| Dashboard load | <2 seconds for 100 cases |
| System availability | 99.5% uptime (hospital hours) |
| Offline mode | Basic functionality for 30 min without connectivity |

### 3.2 Scalability
- Horizontal scaling via Kubernetes for backend services
- Database sharding by hospital/region
- CDN for static assets
- Auto-scaling ASR/LLM inference based on queue depth

### 3.3 Security & Compliance
- **DPDP Act 2023**: Full compliance with data fiduciary obligations
- **ABDM**: FHIR R4, consent framework, data minimization
- **HIPAA-equivalent**: Encryption, access controls, audit trails, breach notification
- **ISO 27001**: Information security management
- **MeitY STQC**: For government hospital deployment certification

### 3.4 Accessibility
- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation
- Adjustable text size and contrast
- Audio-first design for low-literacy users

### 3.5 Reliability
- Graceful degradation: if ASR fails, fall back to touch-only mode
- Automatic session recovery: patient can resume from last question on timeout
- Data backup: real-time replication, point-in-time recovery
- Disaster recovery: RPO <1 hour, RTO <4 hours

---

## 4. USER STORIES

### 4.1 Patient User Stories

**US-P1**: As a 65-year-old Hindi-speaking patient with chest pain, I want to describe my symptoms by speaking naturally so that the doctor knows my full history before I enter the room.
*Acceptance*: Patient speaks in Hindi, ASR transcribes, system asks SOCRATES follow-ups, generates summary in <2 minutes.

**US-P2**: As a first-time visitor who cannot read, I want to use only icons and audio prompts so that I can complete my history without assistance.
*Acceptance*: Patient completes full history using only touch icons and audio, zero text reading required.

**US-P3**: As a patient carrying 5 years of paper prescriptions, I want to scan them at the kiosk so that the doctor sees my medication timeline instantly.
*Acceptance*: Patient scans 5 documents, OCR extracts all medications, timeline generated, drug interactions flagged.

**US-P4**: As a patient with stroke symptoms, I want the system to recognize this as an emergency and get me immediate help.
*Acceptance*: Patient mentions "sudden weakness on left side + slurred speech", system triggers red flag, prints priority slip, alerts triage in <5 seconds.

### 4.2 Physician User Stories

**US-D1**: As an OPD physician seeing 80 patients/day, I want to see a structured summary the moment the patient enters so that I can focus on examination and diagnosis.
*Acceptance*: Summary appears on dashboard within 1 second of patient token call, covers all history sections.

**US-D2**: As an Ayurvedic physician, I want the AI to have captured Dashavidha Pariksha parameters so that I don't need to ask 30 additional questions.
*Acceptance*: AYUSH summary includes all 10 parameters with dosha scores, physician confirms in <1 minute.

**US-D3**: As a physician, I want to correct the AI summary easily so that the final record is accurate.
*Acceptance*: Inline editing on any field, one-click confirm, auto-save to EMR.

### 4.3 Administrator User Stories

**US-A1**: As a hospital superintendent, I want to see real-time OPD throughput metrics so that I can allocate resources dynamically.
*Acceptance*: Dashboard shows live queue, avg consultation time, kiosk utilization by hour.

**US-A2**: As a data protection officer, I want complete audit trails of all PHI access so that I can demonstrate DPDP compliance.
*Acceptance*: Exportable audit log with user, timestamp, action, data elements, consent status.

---

## 5. ASSUMPTIONS & CONSTRAINTS

### 5.1 Assumptions
- Hospital has existing HIS/EMR with API endpoints or FHIR support
- Kiosk hardware: Android tablet/iPad with microphone, camera, document scanner attachment
- Internet connectivity: minimum 2 Mbps per kiosk (4G/5G fallback)
- Bhashini API availability for Indian language ASR
- ABDM sandbox access for development; production approval for pilot

### 5.2 Constraints
- Must function in noisy hospital environments (SNR >10 dB)
- Must not store voice recordings beyond transcription window
- Must comply with DPDP Act 2023 data localization (India-only servers)
- Must work without ABHA ID (walk-in mode)
- Must support both allopathic and AYUSH workflows

---

## 6. RISK ANALYSIS

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ASR fails in noisy OPD | High | High | Noise cancellation, directional mics, touch fallback |
| LLM hallucinates clinical data | Medium | Critical | Confidence scoring, physician review mandatory, no autonomous diagnosis |
| OCR fails on poor handwriting | High | Medium | Human verification queue, confidence flags, manual entry fallback |
| Patient data breach | Low | Critical | E2E encryption, zero-trust architecture, regular audits |
| Low adoption by elderly patients | Medium | High | Attendant assistance mode, simplified UI, audio-first design |
| ABDM API downtime | Medium | Medium | Offline queue, sync when available, local HIS integration |

---

## 7. GLOSSARY

| Term | Definition |
|------|------------|
| **ABDM** | Ayushman Bharat Digital Mission |
| **ABHA** | Ayushman Bharat Health Account |
| **ASR** | Automatic Speech Recognition |
| **AYUSH** | Ayurveda, Yoga, Unani, Siddha, Homeopathy |
| **DPDP** | Digital Personal Data Protection Act 2023 |
| **FHIR** | Fast Healthcare Interoperability Resources |
| **HIS** | Hospital Information System |
| **HPI** | History of Present Illness |
| **OPD** | Outpatient Department |
| **PHI** | Protected Health Information |
| **ROS** | Review of Systems |
| **SOCRATES** | Site, Onset, Character, Radiation, Associations, Time course, Exacerbating/Relieving factors, Severity |

---

## 8. APPENDICES

### Appendix A: AYUSH Dashavidha Pariksha Questionnaire (Sample)
[Detailed 50-question validated questionnaire for each of the 10 parameters]

### Appendix B: Red Flag Ontology (Full List)
[200+ emergency symptom patterns with severity classification]

### Appendix C: FHIR Resource Mapping
[Mapping of MediKiosk data elements to FHIR R4 resources]

### Appendix D: UI Wireframes
[Attached: Figma wireframes for all 12 screens]

---

Document Owner: MediKiosk Product Team
Review Cycle: Bi-weekly during development, monthly post-launch
Approval: [Pending Hospital Partner / SIH Evaluator Sign-off]
