/**
 * API Client — Axios instance with interceptors.
 */

import axios from 'axios';

// In production (Vercel) point /api at the Railway backend via VITE_API_URL.
// In dev, keep the relative path so the Vite proxy (localhost:8000) handles it.
const API_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        sessionStorage.removeItem('access_token');
      }
      console.error(`API Error [${status}]:`, data?.error?.message || 'Unknown error');
    } else if (error.request) {
      console.error('Network error: No response received');
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- API Service Functions ----

import type {
  Patient,
  Session,
  SessionMessage,
  VoiceInputResponse,
  PhysicianQueueItem,
  Summary,
} from '../types';

// Patients
export const patientApi = {
  create: (data: Partial<Patient>) => api.post<Patient>('/patients', data),
  get: (id: number) => api.get<Patient>(`/patients/${id}`),
  update: (id: number, data: Partial<Patient>) => api.patch<Patient>(`/patients/${id}`, data),
  search: (params: { abha_id?: string; phone?: string; name?: string }) =>
    api.get<Patient[]>('/patients', { params }),
};

// Sessions
export const sessionApi = {
  create: (data: { language: string; department: string; kiosk_id?: string; patient_id?: number }) =>
    api.post<Session>('/sessions', data),
  get: (id: number) => api.get<Session>(`/sessions/${id}`),
  update: (id: number, data: Partial<Session>) => api.patch<Session>(`/sessions/${id}`, data),
  delete: (id: number) => api.delete(`/sessions/${id}`),
  submitTouch: (id: number, data: { question_id: string; answer: Record<string, unknown> }) =>
    api.post<VoiceInputResponse>(`/sessions/${id}/touch`, data),
  getHistory: (id: number) => api.get<SessionMessage[]>(`/sessions/${id}/history`),
  addMessage: (id: number, data: { message_type: string; content: string; confidence?: number }) =>
    api.post<SessionMessage>(`/sessions/${id}/messages`, data),
};

// Documents
export const documentApi = {
  upload: (formData: FormData) =>
    api.post<{ document_id: number; processing_status: string; estimated_time: number }>(
      '/documents/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
  listBySession: (sessionId: number) =>
    api.get(`/documents/session/${sessionId}`),
};

// Summaries
export const summaryApi = {
  generate: (sessionId: number) =>
    api.post<{ summary_id: number; summary_text: string; confidence: number }>(
      `/summaries/generate/${sessionId}`
    ),
  getBySession: (sessionId: number) =>
    api.get<Summary>(`/summaries/session/${sessionId}`),
};

// Consent
export const consentApi = {
  submit: (data: { session_id: number; patient_id?: number; consents: { consent_type: string; granted: boolean }[] }) =>
    api.post('/consent/submit', data),
};

// Voice
export const voiceApi = {
  transcribe: (formData: FormData) =>
    api.post<{ transcript: string; confidence: number; red_flags: unknown[] }>(
      '/voice/transcribe',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
};

// Physician
export const physicianApi = {
  getDashboard: (status = 'pending') =>
    api.get<{ pending_count: number; queue: PhysicianQueueItem[] }>('/physician/dashboard', { params: { status } }),
  getSession: (id: number) => api.get<Session>(`/physician/sessions/${id}`),
  confirmSession: (id: number, data: { status: string; physician_edits?: Record<string, unknown>; physician_id: number }) =>
    api.post(`/physician/sessions/${id}/confirm`, data),
};

// Admin
export const adminApi = {
  getDashboard: () => api.get('/physician/dashboard'),
};

// ---- Advanced Features (v2.0) ----
export const advancedApi = {
  // F2: Handwritten prescription OCR via real ML pipeline
  ocrProcess: (formData: FormData) =>
    api.post<{
      ocr_raw_text: string;
      ocr_confidence: number;
      handwriting_detected: boolean;
      extracted_drugs: {
        name: string;
        brand_name?: string | null;
        dosage?: string | null;
        frequency?: string | null;
        duration?: string | null;
        instructions?: string | null;
        confidence: number;
        raw_text?: string;
      }[];
      extracted_diagnoses: string[];
      doctor_name?: string | null;
      hospital_name?: string | null;
      validation_status: string;
      low_confidence_fields: string[];
    }>('/advanced/ocr/process', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 }),

  // F2: Validate OCR extraction with Gemini
  ocrValidate: (data: { ocr_raw_text: string; extracted_drugs: unknown[]; extracted_diagnoses: string[] }) =>
    api.post<{ suggestions: unknown[]; confidence: number; validation_status: string }>('/advanced/ocr/validate', data),

  // ML: Priority queue prediction
  predictPriority: (data: {
    age: number;
    spo2?: number | null;
    pulse?: number | null;
    bp_systolic?: number | null;
    bp_diastolic?: number | null;
    temperature?: number | null;
    red_flag_count: number;
    critical_symptom_count: number;
    has_chest_pain?: boolean;
    has_breathlessness?: boolean;
    department_id?: string | null;
  }) =>
    api.post<{ priority_score: number; priority_class: 'critical' | 'high' | 'normal' | 'low'; confidence: number; top_factors: string[] }>(
      '/advanced/ml/predict-priority',
      data
    ),

  // F5: Emergency verification via Gemini
  verifyEmergency: (data: { alert_type: string; triggered_symptoms: string[]; vitals: unknown }) =>
    api.post<{ is_true_emergency: boolean; severity: string; confidence: number; reason: string }>(
      '/advanced/emergency/verify',
      data
    ),

  // F4: Vitals threshold analysis (clinical flags)
  vitalsAnalyze: (data: {
    spo2?: number | null;
    pulse?: number | null;
    bp_systolic?: number | null;
    bp_diastolic?: number | null;
    temperature?: number | null;
  }) =>
    api.post<{
      is_abnormal: boolean;
      severity: 'critical' | 'warning' | 'normal';
      flags: { label: string; value: string; reason: string; severity: string }[];
    }>('/advanced/vitals/analyze', data),

  // F1: Body-map tap → dept suggestion
  bodyMapTap: (data: { body_part: string; selected_symptoms?: string[] }) =>
    api.post<{ recorded: boolean; tapped_at: string; suggested_department: string; risk_weight: number }>(
      '/advanced/body-map/tap',
      data
    ),

  // F3: Generate QR slip payload (signed server-side)
  qrCreate: (data: {
    token_number: string;
    patient_name?: string;
    department?: string;
    chief_complaint?: string;
    priority?: number;
  }) =>
    api.post<{
      qr_code_data: string;
      qr_code_image_url: string | null;
      slip_id: string;
      expires_at: string;
      is_active: boolean;
    }>('/advanced/qr/create', data),

  // F6: Retention policy catalogue from the backend
  retentionPolicies: () =>
    api.get<{ policies: { data_type: string; retention_days: number; auto_delete_enabled: boolean; description?: string }[] }>(
      '/advanced/retention/policies'
    ),

  // F6: Run the DPDPA retention cleanup (real delete, audited)
  retentionRun: (opts: { dry_run?: boolean } = {}) =>
    api.post<{ dry_run: boolean; retention: { actions: unknown[]; rows_deleted: number; files_removed: number }; audited: boolean }>(
      '/advanced/retention/run',
      opts
    ),

  // F6: True hard-delete (DPDPA right-to-erasure, doctor-approved)
  erasePatient: (data: { patient_id: number; reason: string; performed_by?: string; approval?: boolean }) =>
    api.delete<{ status: string; patient_id: number; removed: Record<string, number>; audited: boolean }>(
      '/advanced/retention/erase-patient',
      { data: { ...data, approval: data.approval ?? true } }
    ),

  // F6: Patient-initiated erasure request (needs approval)
  requestErasure: (data: { patient_id: number; data_types?: string[]; requested_by?: string }) =>
    api.post<{ request_id: string; patient_id: number; status: string }>(
      '/advanced/retention/request-erasure',
      data
    ),

  // F6: List pending erasure requests
  retentionRequests: () =>
    api.get<{ requests: { patient_id: number; requested_by: string; data_types: string[]; requested_at: string; status: string }[] }>(
      '/advanced/retention/requests'
    ),

  // ML: training-store + retrain-on-real-data endpoints
  mlDataset: () =>
    api.get<{ real_samples: number; real_csv: string; model_traits: unknown; note: string }>(
      '/advanced/ml/dataset'
    ),
  mlAddSamples: (samples: Record<string, unknown>[]) =>
    api.post<{ accepted: number; rejected: number; total: number }>(
      '/advanced/ml/samples',
      { samples }
    ),
  mlTrain: (opts: { min_real?: number; backfill_synthetic?: number; holdout?: number } = {}) =>
    api.post<{
      trained_on: { real: number; synthetic: number };
      holdout_metrics: { accuracy: number; confusion_matrix: number[][]; per_class: Record<string, Record<string, number>> };
      artifact: string;
    }>('/advanced/ml/train', opts),
};
