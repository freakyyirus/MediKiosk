/**
 * TypeScript type definitions for MediKiosk.
 */

// ---- Patient ----
export interface Patient {
  id: number;
  abha_id: string | null;
  name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  language_preference: string;
  created_at: string;
  updated_at: string;
}

// ---- Session ----
export interface Session {
  id: number;
  patient_id: number | null;
  kiosk_id: string | null;
  department: Department;
  language: string;
  status: SessionStatus;
  chief_complaint: string | null;
  history_hpi: Record<string, unknown> | null;
  past_medical_history: Record<string, unknown> | null;
  past_surgical_history: Record<string, unknown> | null;
  drug_history: Record<string, unknown> | null;
  allergy_history: Record<string, unknown> | null;
  family_history: Record<string, unknown> | null;
  personal_history: Record<string, unknown> | null;
  review_of_systems: Record<string, unknown> | null;
  ayush_assessment: Record<string, unknown> | null;
  asr_confidence: number | null;
  confidence_score: number | null;
  red_flags: RedFlag[] | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'in_progress' | 'completed' | 'under_review' | 'reviewed' | 'cancelled';
export type Department = 'allopathy' | 'ayurveda' | 'unani' | 'siddha' | 'homeopathy';

// ---- Messages ----
export interface SessionMessage {
  id: number;
  session_id: number;
  message_type: 'ai_question' | 'patient_voice' | 'patient_touch' | 'system';
  content: string | null;
  audio_url: string | null;
  confidence: number | null;
  created_at: string;
}

// ---- Voice ----
export interface VoiceInputResponse {
  transcription: string;
  confidence: number;
  structured: Record<string, unknown> | null;
  next_question: string | null;
  red_flags: RedFlag[];
  follow_up_required: boolean;
}

// ---- Documents ----
export interface Document {
  id: number;
  session_id: number | null;
  patient_id: number | null;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  document_type: DocumentType | null;
  document_date: string | null;
  hospital_name: string | null;
  doctor_name: string | null;
  ocr_raw_text: string | null;
  ocr_confidence: number | null;
  extracted_diagnoses: Record<string, unknown> | null;
  extracted_medications: Record<string, unknown> | null;
  extracted_lab_results: Record<string, unknown> | null;
  extracted_procedures: Record<string, unknown> | null;
  extracted_vitals: Record<string, unknown> | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export type DocumentType = 'prescription' | 'lab_report' | 'discharge_summary' | 'imaging' | 'insurance' | 'other';

// ---- Summary ----
export interface Summary {
  id: number;
  session_id: number;
  patient_id: number | null;
  summary_text: string | null;
  summary_format: string;
  review_status: 'pending' | 'confirmed' | 'amended' | 'rejected';
  physician_edits: Record<string, unknown> | null;
  reviewed_at: string | null;
  fhir_bundle: Record<string, unknown> | null;
  pushed_to_abdm: boolean;
  pushed_to_his: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Red Flags ----
export interface RedFlag {
  type: string;
  severity: 'critical' | 'high' | 'medium';
  confidence: number;
  triggered_by: string[];
}

// ---- Physician Dashboard ----
export interface PhysicianQueueItem {
  session_id: number;
  patient_name: string | null;
  chief_complaint: string | null;
  summary_preview: string | null;
  red_flags: RedFlag[];
  wait_time_minutes: number;
  priority: 'normal' | 'high' | 'critical';
}

// ---- Language ----
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  icon: string;
}

// ---- Kiosk Interview ----
export interface InterviewQuestion {
  id: string;
  text: string;
  type: 'voice' | 'multiple_choice' | 'slider' | 'yes_no' | 'body_diagram';
  options?: string[];
  min?: number;
  max?: number;
  category: string;
  required: boolean;
}

// ---- Consent ----
export interface ConsentItem {
  type: string;
  label: string;
  description: string;
  granted: boolean;
}
