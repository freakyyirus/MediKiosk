import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, Phone, Droplets, AlertTriangle, FileText,
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, Activity,
  Pill, Stethoscope, TestTube, ClipboardList, Calendar, Clock,
  Shield, Send, UserPlus, LogOut, Heart,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores';
import {
  Card, Button, Input, Select, Modal, Badge,
  LoadingSpinner, EmptyState,
} from '../../components/shared';
import { useToastStore } from '../../components/shared';

// ─── Types ───────────────────────────────────────────────────────────

interface PatientInfo {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  abha_id: string | null;
  blood_group: string | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  past_surgeries: string[] | null;
}

interface VisitInfo {
  id: string;
  visit_date: string;
  chief_complaint: string | null;
  symptoms_description: string | null;
  severity: number | null;
  associated_symptoms: string[] | null;
  current_medications: string[] | null;
  allergies: string | null;
  vitals: Record<string, any> | null;
  diagnosis: string | null;
  differential_diagnosis: string | null;
  examination_findings: string | null;
  advice: string | null;
  follow_up_date: string | null;
  status: string;
  token_number: number | null;
  priority: string | null;
}

interface PrescriptionItem {
  id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface LabTestEntry {
  test_name: string;
  status: string;
  custom: boolean;
}

interface PastVisit {
  id: string;
  visit_date: string;
  diagnosis: string | null;
  doctor_name: string | null;
  department: string | null;
}

interface DocumentEntry {
  id: string;
  file_name: string | null;
  document_type: string | null;
  created_at: string;
  mime_type: string | null;
}

interface DoctorProfile {
  id: string;
  name: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const DRUG_SUGGESTIONS = [
  'Paracetamol', 'Amoxicillin', 'Metformin', 'Amlodipine', 'Omeprazole',
  'Atorvastatin', 'Metoprolol', 'Losartan', 'Azithromycin', 'Cetirizine',
  'Pantoprazole', 'Montelukast', 'Dolo 650', 'Pan-D', 'Telmisartan',
  'Glimepiride', 'Levocetirizine', 'Pantop D', 'Doxycycline', 'Ibuprofen',
];

const FREQUENCY_OPTIONS = [
  { value: 'once_daily', label: 'Once daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'three_times_daily', label: 'Three times daily' },
  { value: 'every_4_hours', label: 'Every 4 hours' },
  { value: 'as_needed', label: 'As needed' },
];

const DURATION_OPTIONS = [
  { value: '3_days', label: '3 days' },
  { value: '5_days', label: '5 days' },
  { value: '7_days', label: '7 days' },
  { value: '14_days', label: '14 days' },
  { value: '1_month', label: '1 month' },
  { value: '3_months', label: '3 months' },
  { value: 'ongoing', label: 'Ongoing' },
];

const DEFAULT_REFER_DEPARTMENTS = [
  { value: 'Cardiology', label: 'Cardiology' },
  { value: 'Neurology', label: 'Neurology' },
  { value: 'Orthopedics', label: 'Orthopedics' },
  { value: 'Dermatology', label: 'Dermatology' },
  { value: 'ENT', label: 'ENT' },
  { value: 'Ophthalmology', label: 'Ophthalmology' },
  { value: 'Psychiatry', label: 'Psychiatry' },
  { value: 'General Surgery', label: 'General Surgery' },
];

const COMMON_LAB_TESTS = [
  'CBC', 'Lipid Profile', 'Blood Sugar', 'Thyroid', 'Liver Function',
  'Kidney Function', 'Urine Routine', 'ECG', 'Chest X-Ray', 'Echocardiography',
];

const FOLLOW_UP_OPTIONS = [
  { value: '1_week', label: '1 week' },
  { value: '2_weeks', label: '2 weeks' },
  { value: '1_month', label: '1 month' },
  { value: '3_months', label: '3 months' },
  { value: 'custom', label: 'Custom' },
];

const SEVERITY_COLORS = [
  'bg-success-400', 'bg-success-500', 'bg-success-500',
  'bg-warning-400', 'bg-warning-400', 'bg-warning-500',
  'bg-warning-600', 'bg-danger-400', 'bg-danger-500', 'bg-danger-600',
];

// ─── Accordion Section ───────────────────────────────────────────────

function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-surface-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface-50 hover:bg-surface-100 transition-colors text-left"
      >
        <span className="text-primary-600">{icon}</span>
        <span className="flex-1 font-medium text-surface-900">{title}</span>
        {open ? <ChevronUp size={18} className="text-surface-400" /> : <ChevronDown size={18} className="text-surface-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function PatientCard() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [visit, setVisit] = useState<VisitInfo | null>(null);
  const [pastVisits, setPastVisits] = useState<PastVisit[]>([]);
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [labTests, setLabTests] = useState<LabTestEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Consultation form state
  const [diagnosis, setDiagnosis] = useState('');
  const [differentialDiagnosis, setDifferentialDiagnosis] = useState('');
  const [examinationFindings, setExaminationFindings] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpOption, setFollowUpOption] = useState('1_week');
  const [customFollowUpDate, setCustomFollowUpDate] = useState('');
  const [newCustomTest, setNewCustomTest] = useState('');
  const [drugSuggestions, setDrugSuggestions] = useState<string[]>([]);
  const [activeDrugRow, setActiveDrugRow] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [referModalOpen, setReferModalOpen] = useState(false);
  const [referDepartment, setReferDepartment] = useState('');
  const [referDepartments, setReferDepartments] = useState(DEFAULT_REFER_DEPARTMENTS);
  const [prescriptionHistory, setPrescriptionHistory] = useState<any[]>([]);

  // ─── Data Fetching ───────────────────────────────────────────────

  const loadPatientData = useCallback(async () => {
    if (!visitId) return;

    setLoading(true);
    try {
      // Fetch current visit with patient info
      const { data: visitData } = await supabase
        .from('visits')
        .select(`
          *,
          patients(
            id, name, date_of_birth, gender, phone, abha_id,
            blood_group, allergies, chronic_conditions, past_surgeries
          ),
          doctors(name)
        `)
        .eq('id', visitId)
        .single();

      if (!visitData) return;

      const pat = (visitData as any).patients;
      setPatient({
        id: pat?.id,
        name: pat?.name || 'Unknown',
        date_of_birth: pat?.date_of_birth,
        gender: pat?.gender,
        phone: pat?.phone,
        abha_id: pat?.abha_id,
        blood_group: pat?.blood_group,
        allergies: pat?.allergies,
        chronic_conditions: pat?.chronic_conditions,
        past_surgeries: pat?.past_surgeries,
      });

      setVisit({
        id: visitData.id,
        visit_date: visitData.visit_date,
        chief_complaint: visitData.chief_complaint,
        symptoms_description: visitData.symptoms_description,
        severity: visitData.severity,
        associated_symptoms: visitData.associated_symptoms,
        current_medications: visitData.current_medications,
        allergies: visitData.allergies,
        vitals: visitData.vitals,
        diagnosis: visitData.diagnosis,
        differential_diagnosis: visitData.differential_diagnosis,
        examination_findings: visitData.examination_findings,
        advice: visitData.advice,
        follow_up_date: visitData.follow_up_date,
        status: visitData.status,
        token_number: visitData.token_number,
        priority: visitData.priority,
      });

      // Pre-fill form if revisiting
      if (visitData.diagnosis) setDiagnosis(visitData.diagnosis);
      if (visitData.differential_diagnosis) setDifferentialDiagnosis(visitData.differential_diagnosis);
      if (visitData.examination_findings) setExaminationFindings(visitData.examination_findings);
      if (visitData.advice) setAdvice(visitData.advice);

      // Fetch doctor profile
      if (user?.id) {
        const { data: doc } = await supabase
          .from('doctors')
          .select('id, name')
          .eq('user_id', user.id)
          .single();
        if (doc) setDoctor(doc as DoctorProfile);
      }

      // Fetch referral departments for this hospital (fall back to defaults)
      const hospitalId = (visitData as any).hospital_id;
      if (hospitalId) {
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name')
          .eq('hospital_id', hospitalId)
          .order('name', { ascending: true });
        if (depts && depts.length > 0) {
          setReferDepartments(depts.map((d: any) => ({ value: d.name, label: d.name })));
        }
      }

      // Fetch past visits for this patient
      if (pat?.id) {
        const { data: pastData } = await supabase
          .from('visits')
          .select('id, visit_date, diagnosis, doctor_name, department')
          .eq('patient_id', pat.id)
          .neq('id', visitId)
          .order('visit_date', { ascending: false })
          .limit(20);

        setPastVisits(pastData || []);

        // Fetch documents
        const { data: docs } = await supabase
          .from('documents')
          .select('id, file_name, document_type, created_at, mime_type')
          .eq('patient_id', pat.id)
          .order('created_at', { ascending: false });

        setDocuments(docs || []);

        // Fetch past prescriptions
        const { data: pastRx } = await supabase
          .from('prescriptions')
          .select('id, created_at, prescription_items(drug_name, dosage, frequency)')
          .eq('patient_id', pat.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setPrescriptionHistory(pastRx || []);
      }

      // Initialize empty prescription row
      setPrescriptions([{
        id: crypto.randomUUID(),
        drug_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      }]);
    } finally {
      setLoading(false);
    }
  }, [visitId, user?.id]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  // ─── Prescription Management ──────────────────────────────────────

  const addPrescriptionRow = () => {
    setPrescriptions([
      ...prescriptions,
      { id: crypto.randomUUID(), drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  };

  const removePrescriptionRow = (id: string) => {
    if (prescriptions.length <= 1) return;
    setPrescriptions(prescriptions.filter((p) => p.id !== id));
  };

  const updatePrescription = (id: string, field: keyof PrescriptionItem, value: string) => {
    setPrescriptions(prescriptions.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  // ─── Lab Test Management ──────────────────────────────────────────

  const toggleLabTest = (testName: string) => {
    const exists = labTests.find((t) => t.test_name === testName);
    if (exists) {
      setLabTests(labTests.filter((t) => t.test_name !== testName));
    } else {
      setLabTests([...labTests, { test_name: testName, status: 'recommended', custom: false }]);
    }
  };

  const addCustomTest = () => {
    if (!newCustomTest.trim()) return;
    if (labTests.find((t) => t.test_name === newCustomTest.trim())) return;
    setLabTests([...labTests, { test_name: newCustomTest.trim(), status: 'recommended', custom: true }]);
    setNewCustomTest('');
  };

  // ─── Drug Autocomplete ────────────────────────────────────────────

  const handleDrugInput = (value: string, rowId: string) => {
    updatePrescription(rowId, 'drug_name', value);
    if (value.length > 0) {
      const filtered = DRUG_SUGGESTIONS.filter((d) =>
        d.toLowerCase().includes(value.toLowerCase())
      );
      setDrugSuggestions(filtered);
      setActiveDrugRow(rowId);
    } else {
      setDrugSuggestions([]);
      setActiveDrugRow(null);
    }
  };

  const selectDrug = (drug: string, rowId: string) => {
    updatePrescription(rowId, 'drug_name', drug);
    setDrugSuggestions([]);
    setActiveDrugRow(null);
  };

  // ─── Complete Consultation ────────────────────────────────────────

  const handleCompleteConsultation = async () => {
    if (!visit || !patient) return;

    // Validate
    if (!diagnosis.trim()) {
      addToast('error', 'Diagnosis is required');
      return;
    }
    const validPrescriptions = prescriptions.filter((p) => p.drug_name.trim());
    if (validPrescriptions.length === 0) {
      addToast('error', 'At least one prescription item is required');
      return;
    }

    setSaving(true);
    try {
      // Calculate follow-up date
      let followUpDate: string | null = null;
      if (followUpOption === 'custom' && customFollowUpDate) {
        followUpDate = customFollowUpDate;
      } else if (followUpOption !== 'custom') {
        const now = new Date();
        switch (followUpOption) {
          case '1_week': now.setDate(now.getDate() + 7); break;
          case '2_weeks': now.setDate(now.getDate() + 14); break;
          case '1_month': now.setMonth(now.getMonth() + 1); break;
          case '3_months': now.setMonth(now.getMonth() + 3); break;
        }
        followUpDate = now.toISOString().split('T')[0];
      }

      // 1. Create prescription header
      const { data: rx, error: rxError } = await supabase
        .from('prescriptions')
        .insert({
          visit_id: visit.id,
          patient_id: patient.id,
          doctor_id: doctor?.id || '',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (rxError) throw rxError;

      // 2. Insert prescription items
      const items = validPrescriptions.map((p) => ({
        prescription_id: rx.id,
        drug_name: p.drug_name,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        instructions: p.instructions,
      }));

      const { error: itemsError } = await supabase
        .from('prescription_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // 3. Insert lab tests
      if (labTests.length > 0) {
        const { error: labError } = await supabase
          .from('lab_tests')
          .insert(labTests.map((t) => ({
            visit_id: visit.id,
            patient_id: patient.id,
            test_name: t.test_name,
            status: 'recommended',
          })));

        if (labError) throw labError;
      }

      // 4. Update visit
      const { error: visitError } = await supabase
        .from('visits')
        .update({
          diagnosis,
          differential_diagnosis: differentialDiagnosis || null,
          examination_findings: examinationFindings || null,
          advice: advice || null,
          follow_up_date: followUpDate,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', visit.id);

      if (visitError) throw visitError;

      // 5. Update queue
      await supabase
        .from('queues')
        .update({ status: 'completed' })
        .eq('visit_id', visit.id);

      addToast('success', 'Consultation completed successfully');
      navigate('/doctor/queue');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save consultation');
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────

  const calculateAge = (dob: string | null): string => {
    if (!dob) return 'N/A';
    const birth = new Date(dob);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years}y ${months}m`;
    return `${months}m`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPriorityVariant = (p?: string | null): 'danger' | 'warning' | 'success' => {
    if (p === 'emergency') return 'danger';
    if (p === 'urgent') return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!patient || !visit) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <EmptyState
          icon={<User size={40} />}
          title="Patient not found"
          description="The requested visit could not be loaded."
          action={{ label: 'Back to Queue', onClick: () => navigate('/doctor/queue') }}
        />
      </div>
    );
  }

  const vitals = visit.vitals || {};

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Top bar */}
      <div className="bg-white border-b border-surface-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/doctor/queue')}
            className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-surface-900">Patient Consultation</h1>
            <p className="text-xs text-surface-500">Visit #{visit.id} — {visit.visit_date}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/queue')}>
              <LogOut size={16} /> Queue
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header Section ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-lg shadow-primary-600/20">
                <span className="text-2xl font-bold text-white">{getInitials(patient.name)}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-surface-900">{patient.name}</h2>
                  <Badge variant={getPriorityVariant(visit.priority)} size="md">
                    {visit.priority?.toUpperCase() || 'NORMAL'}
                  </Badge>
                  {visit.token_number && (
                    <span className="text-lg font-bold text-primary-600">#{visit.token_number}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-surface-500 flex-wrap">
                  <span>{calculateAge(patient.date_of_birth)} / {patient.gender || 'N/A'}</span>
                  {patient.phone && (
                    <span className="flex items-center gap-1"><Phone size={14} /> {patient.phone}</span>
                  )}
                  {patient.abha_id && (
                    <span className="flex items-center gap-1"><Shield size={14} /> ABHA: {patient.abha_id}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {patient.blood_group && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-danger-50 text-danger-700">
                      <Droplets size={12} /> {patient.blood_group}
                    </span>
                  )}
                  {patient.allergies && patient.allergies.length > 0 && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warning-50 text-warning-700">
                      <AlertTriangle size={12} /> Allergies: {patient.allergies.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Vitals Grid ────────────────────────────────────────────── */}
        {vitals && Object.keys(vitals).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <Heart size={16} className="text-danger-500" /> Vital Signs
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { key: 'bp', label: 'BP', unit: 'mmHg', color: 'primary' },
                  { key: 'pulse', label: 'Pulse', unit: 'bpm', color: 'success' },
                  { key: 'temperature', label: 'Temp', unit: '°F', color: 'warning' },
                  { key: 'spo2', label: 'SpO2', unit: '%', color: 'primary' },
                  { key: 'weight', label: 'Weight', unit: 'kg', color: 'success' },
                ].map(({ key, label, unit, color }) => {
                  const val = vitals[key] || vitals[key.toLowerCase()];
                  return (
                    <div key={key} className={`p-3 rounded-xl bg-${color}-50 border border-${color}-100 text-center`}>
                      <p className="text-xs text-surface-500">{label}</p>
                      <p className={`text-lg font-bold text-${color}-700`}>{val || '—'}</p>
                      {val && <p className="text-[10px] text-surface-400">{unit}</p>}
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Current Visit Info ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <Stethoscope size={16} className="text-primary-500" /> What Patient Reported
            </h3>
            <div className="space-y-4">
              {/* Chief Complaint */}
              <div>
                <p className="text-xs text-surface-500 mb-1">Chief Complaint</p>
                <p className="text-sm font-medium text-surface-900">{visit.chief_complaint || 'Not recorded'}</p>
              </div>

              {/* Duration & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-surface-500 mb-1">Duration / Description</p>
                  <p className="text-sm text-surface-700">{visit.symptoms_description || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 mb-2">Severity ({visit.severity || 0}/10)</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-0.5">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div
                          key={i}
                          className={`h-3 flex-1 rounded-sm ${
                            i < (visit.severity || 0) ? SEVERITY_COLORS[i] : 'bg-surface-100'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-surface-700 w-6 text-right">{visit.severity || 0}</span>
                  </div>
                </div>
              </div>

              {/* Associated Symptoms */}
              {visit.associated_symptoms && visit.associated_symptoms.length > 0 && (
                <div>
                  <p className="text-xs text-surface-500 mb-2">Associated Symptoms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {visit.associated_symptoms.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-surface-100 text-surface-700 text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Patient Description */}
              {visit.symptoms_description && (
                <div>
                  <p className="text-xs text-surface-500 mb-1">Patient's Description</p>
                  <p className="text-sm text-surface-700 italic">"{visit.symptoms_description}"</p>
                </div>
              )}

              {/* Current Medications */}
              {visit.current_medications && visit.current_medications.length > 0 && (
                <div>
                  <p className="text-xs text-surface-500 mb-2">Current Medications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {visit.current_medications.map((m, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergies */}
              {visit.allergies && (
                <div>
                  <p className="text-xs text-surface-500 mb-1">Allergies (reported)</p>
                  <p className="text-sm text-danger-600 font-medium">{visit.allergies}</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* ── Medical History ────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
          <AccordionSection title="Medical History" icon={<ClipboardList size={18} />} defaultOpen>
            <div className="space-y-4">
              {patient.chronic_conditions && patient.chronic_conditions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-surface-500 mb-1">Chronic Conditions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.chronic_conditions.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-warning-50 text-warning-700 text-xs font-medium">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {patient.past_surgeries && patient.past_surgeries.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-surface-500 mb-1">Past Surgeries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.past_surgeries.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-surface-100 text-surface-700 text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {patient.allergies && patient.allergies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-surface-500 mb-1">Known Allergies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.allergies.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-danger-50 text-danger-700 text-xs font-medium flex items-center gap-1">
                        <AlertTriangle size={10} /> {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Past Prescriptions */}
          <AccordionSection title="Past Prescriptions" icon={<Pill size={18} />}>
            {prescriptionHistory.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-4">No past prescriptions found</p>
            ) : (
              <div className="space-y-3">
                {prescriptionHistory.map((rx) => (
                  <div key={rx.id} className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                    <p className="text-xs text-surface-500 mb-2">
                      {new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {rx.prescription_items?.map((item: any, i: number) => (
                      <p key={i} className="text-sm text-surface-700">
                        {item.drug_name} {item.dosage} — {item.frequency}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </AccordionSection>

          {/* Past Visits Timeline */}
          <AccordionSection title="Visit History" icon={<Clock size={18} />}>
            {pastVisits.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-4">No past visits found</p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-surface-200" />
                {pastVisits.map((pv) => (
                  <div key={pv.id} className="relative mb-4 last:mb-0">
                    <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary-500 border-2 border-white" />
                    <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-primary-600">
                          {new Date(pv.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {pv.department && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-600">{pv.department}</span>
                        )}
                      </div>
                      {pv.diagnosis && (
                        <p className="text-sm text-surface-700 mt-1">{pv.diagnosis}</p>
                      )}
                      {pv.doctor_name && (
                        <p className="text-xs text-surface-400 mt-1">Dr. {pv.doctor_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AccordionSection>

          {/* Documents */}
          <AccordionSection title={`Documents (${documents.length})`} icon={<FileText size={18} />}>
            {documents.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-4">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 border border-surface-200">
                    <FileText size={16} className="text-primary-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 truncate">{doc.file_name || 'Untitled'}</p>
                      <p className="text-xs text-surface-400">{doc.document_type || 'Other'} — {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="neutral" size="sm">{doc.mime_type?.split('/')[1] || 'file'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </AccordionSection>
        </motion.div>

        {/* ── Consultation Notes ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <Stethoscope size={16} className="text-primary-500" /> Consultation Notes
            </h3>
            <div className="space-y-4">
              <Input
                label="Provisional Diagnosis *"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter primary diagnosis"
                required
              />
              <Input
                label="Differential Diagnosis"
                value={differentialDiagnosis}
                onChange={(e) => setDifferentialDiagnosis(e.target.value)}
                placeholder="Alternative diagnoses to consider"
              />
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Examination Findings</label>
                <textarea
                  value={examinationFindings}
                  onChange={(e) => setExaminationFindings(e.target.value)}
                  placeholder="Physical examination findings, observations..."
                  rows={4}
                  className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Prescription Table ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-900 flex items-center gap-2">
                <Pill size={16} className="text-primary-500" /> Prescription
              </h3>
              <Button variant="ghost" size="sm" onClick={addPrescriptionRow} icon={<Plus size={16} />}>
                Add Drug
              </Button>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-2 px-2 text-xs font-medium text-surface-500">Drug Name *</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-surface-500">Dosage</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-surface-500">Frequency</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-surface-500">Duration</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-surface-500">Instructions</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((rx) => (
                    <tr key={rx.id} className="border-b border-surface-100 last:border-0">
                      <td className="py-1.5 px-2 relative">
                        <input
                          value={rx.drug_name}
                          onChange={(e) => handleDrugInput(e.target.value, rx.id)}
                          onFocus={() => { if (rx.drug_name) handleDrugInput(rx.drug_name, rx.id); }}
                          onBlur={() => setTimeout(() => { setDrugSuggestions([]); setActiveDrugRow(null); }, 200)}
                          placeholder="e.g. Paracetamol"
                          className="w-full rounded border border-surface-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        {activeDrugRow === rx.id && drugSuggestions.length > 0 && (
                          <div className="absolute z-20 top-full left-2 right-2 mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {drugSuggestions.map((d) => (
                              <button
                                key={d}
                                onMouseDown={() => selectDrug(d, rx.id)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors"
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          value={rx.dosage}
                          onChange={(e) => updatePrescription(rx.id, 'dosage', e.target.value)}
                          placeholder="e.g. 500mg"
                          className="w-full rounded border border-surface-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={rx.frequency}
                          onChange={(e) => updatePrescription(rx.id, 'frequency', e.target.value)}
                          className="w-full rounded border border-surface-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="">Select</option>
                          {FREQUENCY_OPTIONS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={rx.duration}
                          onChange={(e) => updatePrescription(rx.id, 'duration', e.target.value)}
                          className="w-full rounded border border-surface-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="">Select</option>
                          {DURATION_OPTIONS.map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          value={rx.instructions}
                          onChange={(e) => updatePrescription(rx.id, 'instructions', e.target.value)}
                          placeholder="e.g. After food"
                          className="w-full rounded border border-surface-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <button
                          onClick={() => removePrescriptionRow(rx.id)}
                          disabled={prescriptions.length <= 1}
                          className="p-1.5 rounded text-surface-400 hover:text-danger-600 hover:bg-danger-50 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {prescriptions.map((rx, idx) => (
                <div key={rx.id} className="p-3 rounded-lg bg-surface-50 border border-surface-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-surface-500">Drug #{idx + 1}</span>
                    <button
                      onClick={() => removePrescriptionRow(rx.id)}
                      disabled={prescriptions.length <= 1}
                      className="p-1 rounded text-surface-400 hover:text-danger-600 disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      value={rx.drug_name}
                      onChange={(e) => handleDrugInput(e.target.value, rx.id)}
                      placeholder="Drug name *"
                      className="w-full rounded border border-surface-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    {activeDrugRow === rx.id && drugSuggestions.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                        {drugSuggestions.map((d) => (
                          <button key={d} onMouseDown={() => selectDrug(d, rx.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50">{d}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={rx.dosage} onChange={(e) => updatePrescription(rx.id, 'dosage', e.target.value)} placeholder="Dosage" className="rounded border border-surface-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
                    <input value={rx.instructions} onChange={(e) => updatePrescription(rx.id, 'instructions', e.target.value)} placeholder="Instructions" className="rounded border border-surface-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={rx.frequency} onChange={(e) => updatePrescription(rx.id, 'frequency', e.target.value)} className="rounded border border-surface-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-500">
                      <option value="">Frequency</option>
                      {FREQUENCY_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <select value={rx.duration} onChange={(e) => updatePrescription(rx.id, 'duration', e.target.value)} className="rounded border border-surface-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-500">
                      <option value="">Duration</option>
                      {DURATION_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* ── Lab Tests ──────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <TestTube size={16} className="text-primary-500" /> Lab Tests
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
              {COMMON_LAB_TESTS.map((test) => {
                const selected = labTests.some((t) => t.test_name === test);
                return (
                  <button
                    key={test}
                    onClick={() => toggleLabTest(test)}
                    className={`p-2.5 rounded-lg border text-sm font-medium transition-all ${
                      selected
                        ? 'bg-primary-50 border-primary-300 text-primary-700 ring-1 ring-primary-200'
                        : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'
                    }`}
                  >
                    {selected && <CheckCircle size={14} className="inline mr-1.5" />}
                    {test}
                  </button>
                );
              })}
            </div>

            {/* Custom test input */}
            <div className="flex gap-2">
              <Input
                value={newCustomTest}
                onChange={(e) => setNewCustomTest(e.target.value)}
                placeholder="Add custom test..."
                onKeyDown={(e) => { if (e.key === 'Enter') addCustomTest(); }}
              />
              <Button variant="outline" size="sm" onClick={addCustomTest} icon={<Plus size={16} />}>
                Add
              </Button>
            </div>

            {labTests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {labTests.map((t) => (
                  <span key={t.test_name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                    {t.test_name}
                    <button onClick={() => toggleLabTest(t.test_name)} className="hover:text-danger-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* ── Advice & Follow-up ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <ClipboardList size={16} className="text-primary-500" /> Advice & Follow-up
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Advice</label>
                <textarea
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  placeholder="Diet, lifestyle modifications, precautions..."
                  rows={3}
                  className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Next Review"
                  options={FOLLOW_UP_OPTIONS}
                  value={followUpOption}
                  onChange={setFollowUpOption}
                />
                {followUpOption === 'custom' && (
                  <Input
                    label="Follow-up Date"
                    type="date"
                    value={customFollowUpDate}
                    onChange={(e) => setCustomFollowUpDate(e.target.value)}
                  />
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Action Buttons ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                size="lg"
                className="flex-[2]"
                loading={saving}
                onClick={handleCompleteConsultation}
                icon={<CheckCircle size={20} />}
              >
                Complete Consultation
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setReferModalOpen(true)}
                icon={<UserPlus size={18} />}
              >
                Refer to Specialist
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  addToast('info', 'Patient sent home');
                  navigate('/doctor/queue');
                }}
                icon={<LogOut size={18} />}
              >
                Send Home
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ── Refer Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={referModalOpen} onClose={() => setReferModalOpen(false)} title="Refer to Specialist" size="md">
        <div className="space-y-4">
          <Select
            label="Department"
            options={referDepartments}
            value={referDepartment}
            onChange={setReferDepartment}
            placeholder="Select department"
          />
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={() => {
              addToast('success', `Referred to ${referDepartment || 'specialist'}`);
              setReferModalOpen(false);
              navigate('/doctor/queue');
            }}>
              Confirm Referral
            </Button>
            <Button variant="ghost" onClick={() => setReferModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
