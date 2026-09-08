-- ============================================================================
-- MediKiosk — Seed data for hospitals / departments / doctors / OPD slots
-- ============================================================================
-- Run AFTER supabase/schema.sql (in the Supabase SQL editor or via psql).
-- Idempotent-ish: skips hospitals that already exist by name.
-- ============================================================================

BEGIN;

-- ---- Hospitals ------------------------------------------------------------
-- Spec §8.3: Bengaluru partner demo hospitals (matches backend kiosk_data).
INSERT INTO public.hospitals (name, address, phone, email, is_partner, departments)
SELECT * FROM (VALUES
    ('City Heart Hospital', '100 Feet Rd, Koramangala, Bengaluru 560034', '+91 80 2550 1001', 'admin@cityheart.in', true,
     ARRAY['Cardiology','General Medicine']::text[]),
    ('NeuroCare Neurology', '100 Ft Road, Halasuru, Indiranagar, Bengaluru 560008', '+91 80 2550 1002', 'care@neurocare.in', true,
     ARRAY['Neurology','General Medicine']::text[]),
    ('Bone & Joint Institute', 'Jayanagar 4th Block, Bengaluru 560011', '+91 80 2550 1003', 'info@bonejoint.in', true,
     ARRAY['Orthopedics','General Medicine']::text[]),
    ('DigestiveCare Clinic', 'Whitefield Main Rd, Bengaluru 560066', '+91 80 2550 1004', 'contact@digestivecare.in', true,
     ARRAY['Gastroenterology','General Medicine']::text[]),
    ('Sunrise Children''s Hospital', 'Sampige Rd, Malleshwaram, Bengaluru 560003', '+91 80 2550 1005', 'hello@sunrisechildren.in', true,
     ARRAY['Pediatrics','General Medicine']::text[])
) AS v(name, address, phone, email, is_partner, departments)
WHERE NOT EXISTS (
    SELECT 1 FROM public.hospitals h WHERE h.name = v.name
);

-- ---- Departments (one row per hospital department) -------------------------
INSERT INTO public.departments (hospital_id, name, code)
SELECT h.id, d.dept, lower(regexp_replace(d.dept, '[^a-z0-9]+', '_', 'gi'))
FROM public.hospitals h
CROSS JOIN LATERAL unnest(h.departments) AS d(dept)
WHERE NOT EXISTS (
    SELECT 1 FROM public.departments x
    WHERE x.hospital_id = h.id AND x.name = d.dept
);

-- ---- Doctors (one seeded doctor per department, deterministic names) ---------
INSERT INTO public.doctors (hospital_id, department_id, name, specialization, phone)
SELECT
    h.id,
    d.id,
    'Dr. ' || CASE d.name
        WHEN 'Cardiology'       THEN 'Amit Sharma'
        WHEN 'Orthopedics'      THEN 'Priya Patel'
        WHEN 'General Medicine' THEN 'Rajesh Kumar'
        WHEN 'Pediatrics'       THEN 'Sneha Gupta'
        WHEN 'Dermatology'      THEN 'Vikram Rao'
        WHEN 'Neurology'        THEN 'Anita Desai'
        WHEN 'Gastroenterology' THEN 'Kiran Nair'
        ELSE 'Clinic Doctor'
    END,
    d.name,
    '+9198765432' || ((row_number() OVER (ORDER BY h.id, d.id) % 10)::int)
FROM public.hospitals h
JOIN public.departments d ON d.hospital_id = h.id
WHERE NOT EXISTS (
    SELECT 1 FROM public.doctors x
    WHERE x.hospital_id = h.id AND x.specialization = d.name
);

-- ---- OPD slots (3 days x 6 time blocks per doctor) -------------------------
INSERT INTO public.opd_slots (hospital_id, department_id, doctor_id, slot_date, start_time, end_time, max_patients)
SELECT
    d.hospital_id,
    d.id,
    doc.id,
    CURRENT_DATE + i,
    t.start_t,
    t.end_t,
    10
FROM public.departments d
JOIN public.doctors doc ON doc.department_id = d.id
CROSS JOIN generate_series(0, 2) AS i
CROSS JOIN (VALUES
    ('09:00:00'::time, '10:00:00'::time),
    ('10:00:00'::time, '11:00:00'::time),
    ('11:00:00'::time, '12:00:00'::time),
    ('14:00:00'::time, '15:00:00'::time),
    ('15:00:00'::time, '16:00:00'::time),
    ('16:00:00'::time, '17:00:00'::time)
) AS t(start_t, end_t)
WHERE NOT EXISTS (
    SELECT 1 FROM public.opd_slots x
    WHERE x.doctor_id = doc.id AND x.slot_date = CURRENT_DATE + i AND x.start_time = t.start_t
);

COMMIT;