import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  HeartPulse,
  Trash2,
  CalendarDays,
  ClipboardList,
  ListOrdered,
  UserCog,
  Building2,
  Play,
  SkipForward,
  CheckCircle2,
  Bell,
  Clock,
  Users,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
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
} from '../../components/shared';

interface Department {
  id: string;
  name: string;
}

interface QueueEntry {
  id: number;
  visit_id: number;
  token: number;
  patient_name: string;
  priority: string;
  status: string;
  queued_at: string;
  called_at: string | null;
  wait_time: number;
  queue_position: number;
}

interface QueueSummary {
  waiting: number;
  called: number;
  in_consultation: number;
  completed: number;
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

const priorityRowColor: Record<string, string> = {
  emergency: 'bg-danger-50 border-l-4 border-l-danger-500',
  urgent: 'bg-warning-50 border-l-4 border-l-warning-500',
  normal: 'bg-success-50 border-l-4 border-l-success-500',
};

const priorityBadge: Record<string, 'danger' | 'warning' | 'success'> = {
  emergency: 'danger',
  urgent: 'warning',
  normal: 'success',
};

const statusBadge: Record<string, 'info' | 'warning' | 'success' | 'neutral'> = {
  waiting: 'info',
  called: 'warning',
  in_consultation: 'warning',
  completed: 'success',
};

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function QueueManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDept, setActiveDept] = useState<string>('');
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [summary, setSummary] = useState<QueueSummary>({ waiting: 0, called: 0, in_consultation: 0, completed: 0 });
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const fetchDepartments = useCallback(async () => {
    if (!hospitalId) return;
    const { data } = await supabase
      .from('departments')
      .select('id, name')
      .eq('hospital_id', hospitalId)
      .eq('is_active', true);
    if (data) {
      setDepartments(data);
      if (data.length > 0 && !activeDept) setActiveDept(data[0].id);
    }
  }, [hospitalId, activeDept]);

  const fetchQueue = useCallback(async () => {
    if (!hospitalId || !activeDept) return;

    const today = new Date().toISOString().split('T')[0];

    const [queueRes, summaryRes] = await Promise.all([
      supabase
        .from('queue_entries')
        .select(`
          id, visit_id, token, patient_name, priority, status, queued_at, called_at,
          visit:visit_id (status)
        `)
        .eq('hospital_id', hospitalId)
        .eq('department_id', activeDept)
        .eq('queue_date', today)
        .order('priority', { ascending: false })
        .order('queued_at', { ascending: true }),
      supabase
        .from('queue_entries')
        .select('status')
        .eq('hospital_id', hospitalId)
        .eq('department_id', activeDept)
        .eq('queue_date', today),
    ]);

    if (queueRes.data) {
      let position = 1;
      const entries: QueueEntry[] = queueRes.data.map((e) => {
        const queued = new Date(e.queued_at);
        const waitMin = Math.floor((Date.now() - queued.getTime()) / 60000);
        const entry: QueueEntry = {
          id: e.id,
          visit_id: e.visit_id,
          token: e.token,
          patient_name: e.patient_name || 'Unknown',
          priority: e.priority || 'normal',
          status: e.status,
          queued_at: e.queued_at,
          called_at: e.called_at,
          wait_time: waitMin,
          queue_position: position,
        };
        if (e.status === 'waiting') position++;
        return entry;
      });
      setQueueEntries(entries);
    }

    if (summaryRes.data) {
      const all = summaryRes.data;
      setSummary({
        waiting: all.filter((e) => e.status === 'waiting').length,
        called: all.filter((e) => e.status === 'called').length,
        in_consultation: all.filter((e) => e.status === 'in_consultation').length,
        completed: all.filter((e) => e.status === 'completed').length,
      });
    }
  }, [hospitalId, activeDept]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (hospitalId && activeDept) {
      setLoading(true);
      fetchQueue().then(() => setLoading(false));
    }
  }, [hospitalId, activeDept, fetchQueue]);

  useEffect(() => {
    intervalRef.current = setInterval(fetchQueue, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQueue]);

  const callNext = async () => {
    const nextWaiting = queueEntries.find((e) => e.status === 'waiting');
    if (!nextWaiting) return;

    await Promise.all([
      supabase
        .from('queue_entries')
        .update({ status: 'called', called_at: new Date().toISOString() })
        .eq('id', nextWaiting.id),
      supabase
        .from('visits')
        .update({ status: 'with_doctor' })
        .eq('id', nextWaiting.visit_id),
    ]);

    fetchQueue();
  };

  const callPatient = async (entry: QueueEntry) => {
    await supabase
      .from('queue_entries')
      .update({ status: 'called', called_at: new Date().toISOString() })
      .eq('id', entry.id);
    await supabase.from('visits').update({ status: 'with_doctor' }).eq('id', entry.visit_id);
    fetchQueue();
  };

  const skipPatient = async (entry: QueueEntry) => {
    await supabase
      .from('queue_entries')
      .update({ status: 'waiting', called_at: null })
      .eq('id', entry.id);
    fetchQueue();
  };

  const completePatient = async (entry: QueueEntry) => {
    await Promise.all([
      supabase.from('queue_entries').update({ status: 'completed' }).eq('id', entry.id),
      supabase.from('visits').update({ status: 'completed' }).eq('id', entry.visit_id),
    ]);
    fetchQueue();
  };

  const nextWaiting = queueEntries.find((e) => e.status === 'waiting');
  const currentServing = queueEntries.find((e) => e.status === 'called' || e.status === 'in_consultation');

  if (loading && departments.length === 0) {
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
          title="Queue Management"
          subtitle={departments.find((d) => d.id === activeDept)?.name || 'Select a department'}
          user={user ? { name: user.full_name, role: 'Admin' } : undefined}
        />

        <div className="p-4 sm:p-6 space-y-6">
          {departments.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setActiveDept(dept.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeDept === dept.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
                  }`}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          )}

          <motion.div {...fadeIn}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card padding="sm" className="text-center">
                <p className="text-2xl font-bold text-primary-600">{summary.waiting}</p>
                <p className="text-xs text-surface-500 mt-1">Waiting</p>
              </Card>
              <Card padding="sm" className="text-center">
                <p className="text-2xl font-bold text-warning-600">{summary.called}</p>
                <p className="text-xs text-surface-500 mt-1">Called</p>
              </Card>
              <Card padding="sm" className="text-center">
                <p className="text-2xl font-bold text-orange-600">{summary.in_consultation}</p>
                <p className="text-xs text-surface-500 mt-1">In Consultation</p>
              </Card>
              <Card padding="sm" className="text-center">
                <p className="text-2xl font-bold text-success-600">{summary.completed}</p>
                <p className="text-xs text-surface-500 mt-1">Completed</p>
              </Card>
            </div>
          </motion.div>

          <motion.div {...fadeIn}>
            <Card>
              {currentServing ? (
                <div className="text-center py-6">
                  <p className="text-sm text-surface-500 uppercase font-medium mb-2">Now Serving</p>
                  <p className="text-6xl font-bold text-primary-600 font-mono">#{currentServing.token}</p>
                  <p className="text-lg text-surface-700 mt-2">{currentServing.patient_name}</p>
                  <Badge variant={priorityBadge[currentServing.priority] || 'neutral'} size="md">
                    {currentServing.priority}
                  </Badge>
                </div>
              ) : nextWaiting ? (
                <div className="text-center py-6">
                  <p className="text-sm text-surface-500 uppercase font-medium mb-2">Next Patient</p>
                  <p className="text-5xl font-bold text-surface-300 font-mono">#{nextWaiting.token}</p>
                  <p className="text-surface-500 mt-2">{nextWaiting.patient_name}</p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-surface-400">Queue is empty</p>
                </div>
              )}

              <div className="flex justify-center mt-4">
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Bell size={20} />}
                  disabled={!nextWaiting}
                  onClick={callNext}
                  className="min-w-[200px]"
                >
                  Call Next
                </Button>
              </div>
            </Card>
          </motion.div>

          <motion.div {...fadeIn}>
            <Card padding="sm">
              <h3 className="text-lg font-semibold text-surface-900 mb-3">Queue List</h3>
              {queueEntries.length === 0 ? (
                <EmptyState
                  icon={<ListOrdered size={24} />}
                  title="No patients in queue"
                  description="Patients will appear here as they join the queue"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200">
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">#</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">Token</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">Patient</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">Priority</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">Wait Time</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">Status</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {queueEntries.map((entry) => (
                          <motion.tr
                            key={entry.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`border-b border-surface-100 ${priorityRowColor[entry.priority] || ''} ${
                              entry.status === 'completed' ? 'opacity-50' : ''
                            }`}
                          >
                            <td className="py-3 px-2 font-medium text-surface-500">{entry.queue_position}</td>
                            <td className="py-3 px-2 font-mono font-bold text-primary-700">#{entry.token}</td>
                            <td className="py-3 px-2 font-medium text-surface-900">{entry.patient_name}</td>
                            <td className="py-3 px-2">
                              <Badge variant={priorityBadge[entry.priority] || 'neutral'} size="sm">
                                {entry.priority}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-surface-600">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {entry.wait_time}m
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={statusBadge[entry.status] || 'neutral'} size="sm">
                                {entry.status.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              {entry.status === 'waiting' && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<Play size={12} />}
                                    onClick={() => callPatient(entry)}
                                  >
                                    Call
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={<SkipForward size={12} />}
                                    onClick={() => skipPatient(entry)}
                                  >
                                    Skip
                                  </Button>
                                </div>
                              )}
                              {(entry.status === 'called' || entry.status === 'in_consultation') && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={<CheckCircle2 size={12} />}
                                  onClick={() => completePatient(entry)}
                                >
                                  Complete
                                </Button>
                              )}
                              {entry.status === 'completed' && (
                                <span className="text-xs text-surface-400">Done</span>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
