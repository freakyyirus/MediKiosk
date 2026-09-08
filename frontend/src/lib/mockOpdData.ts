/**
 * Mock OPD data — used by BookOPD as a fallback when Supabase/DB returns no rows
 * (e.g. not seeded, no backend). Mirrors the public kiosk's Bangalore demo data so
 * the two flows stay consistent. All made-up but plausible.
 */

export interface MockHospitalData {
  id: number;
  name: string;
  address: string;
  is_verified: boolean;
}

export interface MockDepartmentData {
  id: number;
  hospital_id: number;
  name: string;
  color_code: string;
}

export interface MockDoctorData {
  id: number;
  hospital_id: number;
  department_id: number;
  name: string;
  qualification: string;
  specialization: string;
  experience_years: number;
  consultation_fee: number;
}

export interface MockSlotData {
  id: number;
  doctor_id: number;
  slot_date: string;
  slot_time: string;
  is_available: boolean;
  max_tokens: number;
  current_tokens: number;
}

export const MOCK_HOSPITALS: MockHospitalData[] = [
  { id: 1, name: 'City Heart Hospital', address: '100 Feet Rd, Koramangala, Bengaluru', is_verified: true },
  { id: 2, name: 'NeuroCare Neurology', address: '100 Ft Road, Indiranagar, Bengaluru', is_verified: true },
  { id: 3, name: 'Bone & Joint Institute', address: 'Jayanagar 4th Block, Bengaluru', is_verified: true },
  { id: 4, name: 'DigestiveCare Clinic', address: 'Whitefield Main Rd, Bengaluru', is_verified: true },
  { id: 5, name: "Sunrise Children's Hospital", address: 'Sampige Rd, Malleshwaram, Bengaluru', is_verified: true },
];

const DEPT_NAMES = ['Cardiology', 'Orthopedics', 'General Medicine', 'Pediatrics', 'Neurology', 'Gastroenterology', 'Dermatology', 'ENT'];
const DEPT_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export const MOCK_DEPARTMENTS: MockDepartmentData[] = MOCK_HOSPITALS.flatMap((h) =>
  DEPT_NAMES.slice(0, h.id === 1 ? 2 : h.id === 2 ? 2 : 3).map((name, i) => ({
    id: h.id * 100 + i + 1,
    hospital_id: h.id,
    name,
    color_code: DEPT_COLORS[(h.id + i) % DEPT_COLORS.length],
  }))
);

export const MOCK_DOCTORS: MockDoctorData[] = MOCK_DEPARTMENTS.flatMap((d, i) => {
  const fees = [300, 450, 600, 750, 900];
  const first = ['Amit', 'Priya', 'Rajesh', 'Sneha', 'Vikram', 'Anita', 'Kiran', 'Nikhil'];
  const last = ['Sharma', 'Patel', 'Kumar', 'Gupta', 'Rao', 'Desai', 'Nair', 'Iyer'];
  return [
    {
      id: d.id * 10 + 1,
      hospital_id: d.hospital_id,
      department_id: d.id,
      name: `${first[i % first.length]} ${last[(i + 1) % last.length]}`,
      qualification: 'MBBS, MD',
      specialization: d.name,
      experience_years: 6 + (i % 15),
      consultation_fee: fees[i % fees.length],
    },
  ];
});

export function buildMockSlots(doctorId: number, date: string): MockSlotData[] {
  const times = ['09:00', '10:00', '11:00', '14:00', '15:00'];
  return times.map((slot_time, i) => ({
    id: doctorId * 100 + i + 1,
    doctor_id: doctorId,
    slot_date: date,
    slot_time,
    is_available: true,
    max_tokens: 10,
    current_tokens: i % 3,
  }));
}
