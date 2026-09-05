import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  LayoutDashboard,
  HeartPulse,
  Trash2,
  CalendarDays,
  ListOrdered,
  UserCog,
  Building2,
  CheckCircle,
  Hand,
  X,
  Users,
  Save,
  Activity,
  Sparkles,
} from 'lucide-react';
import { advancedApi } from '../../api/client';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import {
  Sidebar,
  Header,
  Button,
  Card,
  Badge,
  EmptyState,
  LoadingSpinner,
  Select,
} from '../../components/shared';

interface TriagePatient {
  id: number;
  token: number;
  patient_name: string;
  chief_complaint: string;
  severity: number;
  status: string;
  department_name: string | null;
  department_id: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  priority: string;
  triage_notes: string | null;
  associated_symptoms: string[] | null;
  description: string | null;
  vitals: Record<string, unknown> | null;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
}

interface MlResult {
  priority_class: string;
  priority_score: number;
  confidence: number;
  top_factors: string[];
}

const sidebarItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/hospital/dashboard' },
  { icon: <CalendarDays size={20} />, label: "Today's OPD", path: '/hospital/opd' },
  { icon: <ClipboardList size={20} />, label: 'Triage', path: '/hospital/triage' },
  { icon: <ListOrdered size={20} />, label: 'Queue', path: '/hospital/queue' },
  { icon: <HeartPulse size={20} />, label: 'Vitals & Alarm', path: '/hospital/vitals' },
  { icon: <Trash2 size={20} />, label: 'Data Retention', path: '/hospital/data-retention' },
  { icon: <UserCog size={20} />, label: 'Doctors', path: '/hospital/doctors' },
  { icon: <Building2 size={20} />, label: 'Departments', path: '/hospital/departments' },
];

function suggestDepartment(complaint: string, symptoms: string[] | null): string {
  const text = `${complaint} ${(symptoms || []).join(' ')}`.toLowerCase();
  if (/chest pain|breathlessness|cardiac|heart|palpitation/.test(text)) return 'Cardiology';
  if (/fracture|joint|bone|sprain|orthopedic|back pain|knee/.test(text)) return 'Orthopedics';
  if (/fever|cough|cold|flu|throat|body ache|viral/.test(text)) return 'General Medicine';
  if (/skin|rash|acne|dermat|eczema|allergy/.test(text)) return 'Dermatology';
  if (/child|pediatric|infant|baby/.test(text)) return 'Pediatrics';
  if (/eye|vision|glasses|blur|cataract/.test(text)) return 'Ophthalmology';
  if (/tooth|dental|gum|cavity/.test(text)) return 'Dentistry';
  if (/ear|nose|throat|sinus|hearing/.test(text)) return 'ENT';
  if (/pregnant|pregnancy|maternity|obstetric/.test(text)) return 'Obstetrics';
  if (/mental|anxiety|depression|stress|psych/.test(text)) return 'Psychiatry';
  return 'General Medicine';
}

function suggestPriority(severity: number, complaint: string): string {
  const text = complaint.toLowerCase();
  if (/chest pain/.test(text) && severity >= 7) return 'emergency';
  if (severity >= 8) return 'urgent';
  if (severity >= 5) return 'urgent';
  return 'normal';
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function Triage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<TriagePatient[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDept, setBulkDept] = useState('');
  const [mlResults, setMlResults] = useState<Record<number, MlResult>>({});
  const [mlLoading, setMlLoading] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalPatient, setModalPatient] = useState<TriagePatient | null>(null);
  const [modalDept, setModalDept] = useState('');
  const [modalPriority, setModalPriority] = useState('normal');
  const [modalNotes, setModalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const getHospitalId = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase.from('hospitals').select('id').eq('admin_id', user.id).single();
    return data?.id ?? null;
  }, [user]);

  useEffect(() => {
    (async () => {
      const hid = await getHospitalId();
      setHospitalId(hid);
    })();
  }, [getHospitalId]);

  const fetchData = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);

    const [visitsRes, deptRes] = await Promise.all([
      supabase
        .from('visits')
        .select(`
          id, token, chief_complaint, severity, status, department_name, department_id,
          doctor_id, doctor_name, priority, triage_notes, associated_symptoms, description,
          vitals, created_at,
          patient:patient_id (name)
        `)
        .eq('hospital_id', hospitalId)
        .in('status', ['booked', 'checked_in'])
        .order('token', { ascending: true }),
      supabase.from('departments').select('id, name').eq('hospital_id', hospitalId).eq('is_active', true),
    ]);

    if (visitsRes.data) {
      setPatients(
        visitsRes.data.map((v) => ({
          id: v.id,
          token: v.token,
          patient_name: (v.patient as unknown as { name: string })?.name || 'Unknown',
          chief_complaint: v.chief_complaint || 'No complaint',
          severity: v.severity || 0,
          status: v.status,
          department_name: v.department_name,
          department_id: v.department_id,
          doctor_id: v.doctor_id,
          doctor_name: v.doctor_name,
          priority: v.priority || 'normal',
          triage_notes: v.triage_notes,
          associated_symptoms: v.associated_symptoms,
          description: v.description,
          vitals: v.vitals,
          created_at: v.created_at,
        }))
      );
    }
    if (deptRes.data) setDepartments(deptRes.data);
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    if (hospitalId) fetchData();
  }, [hospitalId, fetchData]);

  const acceptSuggestion = async (patient: TriagePatient) => {
    const suggestedDept = suggestDepartment(patient.chief_complaint, patient.associated_symptoms);
    const suggestedPriority = suggestPriority(patient.severity, patient.chief_complaint);
    const dept = departments.find((d) => d.name.toLowerCase() === suggestedDept.toLowerCase());

    await supabase
      .from('visits')
      .update({
        department_id: dept?.id || null,
        department_name: dept?.name || suggestedDept,
        priority: suggestedPriority,
        status: 'confirmed',
      })
      .eq('id', patient.id);

    fetchData();
  };

  const openManualModal = (patient: TriagePatient) => {
    setModalPatient(patient);
    setModalDept(patient.department_id || '');
    setModalPriority(suggestPriority(patient.severity, patient.chief_complaint));
    setModalNotes(patient.triage_notes || '');
    setModalOpen(true);
  };

  const saveModalAssignment = async () => {
    if (!modalPatient) return;
    setSaving(true);
    const dept = departments.find((d) => d.id === modalDept);
    await supabase
      .from('visits')
      .update({
        department_id: modalDept || null,
        department_name: dept?.name || null,
        priority: modalPriority,
        triage_notes: modalNotes || null,
        status: modalDept ? 'confirmed' : modalPatient.status,
      })
      .eq('id', modalPatient.id);
    setSaving(false);
    setModalOpen(false);
    setModalPatient(null);
    fetchData();
  };

  const runMlScore = async (patient: TriagePatient) => {
    setMlLoading(patient.id);
    try {
      const complaint = patient.chief_complaint?.toLowerCase() || '';
      const vitals = (patient.vitals || {}) as Record<string, unknown>;
      const res = await advancedApi.predictPriority({
        age: Number(vitals?.age) || 40,
        spo2: vitals?.spo2 != null ? Number(vitals.spo2) : null,
        pulse: vitals?.pulse != null ? Number(vitals.pulse) : null,
        bp_systolic: vitals?.bp_systolic != null ? Number(vitals.bp_systolic) : null,
        bp_diastolic: vitals?.bp_diastolic != null ? Number(vitals.bp_diastolic) : null,
        temperature: vitals?.temperature != null ? Number(vitals.temperature) : null,
        red_flag_count: patient.severity >= 8 ? 1 : 0,
        critical_symptom_count: patient.severity >= 8 ? 1 : 0,
        has_chest_pain: /chest/.test(complaint),
        has_breathlessness: /breath/.test(complaint),
      });
      setMlResults((prev) => ({
        ...prev,
        [patient.id]: {
          priority_class: res.data.priority_class,
          priority_score: res.data.priority_score,
          confidence: res.data.confidence ?? 0,
          top_factors: res.data.top_factors,
        },
      }));
    } catch {
      /* backend unreachable — leave suggested priority */
    } finally {
      setMlLoading(null);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkAssign = async () => {
    if (!bulkDept || selectedIds.size === 0) return;
    const dept = departments.find((d) => d.id === bulkDept);
    await supabase
      .from('visits')
      .update({
        department_id: bulkDept,
        department_name: dept?.name || null,
        status: 'confirmed',
      })
      .in('id', Array.from(selectedIds));
    setSelectedIds(new Set());
    setBulkDept('');
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface-50">
      <Sidebar
        items={sidebarItems}
        currentPath={location.pathname}
        onNavigate={(path) => navigate(path)}
        onLogout={logout}
        user={user ? { name: user.full_name, role: 'Hospital Admin' } : undefined}
      />

      <main className="flex-1 lg:ml-64 overflow-y-auto">
        <Header
          title="Triage"
          subtitle={`${patients.length} patients awaiting triage`}
          notificationCount={patients.length}
          user={user ? { name: user.full_name, role: 'Admin' } : undefined}
        />

        <div className="p-4 sm:p-6 space-y-4">
          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <Card padding="sm" className="border-2 border-primary-200 bg-primary-50">
                <div className="flex items-center gap-4">
                  <Users size={18} className="text-primary-600" />
                  <span className="text-sm font-medium text-primary-800">
                    {selectedIds.size} patient{selectedIds.size > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex-1" />
                  <div className="w-48">
                    <Select
                      options={[
                        { value: '', label: 'Select Dept' },
                        ...departments.map((d) => ({ value: d.id, label: d.name })),
                      ]}
                      value={bulkDept}
                      onChange={setBulkDept}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!bulkDept}
                    onClick={bulkAssign}
                  >
                    Assign to All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {patients.length === 0 ? (
            <EmptyState
              icon={<CheckCircle size={24} />}
              title="All caught up!"
              description="No patients awaiting triage right now"
            />
          ) : (
            <motion.div {...fadeIn}>
              <Card padding="sm" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200">
                        <th className="py-3 px-2 w-10">
                          <input
                            type="checkbox"
                            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                            checked={selectedIds.size === patients.length && patients.length > 0}
                            onChange={() => {
                              if (selectedIds.size === patients.length) setSelectedIds(new Set());
                              else setSelectedIds(new Set(patients.map((p) => p.id)));
                            }}
                          />
                        </th>
                        {['Token', 'Patient', 'Complaint', 'Severity', 'Auto-Suggested Dept', 'Priority', 'Actions'].map((h) => (
                          <th key={h} className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map((patient) => {
                        const suggestedDept = suggestDepartment(patient.chief_complaint, patient.associated_symptoms);
                        const suggestedPriority = suggestPriority(patient.severity, patient.chief_complaint);
                        return (
                          <tr
                            key={patient.id}
                            className={`border-b border-surface-100 transition-colors ${
                              selectedIds.has(patient.id) ? 'bg-primary-50' : 'hover:bg-surface-50'
                            }`}
                          >
                            <td className="py-3 px-2">
                              <input
                                type="checkbox"
                                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                checked={selectedIds.has(patient.id)}
                                onChange={() => toggleSelect(patient.id)}
                              />
                            </td>
                            <td className="py-3 px-2 font-mono font-semibold text-primary-700">#{patient.token}</td>
                            <td className="py-3 px-2 font-medium text-surface-900">{patient.patient_name}</td>
                            <td className="py-3 px-2 text-surface-700 max-w-[200px] truncate">{patient.chief_complaint}</td>
                            <td className="py-3 px-2">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                  patient.severity >= 8
                                    ? 'bg-danger-100 text-danger-700'
                                    : patient.severity >= 5
                                    ? 'bg-warning-100 text-warning-700'
                                    : 'bg-success-100 text-success-700'
                                }`}
                              >
                                {patient.severity}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex flex-col gap-0.5">
                                <Badge variant="info" size="sm">{suggestedDept}</Badge>
                                <span className={`text-xs font-medium ${
                                  suggestedPriority === 'emergency' ? 'text-danger-600' :
                                  suggestedPriority === 'urgent' ? 'text-warning-600' : 'text-success-600'
                                }`}>
                                  → {suggestedPriority}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <Badge
                                variant={
                                  suggestedPriority === 'emergency' ? 'danger' :
                                  suggestedPriority === 'urgent' ? 'warning' : 'success'
                                }
                                size="sm"
                              >
                                {suggestedPriority}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={<CheckCircle size={14} />}
                                  onClick={() => acceptSuggestion(patient)}
                                >
                                  Accept
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={<Hand size={14} />}
                                  onClick={() => openManualModal(patient)}
                                >
                                  Manual
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  loading={mlLoading === patient.id}
                                  icon={<Sparkles size={14} />}
                                  onClick={() => runMlScore(patient)}
                                >
                                  ML
                                </Button>
                              </div>
                              {mlResults[patient.id] && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    variant={
                                      mlResults[patient.id].priority_class === 'critical' ? 'danger' :
                                      mlResults[patient.id].priority_class === 'high' ? 'warning' : 'success'
                                    }
                                    size="sm"
                                  >
                                    ML: {mlResults[patient.id].priority_class} · {mlResults[patient.id].priority_score}
                                  </Badge>
                                  <span className="text-[11px] text-surface-400 font-medium">
                                    {(mlResults[patient.id].confidence * 100).toFixed(0)}% conf
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {modalOpen && modalPatient && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="sticky top-0 bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900">Manual Triage</h2>
                  <p className="text-sm text-surface-500">Token #{modalPatient.token} — {modalPatient.patient_name}</p>
                </div>
                <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-3 bg-surface-50 rounded-lg">
                  <p className="text-xs text-surface-500">Chief Complaint</p>
                  <p className="text-sm font-medium text-surface-800">{modalPatient.chief_complaint}</p>
                  {modalPatient.description && (
                    <p className="text-sm text-surface-600 mt-1">{modalPatient.description}</p>
                  )}
                </div>

                <Select
                  label="Department"
                  options={[
                    { value: '', label: 'Select Department' },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                  value={modalDept}
                  onChange={setModalDept}
                />

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">Priority</label>
                  <div className="flex gap-3">
                    {['normal', 'urgent', 'emergency'].map((p) => (
                      <label
                        key={p}
                        className={`flex-1 text-center px-4 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm font-medium capitalize ${
                          modalPriority === p
                            ? p === 'emergency'
                              ? 'border-danger-500 bg-danger-50 text-danger-700'
                              : p === 'urgent'
                              ? 'border-warning-500 bg-warning-50 text-warning-700'
                              : 'border-success-500 bg-success-50 text-success-700'
                            : 'border-surface-200 text-surface-600 hover:bg-surface-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="modal_priority"
                          value={p}
                          checked={modalPriority === p}
                          onChange={() => setModalPriority(p)}
                          className="sr-only"
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Triage Notes</label>
                  <textarea
                    className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
                    rows={3}
                    placeholder="Notes..."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                  />
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={saving}
                  icon={<Save size={18} />}
                  onClick={saveModalAssignment}
                >
                  Save Triage
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
