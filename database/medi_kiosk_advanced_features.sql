-- ============================================================
-- MediKiosk Advanced Features v2.0 - Supabase SQL Migration
-- ============================================================
-- Run this AFTER database/mediflow_schema.sql in the Supabase SQL
-- Editor. Adds 6 feature tables + indexes + RLS policies + defaults
-- for the Advanced Features module.
--
-- Features:
--   F1: Interactive Body Map tracking
--   F2: Handwritten Prescription OCR results
--   F3: Smart QR Slips (legacy bridge)
--   F4: Kiosk Vitals Sensor readings
--   F5: Emergency Alerts
--   F6: Data Retention & Deletion
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- F1. Body map interactions
-- ============================================================
CREATE TABLE IF NOT EXISTS body_map_interactions (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id         UUID,                     -- references legacy session (nullable)
    patient_id         UUID REFERENCES patients(id) ON DELETE CASCADE,
    body_part          TEXT NOT NULL,            -- head, chest, stomach, knee, etc.
    body_part_hindi    TEXT,                     -- सिर, छाती, पेट, घुटना
    tapped_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    follow_up_questions JSONB,                   -- questions generated for this part
    selected_symptoms  TEXT[],                   -- symptoms patient selected
    coordinates_x      NUMERIC(5,2),
    coordinates_y      NUMERIC(5,2)
);
CREATE INDEX IF NOT EXISTS idx_bodymap_session ON body_map_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_bodymap_patient ON body_map_interactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_bodymap_body_part ON body_map_interactions(body_part);

-- F2. Prescription OCR results
-- ============================================================
CREATE TABLE IF NOT EXISTS prescription_ocr_results (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id           UUID REFERENCES documents(id) ON DELETE CASCADE,
    patient_id            UUID REFERENCES patients(id) ON DELETE CASCADE,
    visit_id              UUID REFERENCES visits(id) ON DELETE CASCADE,
    -- Raw OCR
    ocr_raw_text          TEXT,
    ocr_confidence        NUMERIC(4,3),
    handwriting_detected  BOOLEAN DEFAULT false,
    -- Extracted structured data
    extracted_drugs       JSONB,                 -- [{name, dosage, frequency, duration, confidence, raw_text}]
    extracted_diagnoses   JSONB,
    doctor_name           TEXT,
    hospital_name         TEXT,
    prescription_date     DATE,
    -- Validation
    validation_status     TEXT DEFAULT 'pending'
                          CHECK (validation_status IN ('pending','verified','needs_review','rejected')),
    verified_by           UUID REFERENCES doctors(id) ON DELETE SET NULL,
    verified_at           TIMESTAMPTZ,
    low_confidence_fields TEXT[],
    -- Model metadata
    model_version         TEXT DEFAULT 'v1.0',
    processing_time_ms    INTEGER,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ocr_document ON prescription_ocr_results(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_patient ON prescription_ocr_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_ocr_status ON prescription_ocr_results(validation_status);

-- F3. QR slips
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_slips (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id              UUID REFERENCES visits(id) ON DELETE CASCADE,
    patient_id            UUID REFERENCES patients(id) ON DELETE CASCADE,
    qr_code_data          TEXT NOT NULL,         -- encrypted/signed payload
    qr_code_image_url     TEXT,
    -- Scan tracking
    scan_count            INTEGER DEFAULT 0,
    last_scanned_at       TIMESTAMPTZ,
    last_scanned_by       TEXT,
    -- Expiry (default: visit_date + 7 days)
    generated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at            TIMESTAMPTZ,
    is_active             BOOLEAN DEFAULT true,
    -- Legacy bridge
    legacy_hospital_name  TEXT,
    legacy_department     TEXT
);
CREATE INDEX IF NOT EXISTS idx_qr_visit ON qr_slips(visit_id);
CREATE INDEX IF NOT EXISTS idx_qr_active ON qr_slips(is_active) WHERE is_active = true;

-- F4. Vitals sensor readings
-- ============================================================
CREATE TABLE IF NOT EXISTS vitals_readings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id            UUID REFERENCES visits(id) ON DELETE CASCADE,
    patient_id          UUID REFERENCES patients(id) ON DELETE CASCADE,
    session_id          UUID,                     -- references legacy session (nullable)
    -- Sensor metadata
    sensor_device_id    TEXT,
    sensor_type         TEXT,                    -- pulse_oximeter, bp_monitor, thermometer, scale
    -- Readings
    spo2                INTEGER,
    pulse_rate          INTEGER,
    bp_systolic         INTEGER,
    bp_diastolic        INTEGER,
    temperature         NUMERIC(4,1),
    weight              NUMERIC(5,2),
    -- Quality
    reading_quality     TEXT DEFAULT 'good' CHECK (reading_quality IN ('good','fair','poor','error')),
    error_message       TEXT,
    -- Abnormal flagging
    is_abnormal         BOOLEAN DEFAULT false,
    abnormal_reason     TEXT,
    -- Timestamps
    measured_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vitals_visit ON vitals_readings(visit_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vitals_readings(patient_id);

-- F5. Emergency alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id            UUID,                     -- references legacy session (nullable)
    visit_id              UUID REFERENCES visits(id) ON DELETE SET NULL,
    patient_id            UUID REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id           UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    -- Alert details
    alert_type            TEXT NOT NULL,         -- chest_pain_cardiac, stroke, anaphylaxis, etc.
    alert_type_hindi      TEXT,
    severity              TEXT DEFAULT 'critical' CHECK (severity IN ('critical','high','medium')),
    -- Triggered by
    triggered_symptoms    TEXT[],
    triggered_vitals      JSONB,
    transcript_snippet    TEXT,
    confidence_score      NUMERIC(4,3),
    -- Response tracking
    alarm_triggered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    alarm_acknowledged_at TIMESTAMPTZ,
    acknowledged_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
    response_time_seconds INTEGER,
    -- Notifications sent
    notifications_sent    JSONB,
    -- Resolution
    resolution_status     TEXT DEFAULT 'active'
                          CHECK (resolution_status IN ('active','responded','resolved','false_alarm')),
    resolved_at           TIMESTAMPTZ,
    resolution_notes      TEXT
);
CREATE INDEX IF NOT EXISTS idx_emergency_session ON emergency_alerts(session_id);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_alerts(resolution_status);
CREATE INDEX IF NOT EXISTS idx_emergency_severity ON emergency_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_emergency_patient ON emergency_alerts(patient_id);

-- F6. Data retention policies & deletion logs
-- ============================================================
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_type             TEXT NOT NULL UNIQUE,
    retention_days        INTEGER NOT NULL,
    auto_delete_enabled   BOOLEAN DEFAULT true,
    archive_before_delete BOOLEAN DEFAULT false,
    requires_doctor_approval BOOLEAN DEFAULT false,
    description           TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_deletion_logs (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_type          TEXT,
    record_id          UUID,
    deletion_reason    TEXT,                     -- auto_expiry, doctor_approved, patient_request, consent_revoked
    deleted_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    deleted_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    deletion_method    TEXT CHECK (deletion_method IN ('soft','hard','anonymized')),
    backup_location    TEXT
);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_type ON data_deletion_logs(data_type);

-- ============================================================
-- 2. RLS ENABLE + POLICIES
-- ============================================================
ALTER TABLE body_map_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_logs ENABLE ROW LEVEL SECURITY;

-- ---- F1 body_map_interactions ----
CREATE POLICY "Body map - patients can select own"
    ON body_map_interactions FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "Body map - patients can insert own"
    ON body_map_interactions FOR INSERT
    WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Body map - doctors can view assigned patients"
    ON body_map_interactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = body_map_interactions.patient_id
              AND v.doctor_id = auth.uid()
        )
    );

CREATE POLICY "Body map - admins view patients in hospital"
    ON body_map_interactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = body_map_interactions.patient_id
              AND v.hospital_id = get_user_hospital_id()
        )
    );

CREATE POLICY "Body map - service role manage"
    ON body_map_interactions FOR ALL
    USING (auth.role() = 'service_role');

-- ---- F2 prescription_ocr_results ----
CREATE POLICY "OCR - patients can view own"
    ON prescription_ocr_results FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "OCR - patients can insert own"
    ON prescription_ocr_results FOR INSERT
    WITH CHECK (patient_id = auth.uid());

CREATE POLICY "OCR - doctors can view assigned"
    ON prescription_ocr_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = prescription_ocr_results.patient_id
              AND v.doctor_id = auth.uid()
        )
    );

CREATE POLICY "OCR - doctors verify"
    ON prescription_ocr_results FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = prescription_ocr_results.patient_id
              AND v.doctor_id = auth.uid()
        )
    );

CREATE POLICY "OCR - service role manage"
    ON prescription_ocr_results FOR ALL
    USING (auth.role() = 'service_role');

-- ---- F3 qr_slips ----
CREATE POLICY "QR - patients can view own"
    ON qr_slips FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "QR - patients can create own"
    ON qr_slips FOR INSERT
    WITH CHECK (patient_id = auth.uid());

CREATE POLICY "QR - doctors can view assigned"
    ON qr_slips FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = qr_slips.patient_id
              AND v.doctor_id = auth.uid()
        )
    );

CREATE POLICY "QR - doctors can increment scan"
    ON qr_slips FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = qr_slips.patient_id
              AND v.doctor_id = auth.uid()
        )
    );

CREATE POLICY "QR - service role manage"
    ON qr_slips FOR ALL
    USING (auth.role() = 'service_role');

-- ---- F4 vitals_readings ----
CREATE POLICY "Vitals - patients can select own"
    ON vitals_readings FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "Vitals - service/kiosk insert"
    ON vitals_readings FOR INSERT
    WITH CHECK (
        patient_id = auth.uid()
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Vitals - doctors view assigned"
    ON vitals_readings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = vitals_readings.patient_id
              AND v.doctor_id = auth.uid()
        )
    );

CREATE POLICY "Vitals - admins view hospital"
    ON vitals_readings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.patient_id = vitals_readings.patient_id
              AND v.hospital_id = get_user_hospital_id()
        )
    );

CREATE POLICY "Vitals - service role manage"
    ON vitals_readings FOR ALL
    USING (auth.role() = 'service_role');

-- ---- F5 emergency_alerts ----
CREATE POLICY "Emergency - patients view own"
    ON emergency_alerts FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "Emergency - doctors view hospital"
    ON emergency_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.id = auth.uid()
              AND d.hospital_id = emergency_alerts.hospital_id
        )
    );

CREATE POLICY "Emergency - admins view hospital"
    ON emergency_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.id = auth.uid()
              AND d.hospital_id = emergency_alerts.hospital_id
        )
    );

CREATE POLICY "Emergency - doctors acknowledge"
    ON emergency_alerts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.id = auth.uid()
              AND d.hospital_id = emergency_alerts.hospital_id
        )
    );

CREATE POLICY "Emergency - service role manage"
    ON emergency_alerts FOR ALL
    USING (auth.role() = 'service_role');

-- ---- F6 data_retention_policies (admin read-only via service role) ----
CREATE POLICY "Retention - service role manage"
    ON data_retention_policies FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Retention - admins read"
    ON data_retention_policies FOR SELECT
    USING (true);

CREATE POLICY "Deletion logs - service role manage"
    ON data_deletion_logs FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Deletion logs - admins read"
    ON data_deletion_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.id = auth.uid()
        )
    );

-- ============================================================
-- 3. DEFAULT RETENTION POLICIES
-- ============================================================
INSERT INTO data_retention_policies
    (data_type, retention_days, auto_delete_enabled, archive_before_delete, requires_doctor_approval, description)
VALUES
    ('voice_recording', 1, true, false, false, 'Delete voice recordings 24 hours after visit'),
    ('session_temp', 0, true, false, false, 'Delete temporary session data immediately after submission'),
    ('visit_record', 2555, false, true, false, 'Archive visit records after 7 years'),
    ('document', 2555, false, true, true, 'Archive documents after 7 years, requires doctor approval'),
    ('audit_log', 1825, false, true, false, 'Retain audit logs for 5 years'),
    ('prescription_ocr_raw', 30, true, false, false, 'Delete raw OCR data after 30 days')
ON CONFLICT (data_type) DO NOTHING;
