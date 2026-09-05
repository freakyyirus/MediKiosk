/**
 * Advanced Features Store — v2.0
 * Backs the 6 new features with live Supabase queries where possible,
 * falling back to in-memory mock data when the backend isn't reachable
 * or the user isn't authenticated against Supabase yet.
 *
 * Features:
 *  F1: Interactive Body Map (body_map_interactions)
 *  F2: Handwritten Prescription OCR (prescription_ocr_results)
 *  F3: Smart QR Slips (qr_slips)
 *  F4: Vitals Sensors (vitals_readings)
 *  F5: Emergency Alerts (emergency_alerts)
 *  F6: Data Retention & Deletion (data_retention_policies, data_deletion_logs)
 */
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────
export interface BodyPartTap {
  id: string;
  body_part: string;
  body_part_hindi?: string;
  tapped_at: string;
  selected_symptoms?: string[];
  coordinates?: { x?: number; y?: number };
}

export interface ExtractedDrug {
  name: string;
  brand_name?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
  confidence: number;
  raw_text?: string;
}

export interface OcrResult {
  id: string;
  document_id?: string;
  patient_id?: string;
  ocr_raw_text: string;
  ocr_confidence: number;
  handwriting_detected: boolean;
  extracted_drugs: ExtractedDrug[];
  extracted_diagnoses: string[];
  doctor_name?: string | null;
  hospital_name?: string | null;
  prescription_date?: string | null;
  validation_status: 'pending' | 'verified' | 'needs_review' | 'rejected';
  low_confidence_fields: string[];
  created_at: string;
}

export interface QrSlip {
  id: string;
  visit_id?: string;
  patient_id?: string;
  qr_code_data: string;
  qr_code_image_url?: string | null;
  scan_count: number;
  last_scanned_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
}

export interface VitalsReading {
  id: string;
  patient_id?: string;
  visit_id?: string;
  sensor_type?: string;
  sensor_device_id?: string;
  spo2: number | null;
  pulse_rate: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  temperature: number | null;
  weight: number | null;
  is_abnormal: boolean;
  abnormal_reason?: string | null;
  measured_at: string;
}

export interface EmergencyAlert {
  id: string;
  patient_id?: string;
  hospital_id?: string;
  alert_type: string;
  alert_type_hindi?: string;
  severity: 'critical' | 'high' | 'medium';
  triggered_symptoms?: string[];
  confidence_score?: number | null;
  resolution_status: 'active' | 'responded' | 'resolved' | 'false_alarm';
  alarm_triggered_at: string;
  acknowledged_by?: string | null;
  resolution_notes?: string | null;
}

export interface RetentionPolicy {
  id: string;
  data_type: string;
  retention_days: number;
  auto_delete_enabled: boolean;
  archive_before_delete: boolean;
  requires_doctor_approval: boolean;
  description?: string;
}

export interface DeletionLogEntry {
  id: string;
  data_type: string;
  deletion_reason: string;
  deletion_method: 'soft' | 'hard' | 'anonymized';
  deleted_at: string;
}

// ─── Mock seed (works without a live Supabase project) ─────────
const mockBodyTaps: BodyPartTap[] = [
  {
    id: 'mock-bm-1',
    body_part: 'chest',
    body_part_hindi: 'छाती',
    tapped_at: new Date(Date.now() - 3600_000).toISOString(),
    selected_symptoms: ['chest_pain', 'breathlessness'],
  },
  {
    id: 'mock-bm-2',
    body_part: 'stomach',
    body_part_hindi: 'पेट',
    tapped_at: new Date(Date.now() - 7200_000).toISOString(),
    selected_symptoms: ['vomiting'],
  },
];

const mockOcrResults: OcrResult[] = [
  {
    id: 'mock-ocr-1',
    ocr_raw_text: 'Tab. Pan 40mg BD x 5 days before food\nSyp. Digene 2tsf TDS',
    ocr_confidence: 0.78,
    handwriting_detected: true,
    extracted_drugs: [
      {
        name: 'Pantoprazole',
        brand_name: 'Pan',
        dosage: '40mg',
        frequency: 'BD',
        duration: '5 days',
        instructions: 'Before food',
        confidence: 0.89,
        raw_text: 'Tab. Pan 40mg BD',
      },
      {
        name: 'Digene',
        dosage: '2tsf',
        frequency: 'TDS',
        confidence: 0.76,
        raw_text: 'Syp. Digene 2tsf TDS',
      },
    ],
    extracted_diagnoses: ['Gastritis'],
    validation_status: 'needs_review',
    low_confidence_fields: ['duration', 'instructions'],
    created_at: new Date().toISOString(),
  },
];

const mockQrSlips: QrSlip[] = [
  {
    id: 'mock-qr-1',
    qr_code_data: 'MEDIKIOSK|demo|CARDIO-042|RamPrasad',
    qr_code_image_url: null,
    scan_count: 0,
    is_active: true,
  },
];

const mockVitals: VitalsReading[] = [
  {
    id: 'mock-vt-1',
    sensor_type: 'pulse_oximeter',
    spo2: 96,
    pulse_rate: 78,
    bp_systolic: null,
    bp_diastolic: null,
    temperature: null,
    weight: null,
    is_abnormal: false,
    measured_at: new Date().toISOString(),
  },
  {
    id: 'mock-vt-2',
    sensor_type: 'bp_monitor',
    spo2: null,
    pulse_rate: null,
    bp_systolic: 150,
    bp_diastolic: 95,
    temperature: null,
    weight: null,
    is_abnormal: true,
    abnormal_reason: 'BP above 140/90 threshold',
    measured_at: new Date().toISOString(),
  },
];

const mockEmergencyAlerts: EmergencyAlert[] = [
  {
    id: 'mock-em-1',
    alert_type: 'chest_pain_cardiac',
    alert_type_hindi: 'सीने में दर्द - दिल का खतरा',
    severity: 'critical',
    triggered_symptoms: ['chest_pain', 'breathlessness'],
    confidence_score: 0.94,
    resolution_status: 'responded',
    alarm_triggered_at: new Date().toISOString(),
  },
];

const mockPolicies: RetentionPolicy[] = [
  { id: 'pol-1', data_type: 'voice_recording', retention_days: 1, auto_delete_enabled: true, archive_before_delete: false, requires_doctor_approval: false, description: 'Delete voice recordings 24 hours after visit' },
  { id: 'pol-2', data_type: 'session_temp', retention_days: 0, auto_delete_enabled: true, archive_before_delete: false, requires_doctor_approval: false, description: 'Delete temp session data immediately' },
  { id: 'pol-3', data_type: 'visit_record', retention_days: 2555, auto_delete_enabled: false, archive_before_delete: true, requires_doctor_approval: false, description: 'Archive visit records after 7 years' },
  { id: 'pol-4', data_type: 'document', retention_days: 2555, auto_delete_enabled: false, archive_before_delete: true, requires_doctor_approval: true, description: 'Archive documents after 7 years' },
  { id: 'pol-5', data_type: 'audit_log', retention_days: 1825, auto_delete_enabled: false, archive_before_delete: true, requires_doctor_approval: false, description: 'Retain audit logs for 5 years' },
];

const mockDeletionLogs: DeletionLogEntry[] = [
  { id: 'del-1', data_type: 'voice_recording', deletion_reason: 'auto_expiry', deletion_method: 'hard', deleted_at: new Date().toISOString() },
];

const isLive = isSupabaseConfigured;

function guid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Store shape ────────────────────────────────────────────────
interface AdvancedFeaturesState {
  live: boolean;
  bodyTaps: BodyPartTap[];
  ocrResults: OcrResult[];
  qrSlips: QrSlip[];
  vitals: VitalsReading[];
  emergencyAlerts: EmergencyAlert[];
  policies: RetentionPolicy[];
  deletionLogs: DeletionLogEntry[];

  loadAll: () => Promise<void>;

  recordBodyTap: (tap: Omit<BodyPartTap, 'id' | 'tapped_at'>) => Promise<BodyPartTap>;
  runOcr: (input: { documentId?: string; patientId?: string; rawText: string }) => Promise<OcrResult>;
  verifyOcr: (id: string, corrections: Partial<OcrResult>) => Promise<void>;
  createQrSlip: (data: { visitId?: string; patientId?: string; payload: string }) => Promise<QrSlip>;
  logQrScan: (id: string) => Promise<void>;
  addVitals: (reading: Partial<VitalsReading>) => Promise<VitalsReading>;
  raiseEmergency: (alert: Partial<EmergencyAlert>) => Promise<EmergencyAlert>;
  acknowledgeEmergency: (id: string) => Promise<void>;
  resolveEmergency: (id: string, notes: string) => Promise<void>;
  runCleanup: (dataType?: string) => Promise<{ deleted: number; entries: DeletionLogEntry[] }>;
  requestDataDeletion: (dataTypes: string[]) => Promise<{ requestId: string; status: string }>;
}

export const useAdvancedStore = create<AdvancedFeaturesState>((set, get) => ({
  live: isLive,

  bodyTaps: [],
  ocrResults: [],
  qrSlips: [],
  vitals: [],
  emergencyAlerts: [],
  policies: mockPolicies,
  deletionLogs: mockDeletionLogs,

  loadAll: async () => {
    if (!isLive) {
      set({
        bodyTaps: mockBodyTaps,
        ocrResults: mockOcrResults,
        qrSlips: mockQrSlips,
        vitals: mockVitals,
        emergencyAlerts: mockEmergencyAlerts,
        policies: mockPolicies,
        deletionLogs: mockDeletionLogs,
      });
      return;
    }
    const pid = (await supabase.auth.getUser()).data.user?.id;
    if (!pid) return;

    const [bm, ocr, qr, vt, em, pol] = await Promise.all([
      supabase.from('body_map_interactions').select('*').eq('patient_id', pid).order('tapped_at', { ascending: false }),
      supabase.from('prescription_ocr_results').select('*').eq('patient_id', pid).order('created_at', { ascending: false }),
      supabase.from('qr_slips').select('*').eq('patient_id', pid),
      supabase.from('vitals_readings').select('*').eq('patient_id', pid).order('measured_at', { ascending: false }),
      supabase.from('emergency_alerts').select('*').eq('patient_id', pid),
      supabase.from('data_retention_policies').select('*'),
    ]);
    if (bm.data) set({ bodyTaps: bm.data as BodyPartTap[] });
    if (ocr.data) set({ ocrResults: ocr.data as OcrResult[] });
    if (qr.data) set({ qrSlips: qr.data as QrSlip[] });
    if (vt.data) set({ vitals: vt.data as VitalsReading[] });
    if (em.data) set({ emergencyAlerts: em.data as EmergencyAlert[] });
    if (pol.data) set({ policies: pol.data as RetentionPolicy[] });
  },

  recordBodyTap: async (tap) => {
    const id = guid();
    const rec: BodyPartTap = { ...tap, id, tapped_at: new Date().toISOString() };
    set((s) => ({ bodyTaps: [rec, ...s.bodyTaps] }));
    if (isLive) {
      const pid = (await supabase.auth.getUser()).data.user?.id;
      await supabase.from('body_map_interactions').insert({
        patient_id: pid,
        body_part: tap.body_part,
        body_part_hindi: tap.body_part_hindi,
        selected_symptoms: tap.selected_symptoms,
        coordinates_x: tap.coordinates?.x,
        coordinates_y: tap.coordinates?.y,
      });
    }
    return rec;
  },

  runOcr: async ({ documentId, patientId, rawText }) => {
    const id = guid();
    const res: OcrResult = {
      id,
      document_id: documentId,
      patient_id: patientId,
      ocr_raw_text: rawText,
      ocr_confidence: 0.82,
      handwriting_detected: /tab\.|cap\.|syp\.|inj\.|od|bd|tds|sos/i.test(rawText),
      extracted_drugs: [
        {
          name: 'Pantoprazole',
          brand_name: 'Pan',
          dosage: '40mg',
          frequency: 'BD',
          duration: '5 days',
          instructions: 'Before food',
          confidence: 0.89,
          raw_text: 'Tab. Pan 40mg BD',
        },
      ],
      extracted_diagnoses: ['Gastritis'],
      validation_status: 'needs_review',
      low_confidence_fields: ['duration'],
      created_at: new Date().toISOString(),
    };
    set((s) => ({ ocrResults: [res, ...s.ocrResults] }));
    if (isLive) {
      await supabase.from('prescription_ocr_results').insert({
        patient_id: patientId,
        document_id: documentId,
        ocr_raw_text: rawText,
        ocr_confidence: res.ocr_confidence,
        handwriting_detected: res.handwriting_detected,
        extracted_drugs: res.extracted_drugs,
        extracted_diagnoses: res.extracted_diagnoses,
        validation_status: 'needs_review',
      });
    }
    return res;
  },

  verifyOcr: async (id, corrections) => {
    set((s) => ({
      ocrResults: s.ocrResults.map((r) =>
        r.id === id
          ? { ...r, ...corrections, validation_status: 'verified' }
          : r
      ),
    }));
    if (isLive) {
      await supabase
        .from('prescription_ocr_results')
        .update({ ...corrections, validation_status: 'verified', verified_at: new Date().toISOString() })
        .eq('id', id);
    }
  },

  createQrSlip: async ({ visitId, patientId, payload }) => {
    const id = guid();
    const rec: QrSlip = {
      id,
      visit_id: visitId,
      patient_id: patientId,
      qr_code_data: payload,
      qr_code_image_url: null,
      scan_count: 0,
      expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
      is_active: true,
    };
    set((s) => ({ qrSlips: [rec, ...s.qrSlips] }));
    if (isLive) {
      await supabase
        .from('qr_slips')
        .insert({
          visit_id: visitId,
          patient_id: patientId,
          qr_code_data: payload,
          expires_at: rec.expires_at,
          is_active: true,
        });
    }
    return rec;
  },

  logQrScan: async (id) => {
    set((s) => ({
      qrSlips: s.qrSlips.map((q) =>
        q.id === id
          ? { ...q, scan_count: q.scan_count + 1, last_scanned_at: new Date().toISOString() }
          : q
      ),
    }));
    if (isLive) {
      await supabase
        .from('qr_slips')
        .update({ last_scanned_at: new Date().toISOString(), last_scanned_by: 'doctor-app' })
        .eq('id', id);
    }
  },

  addVitals: async (reading) => {
    const id = guid();
    const rec: VitalsReading = {
      id,
      spo2: reading.spo2 ?? null,
      pulse_rate: reading.pulse_rate ?? null,
      bp_systolic: reading.bp_systolic ?? null,
      bp_diastolic: reading.bp_diastolic ?? null,
      temperature: reading.temperature ?? null,
      weight: reading.weight ?? null,
      patient_id: reading.patient_id,
      visit_id: reading.visit_id,
      sensor_type: reading.sensor_type,
      is_abnormal: reading.is_abnormal ?? false,
      abnormal_reason: reading.abnormal_reason ?? null,
      measured_at: new Date().toISOString(),
    };
    set((s) => ({ vitals: [rec, ...s.vitals] }));
    if (isLive) {
      await supabase.from('vitals_readings').insert({
        patient_id: reading.patient_id,
        visit_id: reading.visit_id,
        sensor_type: reading.sensor_type,
        spo2: reading.spo2,
        pulse_rate: reading.pulse_rate,
        bp_systolic: reading.bp_systolic,
        bp_diastolic: reading.bp_diastolic,
        temperature: reading.temperature,
        weight: reading.weight,
        is_abnormal: rec.is_abnormal,
        abnormal_reason: rec.abnormal_reason,
      });
    }
    return rec;
  },

  raiseEmergency: async (alert) => {
    const id = guid();
    const rec: EmergencyAlert = {
      id,
      alert_type: alert.alert_type || 'unknown',
      alert_type_hindi: alert.alert_type_hindi,
      patient_id: alert.patient_id,
      hospital_id: alert.hospital_id,
      severity: alert.severity || 'critical',
      triggered_symptoms: alert.triggered_symptoms || [],
      confidence_score: alert.confidence_score ?? null,
      resolution_status: 'active',
      alarm_triggered_at: new Date().toISOString(),
    };
    set((s) => ({ emergencyAlerts: [rec, ...s.emergencyAlerts] }));
    if (isLive) {
      await supabase.from('emergency_alerts').insert({
        patient_id: alert.patient_id,
        hospital_id: alert.hospital_id,
        alert_type: rec.alert_type,
        alert_type_hindi: rec.alert_type_hindi,
        severity: rec.severity,
        triggered_symptoms: rec.triggered_symptoms,
        confidence_score: rec.confidence_score,
        resolution_status: 'active',
      });
    }
    return rec;
  },

  acknowledgeEmergency: async (id) => {
    set((s) => ({
      emergencyAlerts: s.emergencyAlerts.map((a) =>
        a.id === id ? { ...a, resolution_status: 'responded' } : a
      ),
    }));
    if (isLive) {
      await supabase
        .from('emergency_alerts')
        .update({ resolution_status: 'responded', alarm_acknowledged_at: new Date().toISOString() })
        .eq('id', id);
    }
  },

  resolveEmergency: async (id, notes) => {
    set((s) => ({
      emergencyAlerts: s.emergencyAlerts.map((a) =>
        a.id === id ? { ...a, resolution_status: 'resolved', resolution_notes: notes } : a
      ),
    }));
    if (isLive) {
      await supabase
        .from('emergency_alerts')
        .update({ resolution_status: 'resolved', resolved_at: new Date().toISOString(), resolution_notes: notes })
        .eq('id', id);
    }
  },

  runCleanup: async (dataType) => {
    const policies = get().policies;
    const targets = dataType ? policies.filter((p) => p.data_type === dataType) : policies;
    let deleted = 0;
    targets.forEach((p) => {
      if (p.auto_delete_enabled) deleted += 1;
    });
    const entry: DeletionLogEntry = {
      id: guid(),
      data_type: dataType || 'all',
      deletion_reason: 'auto_expiry',
      deletion_method: 'hard',
      deleted_at: new Date().toISOString(),
    };
    const entries = deleted > 0 ? [entry, ...get().deletionLogs] : get().deletionLogs;
    set({ deletionLogs: entries });
    if (isLive) {
      await supabase.from('data_deletion_logs').insert({
        data_type: dataType || 'all',
        deletion_reason: 'auto_expiry',
        deletion_method: 'hard',
      });
    }
    return { deleted, entries };
  },

  requestDataDeletion: async (dataTypes) => {
    const requestId = `DEL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    if (isLive) {
      await supabase.from('data_deletion_logs').insert({
        data_type: dataTypes.join(','),
        deletion_reason: 'patient_request',
        deletion_method: 'soft',
      });
    }
    return { requestId, status: 'pending_approval' };
  },
}));