import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  X,
  CalendarDays,
  ClipboardList,
  ListOrdered,
  UserCog,
  Building2,
  LayoutDashboard,
  HeartPulse,
  Trash2,
  ChevronRight,
  Save,
  User,
  FileText,
  Heart,
  Activity,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import {
  Sidebar,
  Header,
  Button,
  Input,
  Select,
  Card,
  Badge,
  EmptyState,
  LoadingSpinner,
  Modal,
} from '../../components/shared';

interface Visit {
  id: number;
  token: number;
  patient_id: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  patient_phone: string | null;
  chief_complaint: string;
  description: string | null;
  severity: number;
  status: string;
  priority: string;
  department_name: string;
  doctor_name: string | null;
  doctor_id: string | null;
  department_id: string | null;
  triage_notes: string | null;
  vitals: Record<string, unknown> | null;
  associated_symptoms: string[] | null;
  past_visits_count: number;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  full_name: string;
  specialization: string;
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

const statusBadge: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  booked: 'info',
  confirmed: 'info',
  checked_in: 'info',
  in_queue: 'warning',
  with_doctor: 'warning',
  completed: 'success',
  cancelled: 'neutral',
};

const priorityBadge: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  normal: 'success',
  urgent: 'warning',
  emergency: 'danger',
};

const fadeIn = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.25 },
};

export default function TodaysOPD() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const [assignDept, setAssignDept] = useState('');
  const [assignDoctor, setAssignDoctor] = useState('');
  const [assignPriority, setAssignPriority] = useState('normal');
  const [triageNotes, setTriageNotes] = useState('');
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
    const today = new Date().toISOString().split('T')[0];

    const [visitsRes, deptRes, doctorRes] = await Promise.all([
      supabase
        .from('visits')
        .select(`
          id, token, patient_id, chief_complaint, description, severity, status, priority,
          department_name, doctor_name, doctor_id, department_id, triage_notes, vitals,
          associated_symptoms, created_at,
          patient:patient_id (name, date_of_birth, gender, phone)
        `)
        .eq('hospital_id', hospitalId)
        .eq('visit_date', today)
        .order('token', { ascending: true }),
      supabase.from('departments').select('id, name').eq('hospital_id', hospitalId).eq('is_active', true),
      supabase.from('doctors').select('id, full_name, specialization').eq('hospital_id', hospitalId).eq('is_active', true),
    ]);

    if (visitsRes.data) {
      const enriched: Visit[] = await Promise.all(
        visitsRes.data.map(async (v) => {
          const { count } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', v.patient_id)
            .lt('id', v.id);
          const p = v.patient as unknown as { name: string; date_of_birth: string; gender: string; phone: string } | null;
          const dob = p?.date_of_birth ? new Date(p.date_of_birth) : null;
          const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
          return {
            id: v.id,
            token: v.token,
            patient_id: v.patient_id,
            patient_name: p?.name || 'Unknown',
            patient_age: age,
            patient_gender: p?.gender || null,
            patient_phone: p?.phone || null,
            chief_complaint: v.chief_complaint || 'No complaint',
            description: v.description,
            severity: v.severity || 0,
            status: v.status,
            priority: v.priority || 'normal',
            department_name: v.department_name || 'Unassigned',
            doctor_name: v.doctor_name,
            doctor_id: v.doctor_id,
            department_id: v.department_id,
            triage_notes: v.triage_notes,
            vitals: v.vitals,
            associated_symptoms: v.associated_symptoms,
            past_visits_count: count || 0,
            created_at: v.created_at,
          };
        })
      );
      setVisits(enriched);
    }

    if (deptRes.data) setDepartments(deptRes.data);
    if (doctorRes.data) setDoctors(doctorRes.data);
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    if (hospitalId) fetchData();
  }, [hospitalId, fetchData]);

  useEffect(() => {
    let result = visits;
    if (statusFilter) result = result.filter((v) => v.status === statusFilter);
    if (deptFilter) result = result.filter((v) => v.department_name === deptFilter);
    if (priorityFilter) result = result.filter((v) => v.priority === priorityFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.patient_name.toLowerCase().includes(q) ||
          v.chief_complaint.toLowerCase().includes(q) ||
          String(v.token).includes(q)
      );
    }
    setFilteredVisits(result);
  }, [visits, statusFilter, deptFilter, priorityFilter, searchQuery]);

  const openPanel = (visit: Visit) => {
    setSelectedVisit(visit);
    setAssignDept(visit.department_id || '');
    setAssignDoctor(visit.doctor_id || '');
    setAssignPriority(visit.priority || 'normal');
    setTriageNotes(visit.triage_notes || '');
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedVisit(null);
  };

  const saveAssignment = async () => {
    if (!selectedVisit) return;
    setSaving(true);
    const dept = departments.find((d) => d.id === assignDept);
    const doc = doctors.find((d) => d.id === assignDoctor);

    await supabase
      .from('visits')
      .update({
        department_id: assignDept || null,
        department_name: dept?.name || null,
        doctor_id: assignDoctor || null,
        doctor_name: doc?.full_name || null,
        priority: assignPriority,
        triage_notes: triageNotes || null,
        status: assignDept ? 'confirmed' : selectedVisit.status,
      })
      .eq('id', selectedVisit.id);

    setSaving(false);
    closePanel();
    fetchData();
  };

  const filteredDoctors = assignDept
    ? doctors.filter((d) => {
        const dept = departments.find((dep) => dep.id === assignDept);
        return !dept || d.specialization?.toLowerCase().includes(dept.name.toLowerCase()) || true;
      })
    : doctors;

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
          title="Today's OPD"
          subtitle={`${filteredVisits.length} patients today`}
          user={user ? { name: user.full_name, role: 'Admin' } : undefined}
        />

        <div className="p-4 sm:p-6 space-y-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card padding="sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search by name, complaint, or token..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search size={16} />}
                  />
                </div>
                <div className="w-40">
                  <Select
                    options={[
                      { value: '', label: 'All Status' },
                      { value: 'booked', label: 'Booked' },
                      { value: 'confirmed', label: 'Confirmed' },
                      { value: 'in_queue', label: 'In Queue' },
                      { value: 'with_doctor', label: 'With Doctor' },
                      { value: 'completed', label: 'Completed' },
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                  />
                </div>
                <div className="w-44">
                  <Select
                    options={[
                      { value: '', label: 'All Departments' },
                      ...departments.map((d) => ({ value: d.name, label: d.name })),
                    ]}
                    value={deptFilter}
                    onChange={setDeptFilter}
                  />
                </div>
                <div className="w-36">
                  <Select
                    options={[
                      { value: '', label: 'All Priority' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'urgent', label: 'Urgent' },
                      { value: 'emergency', label: 'Emergency' },
                    ]}
                    value={priorityFilter}
                    onChange={setPriorityFilter}
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {filteredVisits.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={24} />}
              title="No patients found"
              description="No visits match your filters for today"
            />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card padding="sm" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200">
                        {['Token', 'Patient', 'Age/Gender', 'Complaint', 'Severity', 'Status', 'Priority', 'Assigned To', ''].map((h) => (
                          <th key={h} className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVisits.map((visit) => (
                        <tr
                          key={visit.id}
                          className="border-b border-surface-100 hover:bg-surface-50 cursor-pointer transition-colors"
                          onClick={() => openPanel(visit)}
                        >
                          <td className="py-3 px-2 font-mono font-semibold text-primary-700">#{visit.token}</td>
                          <td className="py-3 px-2 font-medium text-surface-900">{visit.patient_name}</td>
                          <td className="py-3 px-2 text-surface-600">
                            {visit.patient_age ?? '-'} / {visit.patient_gender || '-'}
                          </td>
                          <td className="py-3 px-2 text-surface-700 max-w-[180px] truncate">{visit.chief_complaint}</td>
                          <td className="py-3 px-2">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                visit.severity >= 8
                                  ? 'bg-danger-100 text-danger-700'
                                  : visit.severity >= 5
                                  ? 'bg-warning-100 text-warning-700'
                                  : 'bg-success-100 text-success-700'
                              }`}
                            >
                              {visit.severity}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={statusBadge[visit.status] || 'neutral'} size="sm">
                              {visit.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={priorityBadge[visit.priority] || 'neutral'} size="sm">
                              {visit.priority}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-surface-600 text-xs">{visit.doctor_name || '-'}</td>
                          <td className="py-3 px-2">
                            <ChevronRight size={16} className="text-surface-400" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {panelOpen && selectedVisit && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
            />
            <motion.div
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="sticky top-0 bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900">Patient Details</h2>
                  <p className="text-sm text-surface-500">Token #{selectedVisit.token}</p>
                </div>
                <button onClick={closePanel} aria-label="Close" className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-100 text-surface-500">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <User size={24} className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900">{selectedVisit.patient_name}</h3>
                    <p className="text-sm text-surface-500">
                      {selectedVisit.patient_age ?? '-'} years, {selectedVisit.patient_gender || '-'} | {selectedVisit.patient_phone || 'No phone'}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-surface-50 rounded-lg">
                  <p className="text-xs font-medium text-surface-500 uppercase mb-1">Past Visits</p>
                  <p className="text-sm font-semibold text-surface-900">{selectedVisit.past_visits_count} previous visits</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-surface-900 mb-2 flex items-center gap-2">
                    <FileText size={16} /> Current Complaint
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-surface-500">Chief Complaint</p>
                      <p className="text-sm text-surface-800">{selectedVisit.chief_complaint}</p>
                    </div>
                    {selectedVisit.description && (
                      <div>
                        <p className="text-xs text-surface-500">Description</p>
                        <p className="text-sm text-surface-700">{selectedVisit.description}</p>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-surface-500">Severity</p>
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            selectedVisit.severity >= 8
                              ? 'bg-danger-100 text-danger-700'
                              : selectedVisit.severity >= 5
                              ? 'bg-warning-100 text-warning-700'
                              : 'bg-success-100 text-success-700'
                          }`}
                        >
                          {selectedVisit.severity}
                        </span>
                      </div>
                      {selectedVisit.associated_symptoms && selectedVisit.associated_symptoms.length > 0 && (
                        <div className="flex-1">
                          <p className="text-xs text-surface-500">Associated Symptoms</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedVisit.associated_symptoms.map((s) => (
                              <Badge key={s} variant="neutral" size="sm">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedVisit.vitals && Object.keys(selectedVisit.vitals).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-surface-900 mb-2 flex items-center gap-2">
                      <Heart size={16} /> Vitals
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedVisit.vitals).map(([key, val]) => (
                        <div key={key} className="p-2 bg-surface-50 rounded">
                          <p className="text-xs text-surface-500 capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="text-sm font-medium text-surface-800">{String(val)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-surface-200 pt-6">
                  <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                    <Activity size={16} /> Triage Actions
                  </h4>
                  <div className="space-y-4">
                    <Select
                      label="Assign Department"
                      options={[
                        { value: '', label: 'Select Department' },
                        ...departments.map((d) => ({ value: d.id, label: d.name })),
                      ]}
                      value={assignDept}
                      onChange={(val) => {
                        setAssignDept(val);
                        setAssignDoctor('');
                      }}
                    />
                    <Select
                      label="Assign Doctor"
                      options={[
                        { value: '', label: 'Select Doctor' },
                        ...filteredDoctors.map((d) => ({ value: d.id, label: `${d.full_name} (${d.specialization || 'General'})` })),
                      ]}
                      value={assignDoctor}
                      onChange={setAssignDoctor}
                    />
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-2">Priority</label>
                      <div className="flex gap-3">
                        {['normal', 'urgent', 'emergency'].map((p) => (
                          <label
                            key={p}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                              assignPriority === p
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
                              name="priority"
                              value={p}
                              checked={assignPriority === p}
                              onChange={() => setAssignPriority(p)}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium capitalize">{p}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">Triage Notes</label>
                      <textarea
                        className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
                        rows={3}
                        placeholder="Add triage notes..."
                        value={triageNotes}
                        onChange={(e) => setTriageNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      loading={saving}
                      icon={<Save size={18} />}
                      onClick={saveAssignment}
                    >
                      Save Assignment
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
