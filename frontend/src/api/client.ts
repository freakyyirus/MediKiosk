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

// Request interceptor — attach the real identity token:
// 1. Consumer apps flow: the Supabase session access_token (validated
//    server-side by the backend via GoTrue).
// 2. Dev override: sessionStorage 'access_token' (used by offline/tests only).
api.interceptors.request.use(
  async (config) => {
    const legacyToken = sessionStorage.getItem('access_token');
    if (legacyToken) {
      config.headers.Authorization = `Bearer ${legacyToken}`;
      return config;
    }
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch {
      // Supabase unconfigured/offline — send unauthenticated (public kiosk).
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as { method?: string; _retried?: boolean } | undefined;

    // Idempotent GET requests are safe to retry once on network failure / 5xx.
    if (config && !config._retried && (config.method || '').toLowerCase() === 'get') {
      const status = error.response?.status as number | undefined;
      if (status === undefined || (status >= 500 && status <= 599)) {
        config._retried = true;
        return api(error.config);
      }
    }

    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        sessionStorage.removeItem('access_token');
        // Invalidate the auth store so route guards redirect to /login.
        try {
          const { useAuthStore } = await import('../stores/authStore');
          useAuthStore.setState({ user: null, profile: null, isAuthenticated: false });
        } catch {
          // Store unavailable; token is cleared, guard will flush on next check.
        }
      }
      console.error(`API Error [${status}]:`, data?.error?.message || 'Unknown error');
    } else if (error.request) {
      console.error('Network error: No response received');
    }
    return Promise.reject(error);
  }
);

// Friendly, consistent error message extraction for UI toast/alert surfaces.
export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Network error. Check your connection and try again.';
    const data = err.response.data as { error?: { message?: string }; message?: string } | undefined;
    return data?.error?.message || data?.message || `Request failed (${err.response.status})`;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

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
  bodyMapTap: (data: { body_part: string; selected_symptoms?: string[]; session_id?: number }) =>
    api.post<{
      recorded: boolean;
      tapped_at: string;
      body_part: string;
      suggested_department: string;
      risk_weight: number;
      follow_up_questions: string[];
      possible_specializations: string[];
    }>(
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

// ---- Gemini Talking-AI (F0: live conversation with the patient) ----
export interface AIChatTurn {
  speech: string;
  transcribed: string;
  interview_complete: boolean;
  topic: string;
  red_flags: string[];
  clinical: {
    chief_complaint?: string;
    hpi?: Record<string, unknown>;
    past_medical_history?: unknown[];
    current_medications?: unknown[];
    allergies?: unknown[];
    review_of_systems?: unknown;
  } | null;
  session_id: number | null;
  provider: 'gemini' | 'fallback';
}

export const aiApi = {
  chat: (data: {
    session_id?: number | null;
    patient_id?: number | null;
    language: string;
    patient_message?: string;
    touched_body_part?: string | null;
    vitals?: Record<string, number | null> | null;
    history?: { role: string; content: string }[];
  }) =>
    api.post<AIChatTurn>('/ai/chat', {
      session_id: data.session_id,
      patient_id: data.patient_id,
      language: data.language,
      patient_message: data.patient_message,
      touched_body_part: data.touched_body_part,
      vitals: data.vitals,
      history: data.history,
    }),
};
