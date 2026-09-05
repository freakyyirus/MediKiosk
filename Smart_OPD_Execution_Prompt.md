# STEP-BY-STEP EXECUTION PROMPT
# Smart OPD Management Platform — Patient | Hospital | Doctor
# Version: 1.0 | Hackathon-Optimized Build Plan
# Total Timeline: 14 Days | Team Size: 3 Developers

═══════════════════════════════════════════════════════════════════════════════
PHASE 0: FOUNDATION & SETUP (Day 1)
═══════════════════════════════════════════════════════════════════════════════

SPRINT 0.1 — Project Initialization
───────────────────────────────────────────────────────────────────────────────

TASK 0.1.1: Initialize Monorepo Structure
├── /client                 (React Frontend)
│   ├── /src
│   │   ├── /portals
│   │   │   ├── /patient      (Patient Portal)
│   │   │   ├── /hospital     (Hospital Admin Portal)
│   │   │   └── /doctor       (Doctor Portal)
│   │   ├── /components       (Shared UI components)
│   │   ├── /hooks            (Custom React hooks)
│   │   ├── /context          (Auth & App context)
│   │   ├── /utils            (Helpers, constants)
│   │   └── /services         (API calls)
│   └── package.json
├── /server                 (Node.js + Express Backend)
│   ├── /src
│   │   ├── /models           (Database models)
│   │   ├── /routes           (API routes)
│   │   ├── /controllers      (Business logic)
│   │   ├── /middleware       (Auth, validation)
│   │   ├── /utils            (Helpers, JWT)
│   │   └── /config           (DB, env)
│   └── package.json
├── /database
│   └── schema.sql
└── docker-compose.yml

ACCEPTANCE: Run `npm install` in both /client and /server. Zero errors.
ASSIGNEE: Dev 1 (Full-stack lead)

TASK 0.1.2: Docker Compose Setup
- PostgreSQL 15 container (port 5432)
- Redis container (port 6379)
- Node server container (port 5000)
- React client dev server (port 3000)

ACCEPTANCE: `docker-compose up` spins all 4 services. Server responds to GET /health.
ASSIGNEE: Dev 1

TASK 0.1.3: Environment Configuration
Create .env files:
SERVER: PORT, DB_URL, JWT_SECRET, JWT_EXPIRE, REDIS_URL, BCRYPT_ROUNDS
CLIENT: REACT_APP_API_URL

ACCEPTANCE: All env vars loaded correctly. No secrets in code.
ASSIGNEE: Dev 1

TASK 0.1.4: Database Schema Implementation
Execute this exact SQL in PostgreSQL:

-- USERS (Base authentication table)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('patient', 'hospital_admin', 'doctor', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PATIENTS (Extended profile for patient role)
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    age INTEGER GENERATED ALWAYS AS (
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))
    ) STORED,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(10),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(15),
    abha_id VARCHAR(32),
    profile_photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HOSPITALS
CREATE TABLE hospitals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    registration_number VARCHAR(100) UNIQUE,
    admin_user_id INTEGER REFERENCES users(id),
    logo_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DEPARTMENTS (OPD departments within a hospital)
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'stethoscope',
    color_code VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOCTORS
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    qualification VARCHAR(255),
    specialization VARCHAR(255),
    license_number VARCHAR(100),
    experience_years INTEGER,
    photo_url VARCHAR(500),
    consultation_fee DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    rating DECIMAL(2,1) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OPD SLOTS (Doctor availability)
CREATE TABLE opd_slots (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_patients INTEGER DEFAULT 20,
    booked_count INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VISITS (The core OPD visit record)
CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id INTEGER REFERENCES hospitals(id),
    department_id INTEGER REFERENCES departments(id),
    doctor_id INTEGER REFERENCES doctors(id),
    slot_id INTEGER REFERENCES opd_slots(id),

    -- Booking info
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    visit_date DATE,
    token_number VARCHAR(20),

    -- Status lifecycle
    status VARCHAR(30) DEFAULT 'booked' 
        CHECK (status IN ('booked', 'confirmed', 'checked_in', 'in_queue', 'with_doctor', 'under_investigation', 'completed', 'cancelled')),

    -- Priority
    priority VARCHAR(20) DEFAULT 'normal' 
        CHECK (priority IN ('normal', 'urgent', 'emergency')),

    -- Patient intake data
    chief_complaint TEXT,
    symptoms_description TEXT,
    severity INTEGER CHECK (severity BETWEEN 1 AND 10),
    associated_symptoms TEXT[],
    current_medications TEXT,
    known_allergies TEXT,
    vitals_bp VARCHAR(20),
    vitals_pulse INTEGER,
    vitals_temperature DECIMAL(4,1),
    vitals_spo2 INTEGER,
    vitals_weight DECIMAL(5,2),

    -- Triage assignment
    triaged_by INTEGER REFERENCES users(id),
    triage_notes TEXT,
    triaged_at TIMESTAMP,

    -- Consultation output
    diagnosis TEXT,
    examination_findings TEXT,
    advice TEXT,
    follow_up_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PRESCRIPTIONS
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    diagnosis TEXT,
    notes TEXT,
    follow_up_date DATE,
    created_by INTEGER REFERENCES doctors(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prescription_items (
    id SERIAL PRIMARY KEY,
    prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
    drug_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LAB TESTS
CREATE TABLE lab_tests (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    result_value VARCHAR(255),
    reference_range VARCHAR(100),
    unit VARCHAR(50),
    is_abnormal BOOLEAN DEFAULT false,
    document_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'recommended' 
        CHECK (status IN ('recommended', 'pending', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MEDICAL DOCUMENTS (Patient's document vault)
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL,
    document_type VARCHAR(50) 
        CHECK (document_type IN ('prescription', 'lab_report', 'discharge_summary', 'imaging', 'insurance', 'other')),
    file_name VARCHAR(255),
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    description TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QUEUE MANAGEMENT
CREATE TABLE queues (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id),
    token_number VARCHAR(20) NOT NULL,
    queue_position INTEGER,
    status VARCHAR(20) DEFAULT 'waiting' 
        CHECK (status IN ('waiting', 'called', 'in_consultation', 'completed', 'skipped')),
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP,
    completed_at TIMESTAMP,
    priority INTEGER DEFAULT 0
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50),
    record_id INTEGER,
    action VARCHAR(20),
    performed_by INTEGER REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_visits_doctor ON visits(doctor_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_queues_department ON queues(department_id);
CREATE INDEX idx_queues_status ON queues(status);
CREATE INDEX idx_documents_patient ON documents(patient_id);

ACCEPTANCE: All tables created. Insert test data: 1 hospital, 3 departments, 2 doctors, 2 patients, 3 visits.
ASSIGNEE: Dev 2 (Backend)

TASK 0.1.5: Backend Skeleton (Express.js)
- Initialize Express app with:
  * express, cors, helmet, morgan, dotenv
  * /routes folder with index.js
  * /middleware folder with auth.js, errorHandler.js
  * /controllers folder structure
  * /models with Sequelize ORM setup (or raw pg)
  * /config/database.js connection pool

- Create utility files:
  * /utils/jwt.js (sign, verify)
  * /utils/bcrypt.js (hash, compare)
  * /utils/response.js (standardized API responses)

- Create base routes:
  * GET /health → { status: "ok", timestamp }
  * Global error handler
  * 404 handler

ACCEPTANCE: Server starts. GET /health returns 200. All middleware loads.
ASSIGNEE: Dev 2

TASK 0.1.6: Frontend Skeleton (React)
- Initialize with Vite: `npm create vite@latest client -- --template react`
- Install dependencies:
  * react-router-dom, axios, zustand, lucide-react, tailwindcss, date-fns
- Configure Tailwind with custom theme:
  * Primary: #0EA5E9 (sky-500)
  * Secondary: #10B981 (emerald-500)
  * Danger: #EF4444 (red-500)
  * Warning: #F59E0B (amber-500)
- Set up folder structure per monorepo
- Create App.jsx with route structure:
  * / → Landing page
  * /patient/* → Patient portal routes
  * /hospital/* → Hospital portal routes
  * /doctor/* → Doctor portal routes
  * /login → Unified login
  * /register → Registration

- Create shared components:
  * Button.jsx (variants: primary, secondary, danger, ghost)
  * Card.jsx
  * Input.jsx (with label, error state)
  * Select.jsx
  * Modal.jsx
  * Toast/Alert.jsx
  * LoadingSpinner.jsx
  * Sidebar.jsx (for portals)
  * Header.jsx

ACCEPTANCE: `npm run dev` serves app. All routes accessible. Shared components render in test page.
ASSIGNEE: Dev 3 (Frontend)

═══════════════════════════════════════════════════════════════════════════════
PHASE 1: AUTHENTICATION & USER MANAGEMENT (Day 2)
═══════════════════════════════════════════════════════════════════════════════

SPRINT 1.1 — Registration & Login APIs
───────────────────────────────────────────────────────────────────────────────

TASK 1.1.1: User Registration API
POST /api/auth/register
Body: {
  phone, email, password, role,
  // If role=patient:
  full_name, date_of_birth, gender, blood_group, address,
  emergency_contact_name, emergency_contact_phone,
  // If role=doctor:
  hospital_id, full_name, qualification, specialization, license_number
}

Logic:
- Hash password with bcrypt (10 rounds)
- Insert into users table
- If patient: insert into patients table
- If doctor: insert into doctors table
- Return JWT token

Validation:
- Phone: 10 digits, Indian format
- Email: valid format (if provided)
- Password: min 6 characters
- Role: must be provided

ACCEPTANCE: Register patient, doctor. Verify DB records. JWT returned.
ASSIGNEE: Dev 2

TASK 1.1.2: Login API
POST /api/auth/login
Body: { phone, password }

Logic:
- Find user by phone
- Compare password with bcrypt
- If valid: generate JWT (payload: userId, role, expiresIn: '24h')
- Return: { token, user: { id, phone, role, name } }

ACCEPTANCE: Login returns valid JWT. Wrong password returns 401.
ASSIGNEE: Dev 2

TASK 1.1.3: Get Current User API
GET /api/auth/me
Headers: Authorization: Bearer <token>

Logic:
- Verify JWT
- Fetch user + role-specific profile (patient/doctor/hospital)
- Return complete user object

ACCEPTANCE: Returns full profile for each role type.
ASSIGNEE: Dev 2

TASK 1.1.4: Auth Middleware
- verifyToken middleware: extract Bearer token, verify JWT, attach req.user
- requireRole middleware: check if req.user.role matches allowed roles
- Usage: router.get('/admin-only', verifyToken, requireRole(['hospital_admin']), handler)

ACCEPTANCE: Protected routes reject invalid/missing tokens. Role checks work.
ASSIGNEE: Dev 2

SPRINT 1.2 — Frontend Auth Integration
───────────────────────────────────────────────────────────────────────────────

TASK 1.2.1: Auth Context & Zustand Store
Create authStore with:
- user: null | object
- token: null | string
- isAuthenticated: boolean
- isLoading: boolean
- Actions: login(credentials), register(data), logout(), fetchMe()
- Persist token in localStorage

ACCEPTANCE: Store persists across reload. Logout clears everything.
ASSIGNEE: Dev 3

TASK 1.2.2: Login Page UI
- Split-screen design: Left (branding + illustration), Right (form)
- Form fields: Phone number, Password, Role selector (Patient/Hospital/Doctor)
- Submit → call login API → redirect to respective portal
- Error handling: inline errors, toast notifications
- "Don't have account? Register" link

ACCEPTANCE: Login works for all 3 roles. Redirects correctly.
ASSIGNEE: Dev 3

TASK 1.2.3: Registration Page UI
- Multi-step form:
  Step 1: Account (phone, email, password, role)
  Step 2: Profile (role-specific fields)
- Progress indicator
- Field validation with real-time feedback
- Success → auto-login → redirect

ACCEPTANCE: Can register all 3 role types. Data saves correctly.
ASSIGNEE: Dev 3

TASK 1.2.4: Protected Route Wrapper
- Create ProtectedRoute component
- Checks auth state
- If not authenticated → redirect to /login
- If wrong role → redirect to correct portal or unauthorized page
- Usage: <Route element={<ProtectedRoute allowedRoles={['patient']} />}>

ACCEPTANCE: Unauthenticated users blocked. Wrong roles redirected.
ASSIGNEE: Dev 3

═══════════════════════════════════════════════════════════════════════════════
PHASE 2: PATIENT PORTAL — COMPLETE (Days 3-5)
═══════════════════════════════════════════════════════════════════════════════

SPRINT 2.1 — Patient Dashboard & Profile (Day 3)
───────────────────────────────────────────────────────────────────────────────

TASK 2.1.1: Patient Dashboard Layout
- Sidebar navigation:
  * 🏠 Dashboard
  * 📅 Book OPD
  * 📋 My Visits
  * 💊 Health Timeline
  * 📁 Documents
  * 👤 Profile
- Top bar: Welcome message, notification bell, profile dropdown
- Main content area with cards:
  * Next upcoming appointment (if any)
  * Quick stats: Total visits, Active medications, Documents count
  * Recent activity list

ACCEPTANCE: Dashboard renders with real data. Navigation works.
ASSIGNEE: Dev 3

TASK 2.1.2: Patient Profile Page
- Editable form with all patient fields
- Profile photo upload (placeholder if none)
- Emergency contact section
- ABHA ID field (optional)
- Save changes → PATCH /api/patients/:id

ACCEPTANCE: Can view and edit profile. Changes persist.
ASSIGNEE: Dev 3

TASK 2.1.3: Patient APIs
GET /api/patients/:id → Full patient profile
PATCH /api/patients/:id → Update profile
GET /api/patients/:id/dashboard-stats → { totalVisits, upcomingAppointments, totalDocuments }

ACCEPTANCE: APIs return correct data. Authorization checks work.
ASSIGNEE: Dev 2

SPRINT 2.2 — Book OPD & Intake Form (Day 3-4)
───────────────────────────────────────────────────────────────────────────────

TASK 2.2.1: Hospital & Department APIs
GET /api/hospitals → List all verified hospitals
GET /api/hospitals/:id/departments → List departments
GET /api/hospitals/:id/doctors?departmentId=X → List doctors in department
GET /api/doctors/:id/slots?date=YYYY-MM-DD → Available slots

ACCEPTANCE: Returns populated data. Test with seeded data.
ASSIGNEE: Dev 2

TASK 2.2.2: Book OPD Flow UI
Step 1: Select Hospital (searchable list with cards)
Step 2: Select Department (icon cards)
Step 3: Select Doctor (profile cards with rating, fee, experience)
Step 4: Select Date & Time Slot (calendar + time grid)
Step 5: Fill Intake Form:
  - Chief Complaint (text area)
  - Description (text area)
  - Severity (1-10 slider with emojis)
  - Associated Symptoms (multi-select chips):
    [Fever, Cough, Headache, Chest Pain, Shortness of Breath, 
     Nausea, Vomiting, Dizziness, Fatigue, Body Ache, 
     Skin Rash, Swelling, Bleeding, Other]
  - Current Medications (text area)
  - Known Allergies (text area)
  - Vital Signs (optional):
    * Blood Pressure (systolic/diastolic inputs)
    * Pulse (number input)
    * Temperature (°C input)
    * SpO2 (% input)
    * Weight (kg input)
  - Upload past relevant documents (file picker, max 5 files)

Step 6: Review & Confirm (summary card)
Step 7: Booking Confirmation (token number, QR code, estimated time)

ACCEPTANCE: Complete flow works end-to-end. Booking creates visit record.
ASSIGNEE: Dev 3

TASK 2.2.3: Create Visit API
POST /api/visits
Body: {
  patient_id, hospital_id, department_id, doctor_id, slot_id,
  chief_complaint, symptoms_description, severity, associated_symptoms,
  current_medications, known_allergies,
  vitals_bp, vitals_pulse, vitals_temperature, vitals_spo2, vitals_weight
}

Logic:
- Insert visit with status='booked'
- Generate token number (format: DEPT-001, auto-increment per department per day)
- Increment opd_slots.booked_count
- Create queue entry with position
- Return visit details + token

ACCEPTANCE: Visit created. Token generated. Queue entry created.
ASSIGNEE: Dev 2

TASK 2.2.4: Smart Department Suggestion
- Based on chief_complaint + associated_symptoms, suggest department
- Simple keyword mapping:
  * chest pain, breathlessness, palpitations → Cardiology
  * fracture, joint pain, back pain → Orthopedics
  * fever, cough, cold, body ache → General Medicine
  * skin rash, acne, hair fall → Dermatology
  * pregnancy, menstrual, gynec → Gynecology
  * child, pediatric → Pediatrics
  * default → General Medicine

ACCEPTANCE: Suggestion appears with confidence. User can override.
ASSIGNEE: Dev 3

SPRINT 2.3 — My Visits & Health Timeline (Day 4-5)
───────────────────────────────────────────────────────────────────────────────

TASK 2.3.1: My Visits Page
- Tabs: Upcoming | Past | Cancelled
- Each visit card shows:
  * Hospital name + logo
  * Department
  * Doctor name + photo
  * Date & Time
  * Token number (large, prominent)
  * Status badge (color-coded)
  * Chief complaint preview
- Click card → Visit Detail Modal/Page

ACCEPTANCE: Visits list correctly filtered. Detail view shows all data.
ASSIGNEE: Dev 3

TASK 2.3.2: Visit Detail View
Sections:
1. Visit Info (date, hospital, doctor, token, status)
2. My Complaint (what patient reported)
3. Doctor's Diagnosis & Notes (if completed)
4. Prescription (medication list)
5. Lab Tests (recommended/completed)
6. Documents (uploaded for this visit)
7. Follow-up date

ACCEPTANCE: All sections populated from API. Prescription readable.
ASSIGNEE: Dev 3

TASK 2.3.3: Health Timeline Page
- Vertical timeline visualization
- Each node = one visit
- Node color by department
- Click node → expand visit details
- Filter by: Date range, Department, Doctor
- Search by diagnosis or complaint
- Show trend indicators (visits per month)

ACCEPTANCE: Timeline renders chronologically. Filters work.
ASSIGNEE: Dev 3

TASK 2.3.4: Add Past Visit (Manual Entry)
- Form to add visits that happened outside platform
- Fields: Hospital name (text), Department, Doctor name, Date,
  Chief complaint, Diagnosis, Medications, Notes
- Upload documents for this past visit

ACCEPTANCE: Manual visit appears in timeline. Documents linked.
ASSIGNEE: Dev 3

TASK 2.3.5: Patient Visit APIs
GET /api/patients/:id/visits?status=&upcoming= → All visits
GET /api/visits/:id → Single visit detail
POST /api/visits/:id/cancel → Cancel visit
POST /api/visits/manual → Add manual past visit

ACCEPTANCE: CRUD operations work. Authorization enforced.
ASSIGNEE: Dev 2

SPRINT 2.4 — Document Vault (Day 5)
───────────────────────────────────────────────────────────────────────────────

TASK 2.4.1: Document Upload API
POST /api/documents
Body: multipart/form-data { patient_id, visit_id (optional), document_type, file, description }

Logic:
- Save file to /uploads/patients/:patientId/ (or S3)
- Store metadata in documents table
- Return document URL

ACCEPTANCE: File uploads. URL accessible. Metadata stored.
ASSIGNEE: Dev 2

TASK 2.4.2: Documents Page UI
- Two views: Grid (thumbnail cards) | List (table)
- Filter by: Document Type (tabs: All | Prescriptions | Lab Reports | Discharge | Imaging | Other)
- Sort by: Date (newest first)
- Each document card:
  * Thumbnail/icon
  * File name
  * Type badge
  * Date
  * Visit link (if associated)
  * Download button
  * Delete button
- Upload button (drag & drop zone)

ACCEPTANCE: Documents display correctly. Upload/download works.
ASSIGNEE: Dev 3

TASK 2.4.3: Document APIs
GET /api/patients/:id/documents → List all documents
DELETE /api/documents/:id → Delete document

ACCEPTANCE: List and delete work. Only owner can delete.
ASSIGNEE: Dev 2

═══════════════════════════════════════════════════════════════════════════════
PHASE 3: HOSPITAL ADMIN PORTAL (Days 6-8)
═══════════════════════════════════════════════════════════════════════════════

SPRINT 3.1 — Hospital Dashboard & Navigation (Day 6)
───────────────────────────────────────────────────────────────────────────────

TASK 3.1.1: Hospital Dashboard Layout
- Sidebar:
  * 🏠 Dashboard
  * 📋 Today's OPD
  * 👨‍⚕️ Doctors
  * 🏥 Departments
  * 📊 Analytics
  * ⚙️ Settings
- Top bar: Hospital name, notification bell, admin profile
- Dashboard widgets:
  * Today's stats: Total patients, In queue, Completed, Emergency count
  * Department distribution (pie chart)
  * Live queue status (per department)
  * Recent admissions (last 5)

ACCEPTANCE: Dashboard shows real-time data. Widgets render.
ASSIGNEE: Dev 3

TASK 3.1.2: Hospital Stats API
GET /api/hospitals/:id/dashboard
Returns: {
  today: { totalPatients, inQueue, completed, emergencies, avgWaitTime },
  departments: [{ name, patientCount, color }],
  recentVisits: [...],
  queueStatus: [{ department, waitingCount, currentToken }]
}

ACCEPTANCE: Stats accurate. Aggregated from visits table.
ASSIGNEE: Dev 2

SPRINT 3.2 — Today's OPD & Triage (Day 6-7)
───────────────────────────────────────────────────────────────────────────────

TASK 3.2.1: Today's OPD List API
GET /api/hospitals/:id/todays-opd?status=&departmentId=&priority=
Returns visits where visit_date = today, with:
- Patient details (name, age, gender, phone)
- Chief complaint
- Severity
- Status
- Priority
- Assigned department/doctor
- Token number

ACCEPTANCE: Returns today's visits only. Filters work.
ASSIGNEE: Dev 2

TASK 3.2.2: Triage Interface UI
- Table view of all today's patients
- Columns: Token | Patient | Age/Gender | Complaint | Severity | Status | Assigned To | Actions
- Row click → Patient Detail Slide-out Panel:
  * Patient profile (name, age, contact, photo)
  * Medical history summary (past visits count, chronic conditions)
  * Current complaint (full details)
  * Uploaded documents (thumbnails, click to view)
  * Vitals (if provided)
- Triage Actions:
  * Assign Department (dropdown)
  * Assign Doctor (dropdown, filtered by department)
  * Set Priority (Normal / Urgent / Emergency)
  * Add Triage Notes
  * Save Assignment
- Bulk actions: Select multiple → Assign department

ACCEPTANCE: Can triage patients. Assignments update DB. Queue updates.
ASSIGNEE: Dev 3

TASK 3.2.3: Triage Assignment API
PATCH /api/visits/:id/triage
Body: { department_id, doctor_id, priority, triage_notes }

Logic:
- Update visit with assigned department, doctor, priority
- Set status='in_queue'
- Update queue entry with new department and priority
- Recalculate queue positions
- Emit WebSocket event: 'patient_assigned'

ACCEPTANCE: Assignment updates all related records. Queue reorders.
ASSIGNEE: Dev 2

TASK 3.2.4: Auto-Triage Suggestion
- Based on patient's chief_complaint + associated_symptoms + severity
- Suggest department and priority
- Display as "Recommended: Cardiology (Urgent)" with Accept/Reject
- Same keyword mapping as patient side, but with priority rules:
  * Severity >= 8 → Urgent
  * Chest pain + high severity → Emergency
  * Normal cases → Normal

ACCEPTANCE: Suggestions appear. Admin can override.
ASSIGNEE: Dev 2

SPRINT 3.3 — Queue Management (Day 7-8)
───────────────────────────────────────────────────────────────────────────────

TASK 3.3.1: Department Queue View
- Per-department queue cards
- Each card shows:
  * Department name + icon
  * Current token being served (large)
  * Waiting count
  * Queue list (scrollable):
    - Token # | Patient Name | Priority | Wait Time | Status
    - Color coding: Emergency=red, Urgent=orange, Normal=green
- Actions per patient:
  * Call Next (moves to 'with_doctor')
  * Skip (moves to end of queue)
  * Mark Complete
  * Send to Lab
  * Send to Pharmacy

ACCEPTANCE: Queue displays correctly. Actions update status.
ASSIGNEE: Dev 3

TASK 3.3.2: Call Next Patient API
POST /api/queues/:departmentId/call-next
Logic:
- Find highest priority patient at front of queue
- Update queue.status='called', queue.called_at=now
- Update visit.status='with_doctor'
- Emit WebSocket: 'patient_called' { token, patientName, doctorId }

ACCEPTANCE: Next patient called. Status updates. Notification sent.
ASSIGNEE: Dev 2

TASK 3.3.3: Public Display Board (Optional but impressive)
- Full-screen page: /display/:hospitalId
- Shows:
  * Current token per department (large, auto-updating)
  * Next 3 tokens waiting
  * Hospital branding
  * Date/time
- Auto-refreshes every 5 seconds (polling or WebSocket)

ACCEPTANCE: Display shows live queue data. Updates automatically.
ASSIGNEE: Dev 3

TASK 3.3.4: Queue APIs
GET /api/hospitals/:id/queues → All department queues
GET /api/queues/:departmentId → Single department queue
PATCH /api/queues/:queueId/status → Update status

ACCEPTANCE: Queue CRUD works. Positions auto-calculate.
ASSIGNEE: Dev 2

SPRINT 3.4 — Doctor & Department Management (Day 8)
───────────────────────────────────────────────────────────────────────────────

TASK 3.4.1: Doctor Management Page
- List all doctors in hospital
- Each card: Photo, Name, Qualification, Department, Status toggle
- Actions: Edit, Deactivate, View Schedule
- Add Doctor button → Form

ACCEPTANCE: CRUD for doctors. Status toggle works.
ASSIGNEE: Dev 3

TASK 3.4.2: Department Management Page
- List departments
- Add/Edit/Deactivate departments
- View patient count per department

ACCEPTANCE: Department CRUD works.
ASSIGNEE: Dev 3

TASK 3.4.3: Doctor APIs
GET /api/hospitals/:id/doctors
POST /api/doctors
PATCH /api/doctors/:id
DELETE /api/doctors/:id (soft delete)

ACCEPTANCE: APIs work with proper authorization.
ASSIGNEE: Dev 2

═══════════════════════════════════════════════════════════════════════════════
PHASE 4: DOCTOR PORTAL (Days 9-11)
═══════════════════════════════════════════════════════════════════════════════

SPRINT 4.1 — Doctor Dashboard & Schedule (Day 9)
───────────────────────────────────────────────────────────────────────────────

TASK 4.1.1: Doctor Dashboard Layout
- Sidebar:
  * 🏠 Dashboard
  * 📋 My Patients (Today's Queue)
  * 📅 Schedule
  * 📊 My Performance
  * 👤 Profile
- Top bar: Doctor name, hospital name, notification bell
- Dashboard widgets:
  * Today's schedule: Morning OPD (9-1) | Evening OPD (4-7)
  * Patients waiting count
  * Next patient preview
  * Today's completed count
  * Average consultation time

ACCEPTANCE: Dashboard renders with doctor-specific data.
ASSIGNEE: Dev 3

TASK 4.1.2: Doctor Schedule API
GET /api/doctors/:id/schedule?date=YYYY-MM-DD
Returns: {
  date,
  slots: [{ id, startTime, endTime, maxPatients, bookedCount, isAvailable }],
  totalPatients,
  completedCount
}

ACCEPTANCE: Returns schedule for given date.
ASSIGNEE: Dev 2

SPRINT 4.2 — Patient Queue & Consultation (Day 9-10)
───────────────────────────────────────────────────────────────────────────────

TASK 4.2.1: My Patients Queue UI
- List of patients assigned to this doctor today
- Cards showing:
  * Token number (large)
  * Patient name, age, gender
  * Chief complaint
  * Priority badge
  * Status (Waiting / With You / Completed)
  * Wait time
- "Call Next" button (fetches next patient from queue)
- Click patient → Open Patient Card (full view)

ACCEPTANCE: Queue shows doctor's patients. Call next works.
ASSIGNEE: Dev 3

TASK 4.2.2: THE PATIENT CARD (Core Feature)
This is the MOST IMPORTANT screen. Design it as a comprehensive clinical view:

┌─────────────────────────────────────────────────────────────────────────────┐
│ PATIENT CARD — Token #A-42                                           [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────────────────────────────────────────────┐   │
│ │  [PHOTO]    │  │ [Name], [Age]/[Gender]          Priority: [badge]  │   │
│ │             │  │ Phone: [XXX] | ABHA: [ID]                          │   │
│ │             │  │ Blood Group: [X] | Allergies: [List]               │   │
│ └─────────────┘  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📊 MEDICAL HISTORY (Longitudinal — ALL past visits across platform)        │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ Timeline: [Visit 1]——[Visit 2]——[Visit 3]——[Visit 4]                    ││
│ │                                                                         ││
│ │ Chronic Conditions: [Diabetes since 2023] [Hypertension since 2022]    ││
│ │ Current Medications: [Metformin 500mg] [Amlodipine 5mg]                ││
│ │ Past Surgeries: [Appendectomy 2019]                                    ││
│ │ Family History: [Father: Heart Disease] [Mother: Diabetes]             ││
│ └─────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│ 📁 DOCUMENTS                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ [Prescription 2024-01] [Lab Report 2024-02] [Discharge 2023-12]        ││
│ │ [Imaging 2023-11]      [Prescription 2023-09] [...]                    ││
│ │ Click to view full document                                            ││
│ └─────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│ 🩺 CURRENT VISIT — What patient reported today                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ Chief Complaint: "Severe chest pain since morning"                     ││
│ │ Duration: "Since 6 AM today"                                           ││
│ │ Severity: ████████░░ 8/10                                              ││
│ │ Associated: [Chest Pain] [Shortness of Breath] [Sweating]              ││
│ │ Description: "Pain radiates to left arm, feels like crushing weight"   ││
│ │ Current Meds: "Taking aspirin occasionally"                            ││
│ │ Allergies: "Penicillin"                                                ││
│ │ Vitals: BP: 160/100 | Pulse: 98 | Temp: 98.6°F | SpO2: 94%           ││
│ └─────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│ 📝 CONSULTATION NOTES (Doctor fills here)                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ Provisional Diagnosis:     [________________________]                  ││
│ │ Differential Diagnosis:    [________________________]                  ││
│ │ Examination Findings:      [Text area]                                 ││
│ │                                                                          ││
│ │ PRESCRIPTION:                                                            ││
│ │ ┌─────────────┬─────────┬───────────┬──────────┬─────────────┐        ││
│ │ │ Drug Name   │ Dosage  │ Frequency │ Duration │ Instructions│  [+]   ││
│ │ ├─────────────┼─────────┼───────────┼──────────┼─────────────┤        ││
│ │ │             │         │           │          │             │  [🗑]  ││
│ │ └─────────────┴─────────┴───────────┴──────────┴─────────────┘        ││
│ │                                                                          ││
│ │ LAB TESTS:                                                               ││
│ │ [☑] CBC  [☑] Lipid Profile  [☐] Troponin  [☐] ECG  [☐] Chest X-Ray  ││
│ │ [Add Custom: __________]                                                ││
│ │                                                                          ││
│ │ Advice:                    [Text area]                                 ││
│ │ Follow-up Date:            [Date picker]                               ││
│ │ Next Review:               [1 week / 2 weeks / 1 month / Custom]       ││
│ └─────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│ [🏠 Send Home]  [🏥 Admit]  [↗️ Refer]  [✅ Complete Consultation]         │
└─────────────────────────────────────────────────────────────────────────────┘

ACCEPTANCE: All sections render. Prescription table is editable. Complete button works.
ASSIGNEE: Dev 3

TASK 4.2.3: Patient History API for Doctor
GET /api/doctors/:id/patients/:patientId/history
Returns:
{
  patient: { full profile },
  visits: [all past visits with prescriptions, lab tests, documents],
  chronicConditions: [derived from past diagnoses],
  currentMedications: [from latest prescriptions],
  allergies: [from patient profile],
  familyHistory: [from patient profile],
  documents: [all documents grouped by type]
}

ACCEPTANCE: Returns complete longitudinal history. Aggregated correctly.
ASSIGNEE: Dev 2

TASK 4.2.4: Complete Consultation API
POST /api/visits/:id/complete
Body: {
  diagnosis,
  examination_findings,
  prescription: {
    diagnosis,
    notes,
    follow_up_date,
    items: [{ drug_name, dosage, frequency, duration, instructions }]
  },
  lab_tests: [{ test_name }],
  advice,
  status: 'completed'
}

Logic:
- Insert prescription + prescription_items
- Insert lab_tests (status='recommended')
- Update visit with diagnosis, examination_findings, advice, follow_up_date, status='completed'
- Update queue status='completed'
- Emit WebSocket: 'consultation_completed'

ACCEPTANCE: All records created. Visit status updated. Patient gets notification.
ASSIGNEE: Dev 2

TASK 4.2.5: Prescription PDF Generation
- On consultation complete, generate PDF prescription
- Template includes:
  * Hospital letterhead
  * Doctor details
  * Patient details
  * Date
  * Diagnosis
  * Medication table
  * Advice
  * Doctor signature placeholder
- Store PDF URL in visit record
- Patient can download from their portal

ACCEPTANCE: PDF generates correctly. Downloadable by patient.
ASSIGNEE: Dev 2

SPRINT 4.3 — Doctor Profile & Performance (Day 11)
───────────────────────────────────────────────────────────────────────────────

TASK 4.3.1: Doctor Profile Page
- View/Edit profile
- View schedule calendar
- Set availability (mark slots available/unavailable)

ACCEPTANCE: Profile editable. Schedule updates reflect in booking.
ASSIGNEE: Dev 3

TASK 4.3.2: Performance Metrics
- Patients seen today/this week/this month
- Average consultation time
- Patient ratings & reviews
- Department-wise patient distribution

ACCEPTANCE: Metrics calculated from visit data.
ASSIGNEE: Dev 2

═══════════════════════════════════════════════════════════════════════════════
PHASE 5: NOTIFICATIONS, REAL-TIME & POLISH (Days 12-13)
═══════════════════════════════════════════════════════════════════════════════

SPRINT 5.1 — Real-Time Features (Day 12)
───────────────────────────────────────────────────────────────────────────────

TASK 5.1.1: WebSocket Setup (Socket.io)
- Server: Initialize Socket.io with CORS
- Rooms:
  * `hospital_${hospitalId}` — for hospital admins
  * `doctor_${doctorId}` — for doctors
  * `patient_${patientId}` — for patients
- Events:
  * 'patient_assigned' → emit to hospital room + doctor room
  * 'patient_called' → emit to doctor room + patient room
  * 'consultation_completed' → emit to patient room
  * 'queue_updated' → emit to hospital room

ACCEPTANCE: Real-time updates work across all portals.
ASSIGNEE: Dev 2

TASK 5.1.2: Frontend WebSocket Integration
- Patient portal: Listen for 'consultation_completed' → show notification
- Hospital portal: Listen for 'queue_updated' → refresh queue
- Doctor portal: Listen for 'patient_assigned' → add to queue

ACCEPTANCE: All portals receive real-time updates.
ASSIGNEE: Dev 3

TASK 5.1.3: Toast Notification System
- Global toast component
- Types: success, error, warning, info
- Auto-dismiss after 5 seconds
- Used for: API success/error, real-time events

ACCEPTANCE: Toasts appear correctly. Auto-dismiss works.
ASSIGNEE: Dev 3

SPRINT 5.2 — UI/UX Polish (Day 12-13)
───────────────────────────────────────────────────────────────────────────────

TASK 5.2.1: Loading States
- Skeleton loaders for lists
- Spinners for buttons during API calls
- Progress bars for file uploads

ACCEPTANCE: No blank screens. Loading feedback everywhere.
ASSIGNEE: Dev 3

TASK 5.2.2: Empty States
- Illustrations + text for empty lists
- "No visits yet" / "No documents uploaded" / "Queue is empty"

ACCEPTANCE: All empty lists have friendly empty states.
ASSIGNEE: Dev 3

TASK 5.2.3: Error Handling
- Global error boundary
- API error toasts with user-friendly messages
- Retry buttons for failed requests
- Offline detection ("You are offline" banner)

ACCEPTANCE: Errors handled gracefully. No crashes.
ASSIGNEE: Dev 3

TASK 5.2.4: Responsive Design
- Patient portal: Mobile-first (patients may use phones)
- Hospital portal: Tablet + Desktop (admins use computers)
- Doctor portal: Tablet optimized (doctors use tablets in OPD)

ACCEPTANCE: All portals usable on target devices.
ASSIGNEE: Dev 3

═══════════════════════════════════════════════════════════════════════════════
PHASE 6: TESTING, DEMO PREP & DEPLOYMENT (Days 14-15)
═══════════════════════════════════════════════════════════════════════════════

SPRINT 6.1 — Testing (Day 14)
───────────────────────────────────────────────────────────────────────────────

TASK 6.1.1: API Testing
- Test all endpoints with Postman/Thunder Client
- Verify: status codes, response structure, error cases
- Test authorization: wrong token, expired token, wrong role

ACCEPTANCE: All 30+ endpoints tested. Auth enforcement verified.
ASSIGNEE: Dev 2

TASK 6.1.2: End-to-End Flow Testing
Flow 1: Patient registers → Books OPD → Hospital triages → Doctor consults → Prescription generated
Flow 2: Patient adds past visit → Uploads document → Views timeline
Flow 3: Hospital adds doctor → Sets schedule → Patient books that slot

ACCEPTANCE: All 3 flows complete without errors.
ASSIGNEE: All Devs

TASK 6.1.3: Seed Demo Data
Run seed script to create:
- 1 Hospital: "City General Hospital"
- 5 Departments: General Medicine, Cardiology, Orthopedics, Dermatology, Pediatrics
- 5 Doctors (1 per department)
- 10 Patients with varied profiles
- 15 Visits (mix of completed, in-queue, booked)
- 20 Documents (prescriptions, lab reports)
- Realistic chief complaints and prescriptions

ACCEPTANCE: Demo data populates all portals with realistic scenarios.
ASSIGNEE: Dev 2

SPRINT 6.2 — Deployment & Demo (Day 14-15)
───────────────────────────────────────────────────────────────────────────────

TASK 6.2.1: Production Build
- Client: `npm run build` → optimized static files
- Server: Environment variables for production
- Database: Run migrations on production DB

ACCEPTANCE: Production build succeeds. No console errors.
ASSIGNEE: Dev 1

TASK 6.2.2: Deploy to Cloud
Options (pick one):
- Render.com (free tier, easiest)
- Railway.app (free tier)
- Vercel (frontend) + Render (backend)
- AWS EC2 (if you have credits)

Steps:
1. Push code to GitHub
2. Connect repo to deployment platform
3. Set environment variables
4. Deploy

ACCEPTANCE: App accessible via public URL.
ASSIGNEE: Dev 1

TASK 6.2.3: Demo Script Preparation
Prepare a 5-minute demo showing:
1. Patient registers and books OPD for chest pain
2. Hospital admin sees booking, triages to Cardiology (Urgent)
3. Doctor sees patient in queue, opens Patient Card
4. Doctor sees full history, current complaint, writes prescription
5. Patient gets notification, views prescription and visit summary
6. Patient uploads a past document to their vault

ACCEPTANCE: Demo flows smoothly. All features visible.
ASSIGNEE: All Team

TASK 6.2.4: SIH Submission Document
- Problem statement alignment
- Solution architecture diagram
- Tech stack justification
- Innovation highlights (smart triage, longitudinal history, real-time queue)
- Screenshots of all 3 portals
- Demo video link

ACCEPTANCE: Document complete and professional.
ASSIGNEE: All Team

═══════════════════════════════════════════════════════════════════════════════
FEATURE PRIORITY MATRIX
═══════════════════════════════════════════════════════════════════════════════

MUST HAVE (Build First — Demo Will Fail Without These):
☑ User registration & login (all 3 roles)
☑ Patient books OPD with intake form
☑ Hospital sees today's patients and triages
☑ Doctor sees patient queue
☑ Doctor views patient history + current complaint
☑ Doctor writes prescription and completes consultation
☑ Patient sees visit summary and prescription

SHOULD HAVE (Impressive for Demo):
☐ Smart department suggestion based on symptoms
☐ Document upload and vault
☐ Health timeline visualization
☐ Real-time queue updates (WebSocket)
☐ Public display board
☐ Prescription PDF generation
☐ Priority queue (Emergency/Urgent/Normal)

NICE TO HAVE (Post-Hackathon):
☐ ABHA integration
☐ SMS/Email notifications
☐ Analytics dashboard
☐ Doctor performance metrics
☐ Multi-hospital support
☐ Mobile app
☐ AI symptom checker

═══════════════════════════════════════════════════════════════════════════════
TEAM ROLE ASSIGNMENT
═══════════════════════════════════════════════════════════════════════════════

DEV 1 — Full-Stack Lead
- Project setup, Docker, deployment
- Database design & migrations
- Backend architecture & core APIs
- Integration testing
- DevOps & deployment

DEV 2 — Backend Specialist
- All API endpoints (30+ routes)
- Authentication & authorization
- Database queries & optimization
- WebSocket real-time features
- PDF generation
- Seed data & demo scenarios

DEV 3 — Frontend Specialist
- All 3 portal UIs
- React components & state management
- API integration (axios)
- Responsive design
- UI/UX polish
- Demo flow preparation

═══════════════════════════════════════════════════════════════════════════════
DAILY STANDUP CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

Every day at start:
□ Review yesterday's completed tasks
□ Identify blockers
□ Assign today's tasks from this plan
□ Check if any feature needs descoping
□ Update demo readiness percentage

Every day at end:
□ Commit all code
□ Update task status
□ Note any deviations from plan
□ Prepare for tomorrow

═══════════════════════════════════════════════════════════════════════════════
SUCCESS CRITERIA FOR SIH
═══════════════════════════════════════════════════════════════════════════════

Your demo will win if you can show:
1. A patient with a COMPLETE health history (past visits + documents)
2. The patient books an OPD and the hospital RECEIVES it instantly
3. The hospital assigns the patient to a doctor with ONE CLICK
4. The doctor opens a RICH patient card showing FULL history + current complaint
5. The doctor writes a prescription and the patient SEES it immediately
6. The queue updates in REAL-TIME across all screens

This closed loop — Patient → Hospital → Doctor → Patient — is your innovation story.
