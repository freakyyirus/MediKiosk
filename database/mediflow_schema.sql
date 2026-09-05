-- ============================================================
-- MediFlow OPD System - Complete Supabase SQL Schema
-- ============================================================
-- Run this file in the Supabase SQL Editor to bootstrap the
-- entire database schema, seed data, and RLS policies.
-- ============================================================

-- 0. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1.1 profiles (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    role        TEXT NOT NULL DEFAULT 'patient'
                CHECK (role IN ('patient', 'hospital_admin', 'doctor')),
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 patients (extends profiles for patient-specific data)
-- ============================================================
CREATE TABLE patients (
    id                      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    date_of_birth           DATE NOT NULL,
    age                     INTEGER NOT NULL DEFAULT 0,
    gender                  TEXT CHECK (gender IN ('male', 'female', 'other')),
    blood_group             TEXT CHECK (blood_group IN (
                                'A+','A-','B+','B-','AB+','AB-','O+','O-'
                            )),
    address                 TEXT,
    emergency_contact_name  TEXT,
    emergency_contact_phone TEXT,
    abha_id                 TEXT UNIQUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 hospitals
-- ============================================================
CREATE TABLE hospitals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                TEXT NOT NULL,
    address             TEXT,
    phone               TEXT,
    email               TEXT,
    registration_number TEXT UNIQUE,
    logo_url            TEXT,
    is_verified         BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 departments
-- ============================================================
CREATE TABLE departments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT,
    color_code  TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(hospital_id, name)
);

-- 1.5 doctors (extends profiles for doctor-specific data)
-- ============================================================
CREATE TABLE doctors (
    id                UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    hospital_id       UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    full_name         TEXT NOT NULL,
    qualification     TEXT,
    specialization    TEXT,
    license_number    TEXT UNIQUE,
    experience_years  INTEGER DEFAULT 0,
    consultation_fee  NUMERIC(10,2) DEFAULT 0,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    rating            NUMERIC(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.6 opd_slots
-- ============================================================
CREATE TABLE opd_slots (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id     UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    slot_date     DATE NOT NULL,
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    max_patients  INTEGER NOT NULL DEFAULT 20,
    booked_count  INTEGER NOT NULL DEFAULT 0,
    is_available  BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_time > start_time),
    CHECK (booked_count <= max_patients)
);

-- 1.7 visits (core entity)
-- ============================================================
CREATE TABLE visits (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id             UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id            UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id          UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    doctor_id              UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    slot_id                UUID REFERENCES opd_slots(id) ON DELETE SET NULL,
    booking_date           TIMESTAMPTZ NOT NULL DEFAULT now(),
    visit_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    token_number           TEXT,
    status                 TEXT NOT NULL DEFAULT 'booked'
                           CHECK (status IN (
                               'booked','confirmed','checked_in','in_queue',
                               'with_doctor','under_investigation',
                               'completed','cancelled'
                           )),
    priority               TEXT NOT NULL DEFAULT 'normal'
                           CHECK (priority IN ('normal','urgent','emergency')),
    chief_complaint        TEXT,
    symptoms_description   TEXT,
    severity               INTEGER CHECK (severity >= 1 AND severity <= 10),
    associated_symptoms    TEXT[],
    current_medications    TEXT,
    known_allergies        TEXT,
    vitals_bp              TEXT,
    vitals_pulse           INTEGER,
    vitals_temperature     NUMERIC(5,2),
    vitals_spo2            NUMERIC(5,2),
    vitals_weight          NUMERIC(5,2),
    triaged_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
    triage_notes           TEXT,
    triaged_at             TIMESTAMPTZ,
    diagnosis              TEXT,
    examination_findings   TEXT,
    advice                 TEXT,
    follow_up_date         DATE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.8 prescriptions
-- ============================================================
CREATE TABLE prescriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id        UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    diagnosis       TEXT,
    notes           TEXT,
    follow_up_date  DATE,
    created_by      UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.9 prescription_items
-- ============================================================
CREATE TABLE prescription_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    drug_name       TEXT NOT NULL,
    dosage          TEXT NOT NULL,
    frequency       TEXT NOT NULL,
    duration        TEXT,
    instructions    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.10 lab_tests
-- ============================================================
CREATE TABLE lab_tests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id        UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    test_name       TEXT NOT NULL,
    result_value    TEXT,
    reference_range TEXT,
    unit            TEXT,
    is_abnormal     BOOLEAN DEFAULT false,
    document_url    TEXT,
    status          TEXT NOT NULL DEFAULT 'recommended'
                    CHECK (status IN ('recommended','pending','completed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.11 documents
-- ============================================================
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id        UUID REFERENCES visits(id) ON DELETE SET NULL,
    document_type   TEXT NOT NULL
                    CHECK (document_type IN (
                        'prescription','lab_report','discharge_summary',
                        'imaging','insurance','other'
                    )),
    file_name       TEXT NOT NULL,
    file_url        TEXT NOT NULL,
    file_size       BIGINT,
    description     TEXT,
    upload_date     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.12 queues
-- ============================================================
CREATE TABLE queues (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id        UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    token_number    TEXT NOT NULL,
    queue_position  INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'waiting'
                    CHECK (status IN (
                        'waiting','called','in_consultation','completed','skipped'
                    )),
    queued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    called_at       TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    priority        INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX uq_queues_dept_token_date
    ON queues (department_id, token_number, (queued_at::date));

-- 1.13 audit_logs
-- ============================================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name      TEXT NOT NULL,
    record_id       UUID NOT NULL,
    action          TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
    performed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
    old_values      JSONB,
    new_values      JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);

-- patients
CREATE INDEX idx_patients_dob ON patients(date_of_birth);
CREATE INDEX idx_patients_gender ON patients(gender);
CREATE INDEX idx_patients_abha ON patients(abha_id);

-- departments
CREATE INDEX idx_departments_hospital ON departments(hospital_id);
CREATE INDEX idx_departments_active ON departments(is_active);

-- doctors
CREATE INDEX idx_doctors_hospital ON doctors(hospital_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_active ON doctors(is_active);

-- opd_slots
CREATE INDEX idx_opd_slots_doctor ON opd_slots(doctor_id);
CREATE INDEX idx_opd_slots_department ON opd_slots(department_id);
CREATE INDEX idx_opd_slots_date ON opd_slots(slot_date);
CREATE INDEX idx_opd_slots_available ON opd_slots(is_available, slot_date);

-- visits
CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_visits_hospital ON visits(hospital_id);
CREATE INDEX idx_visits_department ON visits(department_id);
CREATE INDEX idx_visits_doctor ON visits(doctor_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_visits_token ON visits(token_number);

-- prescriptions
CREATE INDEX idx_prescriptions_visit ON prescriptions(visit_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(created_by);

-- prescription_items
CREATE INDEX idx_prescription_items_rx ON prescription_items(prescription_id);

-- lab_tests
CREATE INDEX idx_lab_tests_visit ON lab_tests(visit_id);
CREATE INDEX idx_lab_tests_status ON lab_tests(status);

-- documents
CREATE INDEX idx_documents_patient ON documents(patient_id);
CREATE INDEX idx_documents_visit ON documents(visit_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- queues
CREATE INDEX idx_queues_visit ON queues(visit_id);
CREATE INDEX idx_queues_department ON queues(department_id);
CREATE INDEX idx_queues_status ON queues(status);

-- audit_logs
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE opd_slots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;

-- 3.1 Helper: get current user role & hospital
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_hospital_id()
RETURNS UUID AS $$
    SELECT hospital_id FROM doctors WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3.2 profiles
-- ============================================================
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Hospital admins can view profiles in their hospital"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.id = profiles.id
              AND d.hospital_id = get_user_hospital_id()
        )
        OR EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.id = auth.uid()
              AND d.hospital_id IN (
                  SELECT hospital_id FROM doctors WHERE id = profiles.id
              )
        )
    );

CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- 3.3 patients
-- ============================================================
CREATE POLICY "Patients can view own record"
    ON patients FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Patients can update own record"
    ON patients FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Hospital admins can view patients in their hospital"
    ON patients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = patients.id
              AND v.hospital_id = get_user_hospital_id()
        )
    );

CREATE POLICY "Doctors can view assigned patients"
    ON patients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = patients.id
              AND v.doctor_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage patients"
    ON patients FOR ALL
    USING (auth.role() = 'service_role');

-- 3.4 hospitals (public read)
-- ============================================================
CREATE POLICY "Anyone can view hospitals"
    ON hospitals FOR SELECT
    USING (true);

CREATE POLICY "Hospital admins can update their hospital"
    ON hospitals FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.id = auth.uid()
              AND d.hospital_id = hospitals.id
        )
    );

CREATE POLICY "Service role can manage hospitals"
    ON hospitals FOR ALL
    USING (auth.role() = 'service_role');

-- 3.5 departments (public read)
-- ============================================================
CREATE POLICY "Anyone can view active departments"
    ON departments FOR SELECT
    USING (is_active = true);

CREATE POLICY "Hospital admins can manage departments in their hospital"
    ON departments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.id = auth.uid()
              AND d.hospital_id = departments.hospital_id
        )
    );

-- 3.6 doctors (public read for listing)
-- ============================================================
CREATE POLICY "Anyone can view active doctors"
    ON doctors FOR SELECT
    USING (is_active = true);

CREATE POLICY "Doctors can view own record"
    ON doctors FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Doctors can update own record"
    ON doctors FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Hospital admins can manage doctors in their hospital"
    ON doctors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.id = auth.uid()
              AND d.hospital_id = doctors.hospital_id
        )
    );

-- 3.7 opd_slots
-- ============================================================
CREATE POLICY "Anyone can view available slots"
    ON opd_slots FOR SELECT
    USING (is_available = true);

CREATE POLICY "Doctors can manage own slots"
    ON opd_slots FOR ALL
    USING (doctor_id = auth.uid());

CREATE POLICY "Hospital admins can manage slots in their hospital"
    ON opd_slots FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.id = auth.uid()
              AND d.hospital_id IN (
                  SELECT hospital_id FROM doctors WHERE id = opd_slots.doctor_id
              )
        )
    );

-- 3.8 visits
-- ============================================================
CREATE POLICY "Patients can view own visits"
    ON visits FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "Patients can create own visits"
    ON visits FOR INSERT
    WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors can view assigned visits"
    ON visits FOR SELECT
    USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can update assigned visits"
    ON visits FOR UPDATE
    USING (doctor_id = auth.uid());

CREATE POLICY "Hospital admins can view all visits in their hospital"
    ON visits FOR SELECT
    USING (hospital_id = get_user_hospital_id());

CREATE POLICY "Hospital admins can manage all visits in their hospital"
    ON visits FOR ALL
    USING (hospital_id = get_user_hospital_id());

-- 3.9 prescriptions
-- ============================================================
CREATE POLICY "Patients can view own prescriptions"
    ON prescriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = prescriptions.visit_id
              AND v.patient_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can manage prescriptions for assigned visits"
    ON prescriptions FOR ALL
    USING (created_by = auth.uid());

CREATE POLICY "Hospital admins can view prescriptions in their hospital"
    ON prescriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = prescriptions.visit_id
              AND v.hospital_id = get_user_hospital_id()
        )
    );

-- 3.10 prescription_items
-- ============================================================
CREATE POLICY "Patients can view items for own prescriptions"
    ON prescription_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM prescriptions p
            JOIN visits v ON v.id = p.visit_id
            WHERE p.id = prescription_items.prescription_id
              AND v.patient_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can manage items for own prescriptions"
    ON prescription_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM prescriptions p
            WHERE p.id = prescription_items.prescription_id
              AND p.created_by = auth.uid()
        )
    );

CREATE POLICY "Hospital admins can view prescription items in their hospital"
    ON prescription_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM prescriptions p
            JOIN visits v ON v.id = p.visit_id
            WHERE p.id = prescription_items.prescription_id
              AND v.hospital_id = get_user_hospital_id()
        )
    );

-- 3.11 lab_tests
-- ============================================================
CREATE POLICY "Patients can view own lab tests"
    ON lab_tests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = lab_tests.visit_id
              AND v.patient_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can manage lab tests for assigned visits"
    ON lab_tests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = lab_tests.visit_id
              AND v.doctor_id = auth.uid()
        )
    );

CREATE POLICY "Hospital admins can view lab tests in their hospital"
    ON lab_tests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = lab_tests.visit_id
              AND v.hospital_id = get_user_hospital_id()
        )
    );

-- 3.12 documents
-- ============================================================
CREATE POLICY "Patients can view own documents"
    ON documents FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "Patients can upload own documents"
    ON documents FOR INSERT
    WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors can view documents for assigned patients"
    ON documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = documents.patient_id
              AND v.doctor_id = auth.uid()
        )
    );

CREATE POLICY "Hospital admins can view documents in their hospital"
    ON documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = documents.patient_id
              AND v.hospital_id = get_user_hospital_id()
        )
    );

-- 3.13 queues
-- ============================================================
CREATE POLICY "Patients can view own queue entries"
    ON queues FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = queues.visit_id
              AND v.patient_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can manage queues for their departments"
    ON queues FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.id = auth.uid()
              AND d.hospital_id IN (
                  SELECT hospital_id FROM departments
                  WHERE id = queues.department_id
              )
        )
    );

CREATE POLICY "Hospital admins can manage queues in their hospital"
    ON queues FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM departments dep
            WHERE dep.id = queues.department_id
              AND dep.hospital_id = get_user_hospital_id()
        )
    );

-- 3.14 audit_logs (admin-only)
-- ============================================================
CREATE POLICY "Hospital admins can view audit logs in their hospital"
    ON audit_logs FOR SELECT
    USING (get_user_role() = 'hospital_admin');

CREATE POLICY "Service role can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================================

-- 4.1 updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_visits_updated_at
    BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.2 Token number generator (DEPT-001 format, auto-increment per dept per day)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_token_number(
    p_department_id UUID,
    p_visit_date    DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT AS $$
DECLARE
    dept_code   TEXT;
    next_number INTEGER;
    token       TEXT;
BEGIN
    -- Extract a short code from department name (first 3 uppercase chars)
    SELECT UPPER(
        LEFT(
            REGEXP_REPLACE(d.name, '[^A-Za-z]', '', 'g'),
            3
        )
    )
    INTO dept_code
    FROM departments d
    WHERE d.id = p_department_id;

    -- Fallback if department not found
    IF dept_code IS NULL THEN
        dept_code := 'GEN';
    END IF;

    -- Count existing tokens for this department on this date
    SELECT COALESCE(MAX(
        CAST(
            REGEXP_REPLACE(token_number, '^' || dept_code || '-', '', '')
            AS INTEGER
        )
    ), 0) + 1
    INTO next_number
    FROM visits
    WHERE department_id = p_department_id
      AND visit_date = p_visit_date
      AND token_number IS NOT NULL
      AND token_number LIKE dept_code || '-%';

    token := dept_code || '-' || LPAD(next_number::TEXT, 3, '0');
    RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Auto-assign token number on visit insert
-- ============================================================
CREATE OR REPLACE FUNCTION assign_token_on_visit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.token_number IS NULL OR NEW.token_number = '' THEN
        NEW.token_number := generate_token_number(NEW.department_id, NEW.visit_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_visit_token_number
    BEFORE INSERT ON visits
    FOR EACH ROW EXECUTE FUNCTION assign_token_on_visit();

-- 4.4 Audit log trigger (for INSERT, UPDATE, DELETE on key tables)
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit_change()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB := NULL;
    new_data JSONB := NULL;
    rec_id   UUID;
    act      TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        act := 'INSERT';
        new_data := to_jsonb(NEW);
        rec_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        act := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        rec_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        act := 'DELETE';
        old_data := to_jsonb(OLD);
        rec_id := OLD.id;
    END IF;

    INSERT INTO audit_logs (table_name, record_id, action, performed_by, old_values, new_values)
    VALUES (TG_TABLE_NAME, rec_id, act, auth.uid(), old_data, new_data);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_visits
    AFTER INSERT OR UPDATE OR DELETE ON visits
    FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER trg_audit_prescriptions
    AFTER INSERT OR UPDATE OR DELETE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER trg_audit_lab_tests
    AFTER INSERT OR UPDATE OR DELETE ON lab_tests
    FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- ============================================================
-- 5. SEED DATA
-- ============================================================

-- 5.1 Hospital
-- ============================================================
INSERT INTO hospitals (id, name, address, phone, email, registration_number, is_verified)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'City General Hospital',
    '42 MG Road, Sector 5, New Delhi, India',
    '+91-11-23456789',
    'admin@citygeneralhospital.in',
    'REG-MOHI-2024-0001',
    true
);

-- 5.2 Profiles (1 admin, 5 doctors, 3 patients)
-- ============================================================
INSERT INTO profiles (id, full_name, phone, email, role) VALUES
    ('00000000-0000-0000-0000-000000000010', 'Dr. Rajesh Kumar (Admin)',  '+91-9876543210', 'rajesh.admin@citygeneralhospital.in', 'hospital_admin'),
    ('00000000-0000-0000-0000-000000000011', 'Dr. Priya Sharma',          '+91-9876543211', 'priya.sharma@citygeneralhospital.in', 'doctor'),
    ('00000000-0000-0000-0000-000000000012', 'Dr. Amit Verma',            '+91-9876543212', 'amit.verma@citygeneralhospital.in',   'doctor'),
    ('00000000-0000-0000-0000-000000000013', 'Dr. Sneha Patel',           '+91-9876543213', 'sneha.patel@citygeneralhospital.in',  'doctor'),
    ('00000000-0000-0000-0000-000000000014', 'Dr. Vikram Singh',          '+91-9876543214', 'vikram.singh@citygeneralhospital.in', 'doctor'),
    ('00000000-0000-0000-0000-000000000015', 'Dr. Ananya Reddy',          '+91-9876543215', 'ananya.reddy@citygeneralhospital.in', 'doctor'),
    ('00000000-0000-0000-0000-000000000020', 'Aarav Mehta',               '+91-9123456701', 'aarav.mehta@gmail.com',               'patient'),
    ('00000000-0000-0000-0000-000000000021', 'Ishita Gupta',              '+91-9123456702', 'ishita.gupta@gmail.com',              'patient'),
    ('00000000-0000-0000-0000-000000000022', 'Rohan Das',                 '+91-9123456703', 'rohan.das@outlook.com',               'patient');

-- 5.3 Departments
-- ============================================================
INSERT INTO departments (id, hospital_id, name, description, icon, color_code) VALUES
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'General Medicine',  'Primary care and internal medicine',                     'stethoscope', '#2563EB'),
    ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'Cardiology',        'Heart and cardiovascular system specialist',              'heart',       '#DC2626'),
    ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'Orthopedics',       'Bone, joint, and musculoskeletal system',                 'bone',        '#059669'),
    ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000001', 'Dermatology',       'Skin, hair, and nail conditions',                         'skin',        '#7C3AED'),
    ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000001', 'Pediatrics',        'Medical care for infants, children, and adolescents',     'child',       '#EA580C');

-- 5.4 Doctors
-- ============================================================
INSERT INTO doctors (id, hospital_id, full_name, qualification, specialization, license_number, experience_years, consultation_fee, rating) VALUES
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Dr. Priya Sharma',  'MBBS, MD (Internal Medicine)',  'General Medicine',  'MCI-2015-1001', 12, 800.00, 4.8),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Dr. Amit Verma',    'MBBS, DM (Cardiology)',         'Cardiology',        'MCI-2016-2002', 9,  1200.00, 4.6),
    ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Dr. Sneha Patel',   'MBBS, MS (Orthopedics)',        'Orthopedics',       'MCI-2014-3003', 15, 1000.00, 4.9),
    ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Dr. Vikram Singh',  'MBBS, MD (Dermatology)',        'Dermatology',       'MCI-2017-4004', 7,  700.00, 4.5),
    ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Dr. Ananya Reddy',  'MBBS, MD (Pediatrics)',         'Pediatrics',        'MCI-2018-5005', 6,  900.00, 4.7);

-- 5.5 Patients
-- ============================================================
INSERT INTO patients (id, date_of_birth, gender, blood_group, address, emergency_contact_name, emergency_contact_phone, abha_id) VALUES
    ('00000000-0000-0000-0000-000000000020', '1990-03-15', 'male',   'B+',  '12 Park Lane, Sector 2, New Delhi',    'Sunita Mehta',   '+91-9123456700', 'ABHA-2024-1001'),
    ('00000000-0000-0000-0000-000000000021', '1985-07-22', 'female', 'O+',  '45 Lake View, Sector 8, New Delhi',    'Manoj Gupta',    '+91-9123456704', 'ABHA-2024-1002'),
    ('00000000-0000-0000-0000-000000000022', '2001-11-08', 'male',   'A-',  '78 Hill Road, Sector 12, New Delhi',   'Priyanka Das',   '+91-9123456705', 'ABHA-2024-1003');

-- 5.6 OPD Slots (for each doctor)
-- ============================================================
INSERT INTO opd_slots (id, doctor_id, department_id, slot_date, start_time, end_time, max_patients, booked_count, is_available) VALUES
    ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000030', CURRENT_DATE, '09:00', '13:00', 20, 3, true),
    ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000031', CURRENT_DATE, '10:00', '14:00', 15, 1, true),
    ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000032', CURRENT_DATE, '09:00', '12:00', 15, 1, true),
    ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000033', CURRENT_DATE, '11:00', '15:00', 18, 0, true),
    ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000034', CURRENT_DATE, '10:00', '13:00', 20, 0, true);

-- 5.7 Visits (5 visits: 2 completed, 1 in_queue, 1 with_doctor, 1 booked)
-- ============================================================
INSERT INTO visits (
    id, patient_id, hospital_id, department_id, doctor_id, slot_id,
    visit_date, token_number, status, priority,
    chief_complaint, symptoms_description, severity,
    associated_symptoms, current_medications, known_allergies,
    vitals_bp, vitals_pulse, vitals_temperature, vitals_spo2, vitals_weight,
    triaged_by, triage_notes, triaged_at,
    diagnosis, examination_findings, advice, follow_up_date
) VALUES
    -- Visit 1: completed (General Medicine)
    (
        '00000000-0000-0000-0000-000000000050',
        '00000000-0000-0000-0000-000000000020',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000030',
        '00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000040',
        CURRENT_DATE, 'GEN-001', 'completed', 'normal',
        'Persistent headache for 3 days', 'Throbbing pain in the frontal region, worsens in the evening, mild nausea',
        5,
        ARRAY['nausea', 'light sensitivity'],
        'None',
        'None',
        '128/82', 78, 98.4, 98.0, 72.5,
        '00000000-0000-0000-0000-000000000011',
        'Vitals stable. No fever. Mild tenderness on palpation of frontal sinus.',
        CURRENT_DATE - INTERVAL '2 hours',
        'Tension-type headache',
        'Tenderness over frontal sinuses, neck muscles mildly tense, no neurological deficits',
        'Tab. Paracetamol 500mg TID x 5 days, drink plenty of water, rest. If symptoms persist, follow up in 1 week.',
        CURRENT_DATE + INTERVAL '7 days'
    ),
    -- Visit 2: completed (Cardiology)
    (
        '00000000-0000-0000-0000-000000000051',
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000031',
        '00000000-0000-0000-0000-000000000012',
        '00000000-0000-0000-0000-000000000041',
        CURRENT_DATE, 'CAR-001', 'completed', 'urgent',
        'Chest pain and shortness of breath', 'Intermittent chest tightness since morning, breathlessness on exertion, palpitations',
        8,
        ARRAY['palpitations', 'dizziness', 'sweating'],
        'Amlodipine 5mg daily',
        'Penicillin',
        '142/96', 92, 99.1, 96.0, 68.0,
        '00000000-0000-0000-0000-000000000012',
        'BP elevated. ECG shows ST segment changes. Urgent cardiology review required.',
        CURRENT_DATE - INTERVAL '3 hours',
        'Stable Angina Pectoris',
        'Mild S3 gallop, no murmurs, chest clear bilaterally, ECG: ST depression in leads V4-V6',
        'Tab. Aspirin 75mg daily, continue Amlodipine, Tab. Metoprolol 25mg BID. Stress Echo recommended. Follow up in 2 weeks.',
        CURRENT_DATE + INTERVAL '14 days'
    ),
    -- Visit 3: in_queue (Orthopedics)
    (
        '00000000-0000-0000-0000-000000000052',
        '00000000-0000-0000-0000-000000000022',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000032',
        '00000000-0000-0000-0000-000000000013',
        '00000000-0000-0000-0000-000000000042',
        CURRENT_DATE, 'ORT-001', 'in_queue', 'normal',
        'Lower back pain for 1 week', 'Dull aching pain in lower back, worse after sitting for long periods, radiates to left leg occasionally',
        6,
        ARRAY['leg numbness', 'stiffness'],
        'None',
        'None',
        '118/76', 72, 98.6, 99.0, 85.0,
        '00000000-0000-0000-0000-000000000013',
        'Reduced range of motion on forward flexion. Straight leg raise positive on left side.',
        CURRENT_DATE - INTERVAL '1 hour',
        NULL, NULL, NULL, NULL
    ),
    -- Visit 4: with_doctor (Dermatology)
    (
        '00000000-0000-0000-0000-000000000053',
        '00000000-0000-0000-0000-000000000020',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000033',
        '00000000-0000-0000-0000-000000000014',
        '00000000-0000-0000-0000-000000000043',
        CURRENT_DATE, 'DER-001', 'with_doctor', 'normal',
        'Recurring skin rash on forearms', 'Red, itchy patches on both forearms for 2 weeks, occasional flaking',
        4,
        ARRAY['itching', 'dryness'],
        'Cetirizine 10mg as needed',
        'None',
        '122/78', 74, 98.2, 99.0, 70.0,
        '00000000-0000-0000-0000-000000000014',
        'Erythematous papular rash on bilateral forearms. No signs of infection.',
        CURRENT_DATE - INTERVAL '45 minutes',
        NULL, NULL, NULL, NULL
    ),
    -- Visit 5: booked (Pediatrics - future appointment)
    (
        '00000000-0000-0000-0000-000000000054',
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000034',
        '00000000-0000-0000-0000-000000000015',
        '00000000-0000-0000-0000-000000000044',
        CURRENT_DATE, 'PED-001', 'booked', 'normal',
        'Annual wellness checkup', 'Routine wellness visit, no acute symptoms',
        2,
        ARRAY[],
        'None',
        'None',
        NULL, NULL, NULL, NULL, NULL,
        NULL, NULL, NULL,
        NULL, NULL, NULL, NULL
    );

-- 5.8 Prescriptions (for the 2 completed visits + 1 in-progress)
-- ============================================================
INSERT INTO prescriptions (id, visit_id, diagnosis, notes, follow_up_date, created_by) VALUES
    (
        '00000000-0000-0000-0000-000000000060',
        '00000000-0000-0000-0000-000000000050',
        'Tension-type headache',
        'Patient advised stress management techniques. No red-flag symptoms.',
        CURRENT_DATE + INTERVAL '7 days',
        '00000000-0000-0000-0000-000000000011'
    ),
    (
        '00000000-0000-0000-0000-000000000061',
        '00000000-0000-0000-0000-000000000051',
        'Stable Angina Pectoris',
        'Patient counseled on lifestyle modifications. Stress Echo pending.',
        CURRENT_DATE + INTERVAL '14 days',
        '00000000-0000-0000-0000-000000000012'
    ),
    (
        '00000000-0000-0000-0000-000000000062',
        '00000000-0000-0000-0000-000000000052',
        NULL,
        'Awaiting consultation. X-ray lumbar spine recommended.',
        NULL,
        '00000000-0000-0000-0000-000000000013'
    ),
    (
        '00000000-0000-0000-0000-000000000063',
        '00000000-0000-0000-0000-000000000053',
        NULL,
        'Under examination. Patch test may be required.',
        NULL,
        '00000000-0000-0000-0000-000000000014'
    ),
    (
        '00000000-0000-0000-0000-000000000064',
        '00000000-0000-0000-0000-000000000054',
        NULL,
        'Pre-visit: No current medications to review.',
        NULL,
        '00000000-0000-0000-0000-000000000015'
    );

-- 5.9 Prescription Items
-- ============================================================
INSERT INTO prescription_items (prescription_id, drug_name, dosage, frequency, duration, instructions) VALUES
    -- Rx for Visit 1 (Headache)
    ('00000000-0000-0000-0000-000000000060', 'Paracetamol',       '500 mg',  'Three times a day',  '5 days',  'Take after meals. Do not exceed 3g/day.'),
    ('00000000-0000-0000-0000-000000000060', 'Ibuprofen',         '400 mg',  'Twice a day',        '3 days',  'Take with food only. Use if headache is severe.'),
    ('00000000-0000-0000-0000-000000000060', 'Domperidone',       '10 mg',   'Three times a day',  '3 days',  'Take 30 minutes before meals for nausea.'),

    -- Rx for Visit 2 (Angina)
    ('00000000-0000-0000-0000-000000000061', 'Aspirin',           '75 mg',   'Once daily (morning)','Ongoing', 'Take on empty stomach. Do not stop without consulting.'),
    ('00000000-0000-0000-0000-000000000061', 'Metoprolol',        '25 mg',   'Twice a day',        '14 days', 'Take morning and evening. Monitor heart rate.'),
    ('00000000-0000-0000-0000-000000000061', 'Amlodipine',        '5 mg',    'Once daily (night)', 'Continue','Already prescribed. Continue same dose.'),
    ('00000000-0000-0000-0000-000000000061', 'Atorvastatin',      '20 mg',   'Once daily (night)', '30 days', 'Take at bedtime. Avoid grapefruit juice.'),

    -- Rx for Visit 3 (Back pain - pre-consultation)
    ('00000000-0000-0000-0000-000000000062', 'Diclofenac',        '50 mg',   'Twice a day',        '7 days',  'Take with food. Use for pain relief pending consultation.');

-- 5.10 Lab Tests
-- ============================================================
INSERT INTO lab_tests (id, visit_id, test_name, result_value, reference_range, unit, is_abnormal, status) VALUES
    ('00000000-0000-0000-0000-000000000070', '00000000-0000-0000-0000-000000000050', 'Complete Blood Count (CBC)', 'Normal', 'All within range', '-', false, 'completed'),
    ('00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000051', 'Lipid Profile',             'Total Cholesterol: 248, LDL: 162, HDL: 38, Triglycerides: 195', 'TC <200, LDL <100, HDL >40, TG <150', 'mg/dL', true, 'completed'),
    ('00000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000052', 'X-Ray Lumbar Spine (AP & Lateral)', NULL, NULL, NULL, false, 'pending');

-- 5.11 Documents
-- ============================================================
INSERT INTO documents (id, patient_id, visit_id, document_type, file_name, file_url, file_size, description) VALUES
    ('00000000-0000-0000-0000-000000000080', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000050', 'prescription',   'Rx_Aarav_Mehta_GEN001.pdf',       '/storage/prescriptions/rx_aarav_gen001.pdf',     245000,  'General Medicine prescription - Headache'),
    ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000051', 'lab_report',     'Lipid_Ishita_Gupta_CAR001.pdf',   '/storage/lab_reports/lipid_ishita_car001.pdf',   180000,  'Lipid Profile - Cardiology visit'),
    ('00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000051', 'prescription',   'Rx_Ishita_Gupta_CAR001.pdf',       '/storage/prescriptions/rx_ishita_car001.pdf',     310000,  'Cardiology prescription - Angina'),
    ('00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000020', NULL,                                 'insurance',      'Aarav_Mehta_Insurance.pdf',        '/storage/insurance/aarav_insurance.pdf',          520000,  'Health insurance card copy'),
    ('00000000-0000-0000-0000-000000000084', '00000000-0000-0000-0000-000000000022', NULL,                                 'imaging',        'Rohan_Das_Xray_Back.pdf',          '/storage/imaging/xray_rohan_back.pdf',            890000,  'Lumbar spine X-ray (previous visit)');

-- 5.12 Queue Entries
-- ============================================================
INSERT INTO queues (visit_id, department_id, token_number, queue_position, status, queued_at, called_at, priority) VALUES
    ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000030', 'GEN-001', 1, 'completed',     CURRENT_DATE - INTERVAL '3 hours',   CURRENT_DATE - INTERVAL '2 hours',  0),
    ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000031', 'CAR-001', 1, 'completed',     CURRENT_DATE - INTERVAL '3 hours',   CURRENT_DATE - INTERVAL '2.5 hours', 5),
    ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000032', 'ORT-001', 1, 'waiting',       CURRENT_DATE - INTERVAL '1 hour',    NULL,                                 0),
    ('00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000033', 'DER-001', 1, 'in_consultation', CURRENT_DATE - INTERVAL '45 minutes', CURRENT_DATE - INTERVAL '30 minutes', 0),
    ('00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000034', 'PED-001', 1, 'waiting',       CURRENT_DATE - INTERVAL '10 minutes', NULL,                                 0);

-- ============================================================
-- 6. GRANT USAGE (Supabase service_role)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON profiles, patients, visits, documents, queues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON opd_slots, prescriptions, prescription_items, lab_tests TO authenticated;

-- ============================================================
-- End of Schema
-- ============================================================
