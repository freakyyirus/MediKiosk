import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Calendar, Building2, Stethoscope, Search, Filter, Plus,
  ChevronDown, ChevronUp, Upload, X, Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Sidebar, Header, Card, Button, Input, Select, LoadingSpinner, EmptyState, Modal } from '../../components/shared';
import { useToastStore } from '../../components/shared/Toast';

interface VisitRecord {
  id: number;
  hospital_name: string;
  department_name: string;
  doctor_name: string;
  visit_date: string;
  visit_time: string;
  token_number: string;
  status: string;
  chief_complaint: string | null;
  description: string | null;
  pain_severity: number | null;
  diagnosis: string | null;
  current_medications: string | null;
  vitals: Record<string, string | null> | null;
  is_manual_entry: boolean | null;
  created_at: string;
}

interface DepartmentOption {
  id: number;
  name: string;
  color_code: string | null;
}

const NAV_ITEMS = [
  { icon: <Heart size={20} />, label: 'Dashboard', path: '/patient/dashboard' },
  { icon: <Calendar size={20} />, label: 'Book OPD', path: '/patient/book-opd' },
  { icon: <Heart size={20} />, label: 'My Visits', path: '/patient/visits' },
  { icon: <Heart size={20} />, label: 'Health Timeline', path: '/patient/health-timeline' },
  { icon: <Heart size={20} />, label: 'Documents', path: '/patient/documents' },
  { icon: <Heart size={20} />, label: 'Profile', path: '/patient/profile' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  booked: { label: 'Booked', color: 'bg-primary-500' },
  confirmed: { label: 'Confirmed', color: 'bg-indigo-500' },
  in_queue: { label: 'In Queue', color: 'bg-warning-500' },
  with_doctor: { label: 'With Doctor', color: 'bg-orange-500' },
  completed: { label: 'Completed', color: 'bg-success-500' },
  cancelled: { label: 'Cancelled', color: 'bg-danger-500' },
};

const DEPT_COLORS: Record<string, string> = {
  'Cardiology': '#ef4444',
  'Neurology': '#8b5cf6',
  'Orthopedics': '#f59e0b',
  'Dermatology': '#ec4899',
  'Pulmonology': '#3b82f6',
  'Gastroenterology': '#10b981',
  'General Medicine': '#6366f1',
  'ENT': '#14b8a6',
  'Ophthalmology': '#f97316',
  'Dental': '#06b6d4',
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function HealthTimeline() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const addToast = useToastStore(s => s.addToast);

  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    hospital_name: '',
    department_name: '',
    doctor_name: '',
    visit_date: '',
    chief_complaint: '',
    diagnosis: '',
    medications: '',
    notes: '',
  });
  const [addFiles, setAddFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('patient_id', user.id)
        .order('visit_date', { ascending: false });
      if (error) throw error;
      setVisits((data || []) as VisitRecord[]);
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to load health timeline');
    } finally {
      setLoading(false);
    }
  }, [user?.id, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleNavigate = (path: string) => navigate(path);
  const handleLogout = () => { logout(); navigate('/'); };

  const departments = Array.from(new Set(visits.map(v => v.department_name))).sort();

  const filteredVisits = visits.filter(v => {
    if (filterDept && v.department_name !== filterDept) return false;
    if (dateFrom && v.visit_date < dateFrom) return false;
    if (dateTo && v.visit_date > dateTo) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (v.diagnosis || '').toLowerCase().includes(q) ||
        (v.chief_complaint || '').toLowerCase().includes(q) ||
        (v.hospital_name || '').toLowerCase().includes(q) ||
        (v.doctor_name || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleAddPastVisit = async () => {
    if (!addForm.hospital_name || !addForm.visit_date || !addForm.chief_complaint || !user?.id) {
      addToast('warning', 'Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      const { data: inserted, error } = await supabase.from('visits').insert({
        patient_id: user.id,
        hospital_name: addForm.hospital_name,
        department_name: addForm.department_name,
        doctor_name: addForm.doctor_name,
        visit_date: addForm.visit_date,
        chief_complaint: addForm.chief_complaint,
        diagnosis: addForm.diagnosis,
        current_medications: addForm.medications,
        description: addForm.notes,
        status: 'completed',
        is_manual_entry: true,
        token_number: 'MANUAL',
      }).select('id').single();
      if (error) throw error;

      if (addFiles.length > 0) {
        const visitId = (inserted as { id: number } | null)?.id;
        try {
          await Promise.all(addFiles.map(async (file) => {
            const filePath = `documents/${user.id}/${Date.now()}-${file.name}`;
            const { error: upErr } = await supabase.storage
              .from('patient-documents')
              .upload(filePath, file);
            if (upErr) throw upErr;
            const { error: insErr } = await supabase.from('documents').insert({
              patient_id: user.id,
              session_id: visitId ?? null,
              file_name: file.name,
              file_size_bytes: file.size,
              mime_type: file.type,
              document_type: 'other',
              document_date: addForm.visit_date,
              hospital_name: addForm.hospital_name || null,
              doctor_name: addForm.doctor_name ? `Dr. ${addForm.doctor_name}` : null,
              processing_status: 'pending',
            });
            if (insErr) throw insErr;
          }));
        } catch (fileErr) {
          console.error('Past-visit document upload failed:', fileErr);
          addToast('warning', 'Visit saved, but some documents could not be uploaded.');
        }
      }

      addToast('success', 'Past visit added successfully');
      setShowAddModal(false);
      setAddForm({ hospital_name: '', department_name: '', doctor_name: '', visit_date: '', chief_complaint: '', diagnosis: '', medications: '', notes: '' });
      setAddFiles([]);
      fetchData();
    } catch {
      addToast('error', 'Failed to add past visit');
    } finally {
      setSaving(false);
    }
  };

  const getDeptColor = (deptName: string) => DEPT_COLORS[deptName] || '#6366f1';

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar
        items={NAV_ITEMS}
        currentPath="/patient/health-timeline"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={{ name: 'Patient', role: 'Patient' }}
      />
      <div className="lg:ml-64 min-h-screen flex flex-col pl-14 lg:pl-0">
        <Header
          title="Health Timeline"
          subtitle="Your visual health journey"
          actions={
            <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={() => setShowAddModal(true)}>
              Add Past Visit
            </Button>
          }
          user={{ name: 'Patient', role: 'Patient' }}
        />
        <main className="flex-1 p-4 sm:p-6">
          <motion.div {...fadeUp} className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <Input
                  placeholder="Search by diagnosis, complaint, doctor..."
                  icon={<Search size={18} />}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                options={[
                  { value: '', label: 'All Departments' },
                  ...departments.map(d => ({ value: d, label: d })),
                ]}
                value={filterDept}
                onChange={setFilterDept}
                placeholder="Department"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="flex-1 rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="flex-1 rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : filteredVisits.length === 0 ? (
            <EmptyState
              icon={<Heart size={24} />}
              title="No visits found"
              description="Your health timeline will appear here. Try adjusting filters or add a past visit."
              action={{ label: 'Add Past Visit', onClick: () => setShowAddModal(true) }}
            />
          ) : (
            <div className="relative">
              <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-surface-200" />

              <div className="space-y-6">
                {filteredVisits.map((visit, idx) => {
                  const isExpanded = expandedId === visit.id;
                  const deptColor = getDeptColor(visit.department_name);
                  const statusConf = STATUS_CONFIG[visit.status] || { label: visit.status, color: 'bg-surface-400' };
                  return (
                    <motion.div
                      key={visit.id}
                      {...fadeUp}
                      transition={{ delay: idx * 0.05 }}
                      className="relative pl-14 sm:pl-16"
                    >
                      <div
                        className="absolute left-3.5 sm:left-5.5 w-5 h-5 rounded-full border-4 border-white shadow-md z-10"
                        style={{ backgroundColor: deptColor, top: '1.25rem' }}
                      />

                      <button
                        className="w-full text-left"
                        onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                      >
                        <Card className="hover:shadow-md transition-shadow" hover={false}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-surface-900">{visit.hospital_name}</h3>
                                <span className={`w-2 h-2 rounded-full ${statusConf.color}`} />
                                <span className="text-xs text-surface-500">{statusConf.label}</span>
                                {visit.is_manual_entry && (
                                  <span className="text-[10px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-full">Manual</span>
                                )}
                              </div>
                              <p className="text-sm text-surface-500 mt-0.5 flex items-center gap-1">
                                <Building2 size={13} /> {visit.department_name}
                                {visit.doctor_name && <><span className="mx-1">·</span><Stethoscope size={13} /> Dr. {visit.doctor_name}</>}
                              </p>
                              {visit.chief_complaint && (
                                <p className="text-sm text-surface-700 mt-1">{visit.chief_complaint}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-surface-400 flex items-center gap-1 justify-end">
                                <Calendar size={12} />
                                {new Date(visit.visit_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              {isExpanded ? <ChevronUp size={16} className="text-surface-400 mt-1 ml-auto" /> : <ChevronDown size={16} className="text-surface-400 mt-1 ml-auto" />}
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 pt-4 border-t border-surface-200 space-y-3">
                                  {visit.diagnosis && (
                                    <div className="p-3 bg-success-50 rounded-xl border border-success-200">
                                      <p className="text-xs font-semibold text-success-700 uppercase tracking-wide mb-1">Diagnosis</p>
                                      <p className="text-sm text-success-800">{visit.diagnosis}</p>
                                    </div>
                                  )}
                                  {visit.vitals && Object.values(visit.vitals).some(Boolean) && (
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                      {visit.vitals.bp && <div><span className="text-surface-400">BP:</span> <span className="text-surface-700">{visit.vitals.bp}</span></div>}
                                      {visit.vitals.pulse && <div><span className="text-surface-400">Pulse:</span> <span className="text-surface-700">{visit.vitals.pulse}</span></div>}
                                      {visit.vitals.temperature && <div><span className="text-surface-400">Temp:</span> <span className="text-surface-700">{visit.vitals.temperature}°C</span></div>}
                                    </div>
                                  )}
                                  {visit.current_medications && (
                                    <div>
                                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Medications</p>
                                      <p className="text-sm text-surface-700">{visit.current_medications}</p>
                                    </div>
                                  )}
                                  {visit.description && (
                                    <div>
                                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Notes</p>
                                      <p className="text-sm text-surface-700">{visit.description}</p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Past Visit" size="lg">
        <div className="space-y-4">
          <Input
            label="Hospital Name"
            required
            value={addForm.hospital_name}
            onChange={e => setAddForm(f => ({ ...f, hospital_name: e.target.value }))}
            placeholder="e.g., AIIMS Delhi"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department"
              value={addForm.department_name}
              onChange={e => setAddForm(f => ({ ...f, department_name: e.target.value }))}
              placeholder="e.g., Cardiology"
            />
            <Input
              label="Doctor Name"
              value={addForm.doctor_name}
              onChange={e => setAddForm(f => ({ ...f, doctor_name: e.target.value }))}
              placeholder="e.g., Dr. Sharma"
            />
          </div>
          <Input
            label="Visit Date"
            required
            type="date"
            value={addForm.visit_date}
            onChange={e => setAddForm(f => ({ ...f, visit_date: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Chief Complaint <span className="text-danger-500">*</span>
            </label>
            <input
              value={addForm.chief_complaint}
              onChange={e => setAddForm(f => ({ ...f, chief_complaint: e.target.value }))}
              placeholder="What was the main reason for the visit?"
              className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Diagnosis</label>
            <input
              value={addForm.diagnosis}
              onChange={e => setAddForm(f => ({ ...f, diagnosis: e.target.value }))}
              placeholder="What was the diagnosis?"
              className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Medications</label>
            <textarea
              value={addForm.medications}
              onChange={e => setAddForm(f => ({ ...f, medications: e.target.value }))}
              rows={2}
              placeholder="Any prescribed medications..."
              className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Notes</label>
            <textarea
              value={addForm.notes}
              onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Upload Documents</label>
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-surface-300 rounded-xl cursor-pointer hover:bg-surface-50 transition-colors">
              <Upload size={18} className="text-surface-400" />
              <span className="text-xs text-surface-500">Click to upload files</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={e => {
                  if (e.target.files) setAddFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                }}
              />
            </label>
            {addFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {addFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface-50 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-surface-700 truncate">{f.name}</span>
                    <button onClick={() => setAddFiles(prev => prev.filter((_, j) => j !== i))} className="text-danger-500 ml-2"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handleAddPastVisit} loading={saving} className="flex-1">
              Save Visit
            </Button>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
