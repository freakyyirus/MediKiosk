/**
 * OPD booking draft — survives a page refresh during the 7-step wizard.
 * Stored per-patient in sessionStorage; cleared on successful booking.
 */

const STORAGE_KEY = 'medikiosk:opdDraft';

export interface OpdDraftHospital {
  id: number;
  name: string;
  address: string | null;
  is_verified: boolean;
}

export interface OpdDraftDepartment {
  id: number;
  hospital_id: number;
  name: string;
  color_code: string | null;
}

export interface OpdDraftDoctor {
  id: number;
  hospital_id: number;
  department_id: number;
  name: string;
  qualification: string | null;
  specialization: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
}

export interface OpdDraftSlot {
  id: number;
  doctor_id: number;
  slot_date: string;
  slot_time: string;
  is_available: boolean;
  max_tokens: number;
  current_tokens: number;
}

export interface OpdDraftIntake {
  chief_complaint: string;
  description: string;
  pain_severity: number;
  associated_symptoms: string[];
  current_medications: string;
  known_allergies: string;
  bp_systolic: string;
  bp_diastolic: string;
  pulse: string;
  temperature: string;
  spo2: string;
  weight: string;
}

export interface OpdDraft {
  patientId: string;
  step: number;
  hospital: OpdDraftHospital | null;
  department: OpdDraftDepartment | null;
  doctor: OpdDraftDoctor | null;
  slot: OpdDraftSlot | null;
  date: string;
  tokenNumber: string;
  intake: OpdDraftIntake;
  hadFiles: boolean;
  savedAt: string;
}

export function saveOpdDraft(draft: OpdDraft): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable (privacy mode / quota) — draft simply won't persist.
  }
}

export function loadOpdDraft(): OpdDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OpdDraft;
    if (!parsed || typeof parsed !== 'object' || !parsed.patientId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOpdDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // No-op.
  }
}