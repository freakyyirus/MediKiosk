import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, CalendarClock, CalendarCheck, CalendarX, ChevronDown,
  ChevronUp, MapPin, Stethoscope, Pill, FileText, Clock, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Sidebar, Header, Card, Button, LoadingSpinner, EmptyState, Badge } from '../../components/shared';
import { useToastStore } from '../../components/shared/Toast';
import { useT } from '../../lib/i18n';

interface VisitRecord {
  id: number;
  hospital_name: string;
  department_name: string;
  doctor_name: string;
  doctor_id: number | null;
  visit_date: string;
  visit_time: string;
  token_number: string;
  status: string;
  chief_complaint: string | null;
  description: string | null;
  pain_severity: number | null;
  associated_symptoms: string[] | null;
  current_medications: string | null;
  known_allergies: string | null;
  vitals: Record<string, string | null> | null;
  diagnosis: string | null;
  prescription: Record<string, unknown>[] | null;
  lab_tests: Record<string, unknown>[] | null;
  follow_up_date: string | null;
  created_at: string;
}

const NAV_ITEMS = [
  { icon: <ClipboardList size={20} />, label: 'Dashboard', path: '/patient/dashboard' },
  { icon: <CalendarClock size={20} />, label: 'Book OPD', path: '/patient/book-opd' },
  { icon: <ClipboardList size={20} />, label: 'My Visits', path: '/patient/visits' },
  { icon: <CalendarCheck size={20} />, label: 'Health Timeline', path: '/patient/health-timeline' },
  { icon: <FileText size={20} />, label: 'Documents', path: '/patient/documents' },
  { icon: <CalendarClock size={20} />, label: 'Profile', path: '/patient/profile' },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'info' | 'warning' | 'success' | 'danger' | 'neutral' }> = {
  booked: { label: 'Booked', variant: 'info' },
  confirmed: { label: 'Confirmed', variant: 'info' },
  in_queue: { label: 'In Queue', variant: 'warning' },
  with_doctor: { label: 'With Doctor', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

type TabType = 'upcoming' | 'past' | 'cancelled';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function MyVisits() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const t = useT();
  const addToast = useToastStore(s => s.addToast);

  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

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
      addToast('error', 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, [user?.id, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleNavigate = (path: string) => navigate(path);
  const handleLogout = () => { logout(); navigate('/'); };

  const today = new Date().toISOString().split('T')[0];

  const upcomingVisits = visits.filter(v =>
    ['booked', 'confirmed', 'in_queue', 'with_doctor'].includes(v.status) && v.visit_date >= today
  );
  const pastVisits = visits.filter(v =>
    v.status === 'completed' || (['booked', 'confirmed'].includes(v.status) && v.visit_date < today)
  );
  const cancelledVisits = visits.filter(v => v.status === 'cancelled');

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'upcoming', label: t('upcoming'), count: upcomingVisits.length },
    { key: 'past', label: t('past'), count: pastVisits.length },
    { key: 'cancelled', label: t('cancelled'), count: cancelledVisits.length },
  ];

  const activeVisits = activeTab === 'upcoming' ? upcomingVisits : activeTab === 'past' ? pastVisits : cancelledVisits;

  const handleCancel = async (visitId: number) => {
    setCancellingId(visitId);
    try {
      const visit = visits.find(v => v.id === visitId);
      const { error } = await supabase.from('visits').update({ status: 'cancelled' }).eq('id', visitId);
      if (error) throw error;

      if (visit?.doctor_id && visit.visit_date && visit.visit_time) {
        try {
          const { data: slot } = await supabase
            .from('opd_slots')
            .select('id, current_tokens')
            .eq('doctor_id', visit.doctor_id)
            .eq('slot_date', visit.visit_date)
            .eq('slot_time', visit.visit_time)
            .single();
          if (slot) {
            await supabase
              .from('opd_slots')
              .update({ current_tokens: Math.max(0, (slot.current_tokens || 0) - 1) })
              .eq('id', slot.id);
          }
        } catch (slotErr) {
          console.error('Failed to release slot token:', slotErr);
        }
      }

      setVisits(prev => prev.map(v => v.id === visitId ? { ...v, status: 'cancelled' } : v));
      addToast('success', 'Visit cancelled successfully');
    } catch {
      addToast('error', 'Failed to cancel visit');
    } finally {
      setCancellingId(null);
    }
  };

  const renderVisitCard = (visit: VisitRecord) => {
    const isExpanded = expandedId === visit.id;
    const statusConf = STATUS_CONFIG[visit.status] || { label: visit.status, variant: 'neutral' as const };
    return (
      <motion.div key={visit.id} layout {...fadeUp}>
        <Card className="overflow-hidden">
          <button
            className="w-full text-left"
            onClick={() => setExpandedId(isExpanded ? null : visit.id)}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary-50 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] text-primary-600 font-medium leading-none">
                  {new Date(visit.visit_date).toLocaleDateString('en-IN', { month: 'short' })}
                </span>
                <span className="text-lg font-bold text-primary-700 leading-tight">
                  {new Date(visit.visit_date).getDate()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-surface-900">{visit.hospital_name}</h3>
                  <Badge variant={statusConf.variant} size="sm">{statusConf.label}</Badge>
                </div>
                <p className="text-sm text-surface-500 mt-0.5">
                  {visit.department_name} · Dr. {visit.doctor_name}
                </p>
                <p className="text-xs text-surface-400 mt-0.5">
                  {new Date(visit.visit_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {visit.visit_time}
                </p>
                {visit.chief_complaint && (
                  <p className="text-sm text-surface-600 mt-1 truncate">{visit.chief_complaint}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="bg-primary-100 px-3 py-1.5 rounded-lg text-center">
                  <p className="text-[10px] text-primary-600 font-medium">TOKEN</p>
                  <p className="text-sm font-bold text-primary-700">{visit.token_number}</p>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-surface-400" /> : <ChevronDown size={16} className="text-surface-400" />}
              </div>
            </div>
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-surface-200 space-y-4">
                  {visit.description && (
                    <div>
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-surface-700">{visit.description}</p>
                    </div>
                  )}
                  {visit.pain_severity !== null && (
                    <div>
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Pain Severity</p>
                      <p className="text-sm text-surface-700">{visit.pain_severity}/10</p>
                    </div>
                  )}
                  {visit.associated_symptoms && visit.associated_symptoms.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Associated Symptoms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {visit.associated_symptoms.map(s => (
                          <span key={s} className="px-2 py-0.5 bg-surface-100 text-surface-600 text-xs rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {visit.vitals && Object.values(visit.vitals).some(Boolean) && (
                    <div>
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Vitals</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {visit.vitals.bp && <div><span className="text-surface-400">BP:</span> <span className="text-surface-700">{visit.vitals.bp}</span></div>}
                        {visit.vitals.pulse && <div><span className="text-surface-400">Pulse:</span> <span className="text-surface-700">{visit.vitals.pulse}</span></div>}
                        {visit.vitals.temperature && <div><span className="text-surface-400">Temp:</span> <span className="text-surface-700">{visit.vitals.temperature}°C</span></div>}
                        {visit.vitals.spo2 && <div><span className="text-surface-400">SpO2:</span> <span className="text-surface-700">{visit.vitals.spo2}%</span></div>}
                        {visit.vitals.weight && <div><span className="text-surface-400">Weight:</span> <span className="text-surface-700">{visit.vitals.weight}kg</span></div>}
                      </div>
                    </div>
                  )}
                  {visit.current_medications && (
                    <div>
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Current Medications</p>
                      <p className="text-sm text-surface-700">{visit.current_medications}</p>
                    </div>
                  )}
                  {visit.known_allergies && (
                    <div>
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Known Allergies</p>
                      <p className="text-sm text-surface-700">{visit.known_allergies}</p>
                    </div>
                  )}
                  {visit.status === 'completed' && (
                    <>
                      {visit.diagnosis && (
                        <div className="p-3 bg-success-50 rounded-xl border border-success-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Stethoscope size={14} className="text-success-600" />
                            <p className="text-xs font-semibold text-success-700 uppercase tracking-wide">Diagnosis</p>
                          </div>
                          <p className="text-sm text-success-800">{visit.diagnosis}</p>
                        </div>
                      )}
                      {visit.prescription && visit.prescription.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Pill size={14} className="text-primary-600" />
                            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Prescription</p>
                          </div>
                          <div className="space-y-1">
                            {visit.prescription.map((p, i) => (
                              <div key={i} className="text-sm text-surface-700 bg-surface-50 rounded-lg px-3 py-1.5">
                                {typeof p === 'object' && p !== null ? `${(p as Record<string, string>).medicine || ''} — ${(p as Record<string, string>).dosage || ''}` : String(p)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {visit.follow_up_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarClock size={14} className="text-warning-600" />
                          <span className="text-surface-500">Follow-up:</span>
                          <span className="font-medium text-surface-900">{new Date(visit.follow_up_date).toLocaleDateString('en-IN')}</span>
                        </div>
                      )}
                    </>
                  )}
                  {['booked', 'confirmed'].includes(visit.status) && visit.visit_date >= today && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="danger"
                        size="sm"
                        loading={cancellingId === visit.id}
                        onClick={(e) => { e.stopPropagation(); handleCancel(visit.id); }}
                        icon={<X size={14} />}
                      >
                        {t('cancelVisit')}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar
        items={NAV_ITEMS}
        currentPath="/patient/visits"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={{ name: 'Patient', role: 'Patient' }}
      />
      <div className="lg:ml-64 min-h-screen flex flex-col pl-14 lg:pl-0">
        <Header
          title={t('myVisitsTitle')}
          subtitle="View and manage your appointments"
          user={{ name: 'Patient', role: 'Patient' }}
        />
        <main className="flex-1 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-white text-surface-600 hover:bg-surface-100 border border-surface-200'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key ? 'bg-white/20' : 'bg-surface-100'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : activeVisits.length === 0 ? (
            <EmptyState
              icon={activeTab === 'upcoming' ? <CalendarClock size={24} /> : activeTab === 'past' ? <CalendarCheck size={24} /> : <CalendarX size={24} />}
              title={activeTab === 'upcoming' ? t('noUpcoming') : activeTab === 'past' ? t('noPast') : t('noCancelled')}
              action={activeTab === 'upcoming' ? { label: t('bookOpd'), onClick: () => navigate('/patient/book-opd') } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {activeVisits.map(v => renderVisitCard(v))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
