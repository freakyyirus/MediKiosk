import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Building2, LayoutGrid, Stethoscope, User, Calendar, Clock,
  ClipboardList, Check, ChevronRight, ChevronLeft, MapPin, Star,
  Upload, X, FileText, AlertCircle, Mic, MicOff,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore, useUIStore } from '../../stores';
import { useT, type DictKey } from '../../lib/i18n';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { Button, Card, Input, LoadingSpinner, EmptyState } from '../../components/shared';
import { useToastStore } from '../../components/shared/Toast';
import QRCode from 'qrcode';
import { saveOpdDraft, loadOpdDraft, clearOpdDraft, type OpdDraft } from '../../lib/opdDraft';
import type { Patient } from '../../types';

interface Hospital {
  id: number;
  name: string;
  address: string | null;
  is_verified: boolean;
}

interface Department {
  id: number;
  hospital_id: number;
  name: string;
  color_code: string | null;
}

interface Doctor {
  id: number;
  hospital_id: number;
  department_id: number;
  name: string;
  qualification: string | null;
  specialization: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
}

interface OpdSlot {
  id: number;
  doctor_id: number;
  slot_date: string;
  slot_time: string;
  is_available: boolean;
  max_tokens: number;
  current_tokens: number;
}

const SYMPTOM_SUGGESTIONS: Record<string, string[]> = {
  'Fever': ['General Medicine', 'Internal Medicine'],
  'Cough': ['Pulmonology', 'General Medicine'],
  'Headache': ['Neurology', 'General Medicine'],
  'Chest Pain': ['Cardiology', 'Emergency'],
  'Stomach Pain': ['Gastroenterology', 'General Surgery'],
  'Skin Rash': ['Dermatology'],
  'Bone Pain': ['Orthopedics'],
  'Eye Problem': ['Ophthalmology'],
  'Ear Pain': ['ENT'],
  'Tooth Pain': ['Dental', 'Oral Surgery'],
  'Joint Pain': ['Orthopedics', 'Rheumatology'],
  'Breathing Difficulty': ['Pulmonology', 'Cardiology'],
};

const PAIN_EMOJIS = ['😊', '😐', '😟', '😣', '😢', '😭', '🤒', '😫', '🤯'];
const ASSOCIATED_SYMPTOMS = [
  'Fever', 'Cough', 'Headache', 'Chest Pain', 'Shortness of Breath',
  'Nausea', 'Vomiting', 'Dizziness', 'Fatigue', 'Body Ache',
  'Skin Rash', 'Swelling', 'Bleeding', 'Other',
];

const STEP_LABELS: DictKey[] = [
  'stepHospital', 'stepDepartment', 'stepDoctor', 'stepDateTime', 'stepIntake', 'stepReview', 'stepConfirmed',
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 300 : -300, opacity: 0 }),
};

export default function BookOPD() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { language } = useUIStore();
  const t = useT();
  const addToast = useToastStore(s => s.addToast);
  const voice = useVoiceInput({ language: () => language.code });
  const [intakeMicField, setIntakeMicField] = useState<null | 'chief_complaint' | 'description'>(null);

  useEffect(() => () => voice.cleanup(), [voice.cleanup]);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<OpdSlot[]>([]);
  const [patientProfile, setPatientProfile] = useState<Patient | null>(null);

  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<OpdSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [tokenNumber, setTokenNumber] = useState('');

  const [hospitalSearch, setHospitalSearch] = useState('');
  const [intakeForm, setIntakeForm] = useState({
    chief_complaint: '',
    description: '',
    pain_severity: 5,
    associated_symptoms: [] as string[],
    current_medications: '',
    known_allergies: '',
    bp_systolic: '',
    bp_diastolic: '',
    pulse: '',
    temperature: '',
    spo2: '',
    weight: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) { hydratedRef.current = true; return; }
    const draft = loadOpdDraft();
    if (draft && draft.patientId === user.id) {
      const meaningful = !!(draft.hospital || draft.department || draft.doctor || draft.slot || draft.date || draft.tokenNumber || draft.intake?.chief_complaint || draft.hadFiles);
      if (meaningful) {
        if (draft.hospital) setSelectedHospital(draft.hospital);
        if (draft.department) setSelectedDept(draft.department);
        if (draft.doctor) setSelectedDoctor(draft.doctor);
        if (draft.slot) setSelectedSlot(draft.slot);
        if (draft.date) setSelectedDate(draft.date);
        if (draft.tokenNumber) setTokenNumber(draft.tokenNumber);
        if (draft.intake) setIntakeForm(draft.intake);
        if (typeof draft.step === 'number' && draft.step > 0 && draft.step < 6) setStep(draft.step);
        addToast('info', draft.hadFiles
          ? 'Restored your draft. Please re-attach your documents.'
          : 'Restored your in-progress booking.');
      } else {
        clearOpdDraft();
      }
    }
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!hydratedRef.current || !user?.id) return;
    if (bookingComplete) {
      clearOpdDraft();
      return;
    }
    if (step === 0 && !selectedHospital && !intakeForm.chief_complaint) {
      clearOpdDraft();
      return;
    }
    const draft: OpdDraft = {
      patientId: user.id,
      step,
      hospital: selectedHospital,
      department: selectedDept,
      doctor: selectedDoctor,
      slot: selectedSlot,
      date: selectedDate,
      tokenNumber,
      intake: intakeForm,
      hadFiles: uploadedFiles.length > 0,
      savedAt: new Date().toISOString(),
    };
    saveOpdDraft(draft);
  }, [user?.id, bookingComplete, step, selectedHospital, selectedDept, selectedDoctor, selectedSlot, selectedDate, tokenNumber, intakeForm, uploadedFiles]);

  useEffect(() => {
    if (!bookingComplete || !tokenNumber) return;
    const core = {
      v: 1,
      t: tokenNumber,
      p: patientProfile?.name || 'Patient',
      dept: selectedDept?.name || 'General Medicine',
      cc: (intakeForm.chief_complaint || '').slice(0, 120),
      pr: 3,
      exp: Date.now() + 30 * 60 * 1000,
    };
    const payload = 'MEDIKIOSK|' + btoa(JSON.stringify(core));
    QRCode.toDataURL(payload, { width: 320, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [bookingComplete, tokenNumber, patientProfile?.name, selectedDept?.name, intakeForm.chief_complaint]);

  useEffect(() => {
    (async () => {
      const [hospRes, profRes] = await Promise.all([
        supabase.from('hospitals').select('*').eq('is_verified', true),
        user?.id ? supabase.from('patients').select('*').eq('id', user.id).single() : Promise.resolve({ data: null }),
      ]);
      if (hospRes.data) setHospitals(hospRes.data as Hospital[]);
      if (profRes.data) setPatientProfile(profRes.data as Patient);
    })();
  }, [user?.id]);

  const fetchDepartments = useCallback(async (hospitalId: number) => {
    const { data } = await supabase.from('departments').select('*').eq('hospital_id', hospitalId);
    if (data) setDepartments(data as Department[]);
  }, []);

  const fetchDoctors = useCallback(async (hospitalId: number, deptId: number) => {
    const { data } = await supabase.from('doctors').select('*').eq('hospital_id', hospitalId).eq('department_id', deptId);
    if (data) setDoctors(data as Doctor[]);
  }, []);

  const fetchSlots = useCallback(async (doctorId: number, date: string) => {
    const { data } = await supabase.from('opd_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('slot_date', date)
      .order('slot_time', { ascending: true });
    if (data) setSlots(data as OpdSlot[]);
  }, []);

  useEffect(() => {
    if (step === 1 && selectedHospital) {
      setLoading(true);
      fetchDepartments(selectedHospital.id).finally(() => setLoading(false));
    }
  }, [step, selectedHospital, fetchDepartments]);

  useEffect(() => {
    if (step === 2 && selectedHospital && selectedDept) {
      setLoading(true);
      fetchDoctors(selectedHospital.id, selectedDept.id).finally(() => setLoading(false));
    }
  }, [step, selectedHospital, selectedDept, fetchDoctors]);

  useEffect(() => {
    if (step === 3 && selectedDoctor && selectedDate) {
      setLoading(true);
      fetchSlots(selectedDoctor.id, selectedDate).finally(() => setLoading(false));
    }
  }, [step, selectedDoctor, selectedDate, fetchSlots]);

  const goNext = () => { setDirection(1); setStep(s => Math.min(s + 1, 6)); };
  const goBack = () => { setDirection(-1); setStep(s => Math.max(s - 1, 0)); };

  const generateToken = (deptName: string) => {
    const abbrev = deptName.slice(0, 3).toUpperCase();
    const num = String(Math.floor(Math.random() * 900) + 100);
    return `${abbrev}-${num}`;
  };

  const handleBooking = async () => {
    if (!selectedHospital || !selectedDept || !selectedDoctor || !selectedSlot || !user?.id) return;
    setSubmitting(true);
    try {
      const token = generateToken(selectedDept.name);
      setTokenNumber(token);
      const { error } = await supabase.from('visits').insert({
        patient_id: user.id,
        hospital_id: selectedHospital.id,
        hospital_name: selectedHospital.name,
        department_id: selectedDept.id,
        department_name: selectedDept.name,
        doctor_id: selectedDoctor.id,
        doctor_name: selectedDoctor.name,
        visit_date: selectedSlot.slot_date,
        visit_time: selectedSlot.slot_time,
        token_number: token,
        chief_complaint: intakeForm.chief_complaint,
        description: intakeForm.description,
        pain_severity: intakeForm.pain_severity,
        associated_symptoms: intakeForm.associated_symptoms,
        current_medications: intakeForm.current_medications,
        known_allergies: intakeForm.known_allergies,
        vitals: {
          bp: intakeForm.bp_systolic && intakeForm.bp_diastolic ? `${intakeForm.bp_systolic}/${intakeForm.bp_diastolic}` : null,
          pulse: intakeForm.pulse || null,
          temperature: intakeForm.temperature || null,
          spo2: intakeForm.spo2 || null,
          weight: intakeForm.weight || null,
        },
        status: 'booked',
      });
      if (error) throw error;
      await supabase.from('opd_slots').update({ current_tokens: (selectedSlot.current_tokens || 0) + 1 }).eq('id', selectedSlot.id);

      if (uploadedFiles.length > 0) {
        try {
          await Promise.all(uploadedFiles.map(async (file) => {
            const filePath = `documents/${user.id}/${Date.now()}-${file.name}`;
            const { error: upErr } = await supabase.storage
              .from('patient-documents')
              .upload(filePath, file);
            if (upErr) throw upErr;
            const { error: insErr } = await supabase.from('documents').insert({
              patient_id: user.id,
              file_name: file.name,
              file_size_bytes: file.size,
              mime_type: file.type,
              document_type: 'other',
              document_date: selectedSlot.slot_date,
              hospital_name: selectedHospital.name,
              doctor_name: `Dr. ${selectedDoctor.name}`,
              processing_status: 'pending',
            });
            if (insErr) throw insErr;
          }));
        } catch (err) {
          console.error('Document upload failed:', err);
          addToast('warning', 'Booking confirmed, but some documents could not be uploaded.');
        }
      }

      setBookingComplete(true);
      setStep(6);
      addToast('success', 'OPD booked successfully!');
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to book OPD. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHospitals = hospitals.filter(h =>
    h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
    (h.address && h.address.toLowerCase().includes(hospitalSearch.toLowerCase()))
  );

  const suggestedDepts = selectedHospital
    ? Object.entries(SYMPTOM_SUGGESTIONS)
        .filter(([symptom]) => intakeForm.associated_symptoms.includes(symptom))
        .flatMap(([, depts]) => depts)
    : [];

  const nextDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const toggleSymptom = (s: string) => {
    setIntakeForm(prev => ({
      ...prev,
      associated_symptoms: prev.associated_symptoms.includes(s)
        ? prev.associated_symptoms.filter(x => x !== s)
        : [...prev.associated_symptoms, s],
    }));
  };

  const handleMic = async (field: 'chief_complaint' | 'description') => {
    if (voice.recording || intakeMicField) {
      const text = await voice.stop();
      setIntakeMicField(null);
      if (text.trim()) {
        setIntakeForm(f => ({ ...f, [field]: (f[field] + ' ' + text.trim()).trim() }));
      } else {
        addToast('info', 'Did not catch that. Please try again.');
      }
      return;
    }
    setIntakeMicField(field);
    const started = await voice.begin();
    if (!started) {
      const text = await voice.dictate();
      setIntakeMicField(null);
      if (text.trim()) {
        setIntakeForm(f => ({ ...f, [field]: (f[field] + ' ' + text.trim()).trim() }));
      } else {
        addToast('info', 'Did not catch that. Please try again.');
      }
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!selectedHospital;
      case 1: return !!selectedDept;
      case 2: return !!selectedDoctor;
      case 3: return !!selectedSlot;
      case 4: return intakeForm.chief_complaint.trim().length > 0;
      case 5: return true;
      default: return false;
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
      {STEP_LABELS.map((label, i) => (
        <div key={t(label)} className="flex items-center shrink-0">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            i === step
              ? 'bg-primary-600 text-white'
              : i < step
              ? 'bg-primary-100 text-primary-700'
              : 'bg-surface-100 text-surface-500'
          }`}>
            {i < step ? <Check size={14} /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{t(label)}</span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`w-6 h-0.5 mx-1 ${i < step ? 'bg-primary-300' : 'bg-surface-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderHospitalStep = () => (
    <div className="space-y-4">
      <Input
        placeholder={t('searchHospitals')}
        icon={<Search size={18} />}
        value={hospitalSearch}
        onChange={e => setHospitalSearch(e.target.value)}
      />
      {filteredHospitals.length === 0 ? (
        <EmptyState icon={<Building2 size={24} />} title={t('noHospitals')} description="Try a different search term." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredHospitals.map(h => (
            <button
              key={h.id}
              onClick={() => setSelectedHospital(h)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selectedHospital?.id === h.id
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                  : 'border-surface-200 hover:border-primary-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedHospital?.id === h.id ? 'bg-primary-100' : 'bg-surface-100'
                }`}>
                  <Building2 size={20} className={selectedHospital?.id === h.id ? 'text-primary-600' : 'text-surface-500'} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-surface-900 truncate">{h.name}</p>
                  {h.address && (
                    <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {h.address}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderDepartmentStep = () => {
    if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;
    const sortedDepts = [...departments].sort((a, b) => {
      const aSugg = suggestedDepts.includes(a.name) ? 0 : 1;
      const bSugg = suggestedDepts.includes(b.name) ? 0 : 1;
      return aSugg - bSugg;
    });
    return (
      <div className="space-y-4">
        {suggestedDepts.length > 0 && (
          <p className="text-sm text-primary-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} /> Suggested departments based on symptoms
          </p>
        )}
        {departments.length === 0 ? (
          <EmptyState icon={<LayoutGrid size={24} />} title={t('noDepartments')} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sortedDepts.map(d => {
              const isSuggested = suggestedDepts.includes(d.name);
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDept(d)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    selectedDept?.id === d.id
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-surface-200 hover:border-primary-300 bg-white'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: d.color_code || '#e0e7ff' }}
                  >
                    <Stethoscope size={18} className="text-white" />
                  </div>
                  <p className="text-sm font-semibold text-surface-900">{d.name}</p>
                  {isSuggested && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full">
                      Suggested
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderDoctorStep = () => {
    if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;
    return (
      <div className="space-y-4">
        {doctors.length === 0 ? (
          <EmptyState icon={<User size={24} />} title={t('noDoctors')} description="Try selecting a different department." />
        ) : (
          <div className="space-y-3">
            {doctors.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDoctor(d)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedDoctor?.id === d.id
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-surface-200 hover:border-primary-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                    <User size={24} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-900">Dr. {d.name}</p>
                    <p className="text-xs text-surface-500">{d.qualification || ''} {d.specialization ? `· ${d.specialization}` : ''}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                      {d.experience_years && <span>{d.experience_years} yrs exp</span>}
                      <span className="flex items-center gap-0.5"><Star size={12} className="text-warning-500" /> 4.5</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-primary-700">
                      {d.consultation_fee ? `₹${d.consultation_fee}` : t('free')}
                    </p>
                    <p className="text-[11px] text-surface-400">{t('consultation')}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDateTimeStep = () => {
    if (loading && selectedDate) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-surface-700 mb-3">{t('selectDate')}</h4>
          <div className="grid grid-cols-7 gap-2">
            {nextDays.map(d => {
              const date = new Date(d);
              const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
              const dayNum = date.getDate();
              const isSelected = selectedDate === d;
              return (
                <button
                  key={d}
                  onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                  className={`flex flex-col items-center p-2 rounded-xl text-xs transition-all ${
                    isSelected
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white border border-surface-200 hover:border-primary-300 text-surface-700'
                  }`}
                >
                  <span className="font-medium">{dayName}</span>
                  <span className="text-lg font-bold">{dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <div>
            <h4 className="text-sm font-semibold text-surface-700 mb-3">{t('selectTimeSlot')}</h4>
            {slots.length === 0 ? (
              <EmptyState icon={<Clock size={24} />} title={t('noSlots')} description="Try a different date." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {slots.map(s => {
                  const avail = s.max_tokens - (s.current_tokens || 0);
                  const isFull = avail <= 0;
                  const isSelected = selectedSlot?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      disabled={isFull}
                      onClick={() => setSelectedSlot(s)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        isFull
                          ? 'border-surface-200 bg-surface-50 text-surface-400 cursor-not-allowed'
                          : isSelected
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                          : 'border-surface-200 hover:border-primary-300 bg-white'
                      }`}
                    >
                      <p className="text-lg font-bold text-surface-900">{s.slot_time}</p>
                      <p className={`text-xs mt-1 ${isFull ? 'text-danger-500' : 'text-success-600'}`}>
                        {isFull ? t('full') : t('slotsLeft', { n: avail })}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderIntakeStep = () => {
    const micActive = (f: 'chief_complaint' | 'description') => voice.recording && intakeMicField === f;
    const micBtn = (f: 'chief_complaint' | 'description') => (
      <button
        type="button"
        onClick={() => handleMic(f)}
        disabled={voice.processing}
        aria-pressed={micActive(f)}
        title="Dictate with your voice"
        className={`flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1 transition-colors ${
          micActive(f) ? 'bg-primary-600 text-white animate-pulse' : 'bg-surface-100 text-primary-700 hover:bg-primary-50'
        }`}
      >
        {micActive(f) ? <MicOff size={14} /> : <Mic size={14} />}
        {micActive(f) ? t('listening') : t('tapToSpeak')}
      </button>
    );
    return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-surface-700 mb-1">
            {t('chiefComplaint')} <span className="text-danger-500">*</span>
          </label>
          {micBtn('chief_complaint')}
        </div>
        <input
          value={intakeForm.chief_complaint}
          onChange={e => setIntakeForm(f => ({ ...f, chief_complaint: e.target.value }))}
          placeholder="e.g., Fever and headache for 2 days"
          className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-surface-700 mb-1">{t('descriptionOfProblem')}</label>
          {micBtn('description')}
        </div>
        <textarea
          value={intakeForm.description}
          onChange={e => setIntakeForm(f => ({ ...f, description: e.target.value }))}
          rows={3}
          placeholder="Describe your symptoms in detail..."
          className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">
          {t('painSeverity')}: {intakeForm.pain_severity}/10 {PAIN_EMOJIS[Math.min(Math.floor((intakeForm.pain_severity - 1) / 1.11), 8)]}
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={intakeForm.pain_severity}
          onChange={e => setIntakeForm(f => ({ ...f, pain_severity: Number(e.target.value) }))}
          className="w-full accent-primary-600"
        />
        <div className="flex justify-between text-xs text-surface-400 mt-1">
          <span>Mild</span><span>Moderate</span><span>Severe</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">{t('associatedSymptoms')}</label>
        <div className="flex flex-wrap gap-2">
          {ASSOCIATED_SYMPTOMS.map(s => (
            <button
              key={s}
              onClick={() => toggleSymptom(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                intakeForm.associated_symptoms.includes(s)
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">{t('currentMedications')}</label>
          <textarea
            value={intakeForm.current_medications}
            onChange={e => setIntakeForm(f => ({ ...f, current_medications: e.target.value }))}
            rows={2}
            placeholder="List current medications..."
            className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">{t('knownAllergies')}</label>
          <textarea
            value={intakeForm.known_allergies}
            onChange={e => setIntakeForm(f => ({ ...f, known_allergies: e.target.value }))}
            rows={2}
            placeholder="List known allergies..."
            className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>
      </div>

      <div className="border border-surface-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-surface-700">{t('vitalSigns')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Input label="BP Systolic" type="number" placeholder="120" value={intakeForm.bp_systolic}
            onChange={e => setIntakeForm(f => ({ ...f, bp_systolic: e.target.value }))} />
          <Input label="BP Diastolic" type="number" placeholder="80" value={intakeForm.bp_diastolic}
            onChange={e => setIntakeForm(f => ({ ...f, bp_diastolic: e.target.value }))} />
          <Input label="Pulse (bpm)" type="number" placeholder="72" value={intakeForm.pulse}
            onChange={e => setIntakeForm(f => ({ ...f, pulse: e.target.value }))} />
          <Input label="Temp (°C)" type="number" step="0.1" placeholder="98.6" value={intakeForm.temperature}
            onChange={e => setIntakeForm(f => ({ ...f, temperature: e.target.value }))} />
          <Input label="SpO2 (%)" type="number" placeholder="98" value={intakeForm.spo2}
            onChange={e => setIntakeForm(f => ({ ...f, spo2: e.target.value }))} />
          <Input label="Weight (kg)" type="number" step="0.1" placeholder="70" value={intakeForm.weight}
            onChange={e => setIntakeForm(f => ({ ...f, weight: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">{t('pastDocuments')}</label>
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-surface-300 rounded-xl cursor-pointer hover:bg-surface-50 transition-colors">
          <Upload size={20} className="text-surface-400 mb-1" />
          <span className="text-xs text-surface-500">Click to upload (max 5 files)</span>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => {
              if (e.target.files) {
                const newFiles = Array.from(e.target.files).slice(0, 5 - uploadedFiles.length);
                setUploadedFiles(prev => [...prev, ...newFiles]);
              }
            }}
          />
        </label>
{uploadedFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {uploadedFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-surface-50 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-surface-700 truncate">{f.name}</span>
                <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} className="text-danger-500 hover:text-danger-700 ml-2">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const renderReviewStep = () => (
    <div className="space-y-4">
      <Card className="bg-primary-50 border border-primary-200">
        <p className="text-sm font-medium text-primary-700 mb-3">{t('bookingSummary')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-surface-500">Hospital:</span> <span className="font-medium text-surface-900 ml-1">{selectedHospital?.name}</span></div>
          <div><span className="text-surface-500">Department:</span> <span className="font-medium text-surface-900 ml-1">{selectedDept?.name}</span></div>
          <div><span className="text-surface-500">Doctor:</span> <span className="font-medium text-surface-900 ml-1">Dr. {selectedDoctor?.name}</span></div>
          <div><span className="text-surface-500">Fee:</span> <span className="font-medium text-surface-900 ml-1">{selectedDoctor?.consultation_fee ? `₹${selectedDoctor.consultation_fee}` : 'Free'}</span></div>
          <div><span className="text-surface-500">Date:</span> <span className="font-medium text-surface-900 ml-1">{selectedDate && new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
          <div><span className="text-surface-500">Time:</span> <span className="font-medium text-surface-900 ml-1">{selectedSlot?.slot_time}</span></div>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-medium text-surface-700 mb-3">{t('patientIntake')}</p>
        <div className="space-y-2 text-sm">
          <div><span className="text-surface-500">Chief Complaint:</span> <span className="text-surface-900 ml-1">{intakeForm.chief_complaint}</span></div>
          {intakeForm.description && <div><span className="text-surface-500">Description:</span> <span className="text-surface-900 ml-1">{intakeForm.description}</span></div>}
          <div><span className="text-surface-500">Pain:</span> <span className="text-surface-900 ml-1">{intakeForm.pain_severity}/10 {PAIN_EMOJIS[Math.min(Math.floor((intakeForm.pain_severity - 1) / 1.11), 8)]}</span></div>
          {intakeForm.associated_symptoms.length > 0 && (
            <div><span className="text-surface-500">Symptoms:</span> <span className="text-surface-900 ml-1">{intakeForm.associated_symptoms.join(', ')}</span></div>
          )}
          {intakeForm.current_medications && <div><span className="text-surface-500">Medications:</span> <span className="text-surface-900 ml-1">{intakeForm.current_medications}</span></div>}
          {intakeForm.known_allergies && <div><span className="text-surface-500">Allergies:</span> <span className="text-surface-900 ml-1">{intakeForm.known_allergies}</span></div>}
          {uploadedFiles.length > 0 && (
            <div><span className="text-surface-500">Documents:</span> <span className="text-surface-900 ml-1">{uploadedFiles.length} file(s) attached</span></div>
          )}
        </div>
      </Card>

      <div className="bg-surface-50 rounded-xl p-4 text-center">
        <p className="text-sm text-surface-500">Preview Token</p>
        <p className="text-3xl font-bold text-primary-700 mt-1">{tokenNumber || '---'}</p>
        <p className="text-xs text-surface-400 mt-1">Generated on confirmation</p>
      </div>
    </div>
  );

  const renderConfirmedStep = () => (
    <div className="text-center py-8 space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full bg-success-100 flex items-center justify-center mx-auto"
      >
        <Check size={40} className="text-success-600" />
      </motion.div>
      <div>
        <h3 className="text-2xl font-bold text-surface-900">{t('bookingConfirmed')}</h3>
        <p className="text-surface-500 mt-1">Your OPD appointment has been booked successfully.</p>
      </div>
      <div className="bg-primary-50 rounded-2xl p-6 inline-block">
        <p className="text-sm text-primary-600 font-medium">{t('tokenLabel')}</p>
        <p className="text-5xl font-bold text-primary-700 mt-2 tracking-wider">{tokenNumber}</p>
      </div>
      <div className="w-56 h-56 bg-white border-2 border-surface-200 rounded-xl mx-auto flex items-center justify-center">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Quick Response code for your OPD appointment" className="w-48 h-48" />
        ) : (
          <div className="text-center">
            <FileText size={24} className="text-surface-300 mx-auto" />
            <p className="text-[10px] text-surface-400 mt-1">Generating QR…</p>
          </div>
        )}
      </div>
      <p className="text-xs text-surface-400">{t('scanQrHint')}</p>
      <div className="bg-surface-50 rounded-xl p-4 inline-block">
        <p className="text-sm text-surface-500">{t('estimatedWait')}</p>
        <p className="text-xl font-bold text-surface-900">~20-30 minutes</p>
      </div>
      <div className="flex gap-3 justify-center">
        <Button variant="primary" onClick={() => navigate('/patient/visits')}>
          {t('viewMyVisits')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/patient/dashboard')}>
          {t('backToDashboard')}
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 0: return renderHospitalStep();
      case 1: return renderDepartmentStep();
      case 2: return renderDoctorStep();
      case 3: return renderDateTimeStep();
      case 4: return renderIntakeStep();
      case 5: return renderReviewStep();
      case 6: return renderConfirmedStep();
      default: return null;
    }
  };

  const stepTitle = (['selectHospital', 'selectDepartment', 'selectDoctor', 'selectDateTime', 'patientIntake', 'reviewConfirm', 'bookingConfirmed'] as DictKey[])[step];

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-surface-900">{t('bookOpdPageTitle')}</h1>
            <p className="text-sm text-surface-500">{t(stepTitle)}</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/patient/dashboard')}>{t('cancel')}</Button>
        </div>

        {renderStepIndicator()}

        <Card>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
        </Card>

        {step < 6 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              icon={<ChevronLeft size={18} />}
              onClick={goBack}
              disabled={step === 0}
            >
              {t('back')}
            </Button>
            {step === 5 ? (
              <Button
                variant="primary"
                icon={<Check size={18} />}
                onClick={handleBooking}
                loading={submitting}
              >
                {t('confirmBooking')}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={goNext}
                disabled={!canProceed()}
                icon={<ChevronRight size={18} />}
              >
                {t('next')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
