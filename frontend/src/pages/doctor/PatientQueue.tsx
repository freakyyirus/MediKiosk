import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Stethoscope, Clock, Phone, AlertTriangle,
  ChevronRight, User, Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores';
import { Sidebar, Header, Card, LoadingSpinner, EmptyState, Button, Badge } from '../../components/shared';

interface DoctorProfile {
  id: string;
  name: string;
  specialization: string | null;
}

interface QueueEntry {
  visit_id: string;
  token_number: number;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  chief_complaint: string;
  priority: 'normal' | 'urgent' | 'emergency';
  status: 'waiting' | 'in_progress' | 'completed';
  queued_at: string;
  phone: string | null;
}

const sidebarItems = [
  { label: 'Dashboard', path: '/doctor/dashboard' },
  { label: 'My Patients', path: '/doctor/queue' },
  { label: 'Schedule', path: '/doctor/schedule' },
  { label: 'Profile', path: '/doctor/profile' },
];

const priorityOrder: Record<string, number> = {
  emergency: 0,
  urgent: 1,
  normal: 2,
};

const priorityVariant: Record<string, 'danger' | 'warning' | 'success'> = {
  emergency: 'danger',
  urgent: 'warning',
  normal: 'success',
};

export default function PatientQueue() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [patients, setPatients] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const fetchQueue = useCallback(async () => {
    if (!doctor?.id) return;

    const today = new Date().toISOString().split('T')[0];

    const { data: visits } = await supabase
      .from('visits')
      .select(`
        id, token_number, chief_complaint, priority, status, queued_at,
        patients(name, date_of_birth, gender, phone)
      `)
      .eq('doctor_id', doctor.id)
      .eq('visit_date', today)
      .in('status', ['waiting', 'in_progress', 'completed'])
      .order('priority', { ascending: true })
      .order('token_number', { ascending: true });

    if (!visits) return;

    const entries: QueueEntry[] = visits.map((v: any) => ({
      visit_id: v.id,
      token_number: v.token_number || 0,
      patient_name: v.patients?.name || 'Unknown Patient',
      patient_age: calculateAge(v.patients?.date_of_birth),
      patient_gender: v.patients?.gender || null,
      chief_complaint: v.chief_complaint || '',
      priority: v.priority || 'normal',
      status: v.status || 'waiting',
      queued_at: v.queued_at,
      phone: v.patients?.phone || null,
    }));

    entries.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (b.status === 'completed' && a.status !== 'completed') return -1;
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return a.token_number - b.token_number;
    });

    setPatients(entries);
  }, [doctor?.id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!user?.id) return;
        const { data: doc } = await supabase
          .from('doctors')
          .select('id, name, specialization')
          .eq('user_id', user.id)
          .single();

        if (doc) {
          setDoctor(doc as DoctorProfile);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    if (!doctor) return;
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, [doctor, fetchQueue]);

  const handleCallNext = async () => {
    const nextWaiting = patients.find((p) => p.status === 'waiting');
    if (!nextWaiting) return;

    await supabase
      .from('visits')
      .update({ status: 'in_progress' })
      .eq('id', nextWaiting.visit_id);

    fetchQueue();
    navigate(`/doctor/patient/${nextWaiting.visit_id}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatWaitTime = (queuedAt: string) => {
    const diff = (Date.now() - new Date(queuedAt).getTime()) / 60000;
    if (diff < 1) return '<1m';
    if (diff < 60) return `${Math.round(diff)}m`;
    return `${Math.floor(diff / 60)}h ${Math.round(diff % 60)}m`;
  };

  const userForSidebar = doctor
    ? { name: doctor.name, role: doctor.specialization || 'Doctor' }
    : undefined;

  const waitingCount = patients.filter((p) => p.status === 'waiting').length;
  const inProgressCount = patients.filter((p) => p.status === 'in_progress').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar
        items={sidebarItems.map((item) => ({
          ...item,
          icon: item.label === 'Dashboard' ? <Stethoscope size={20} /> :
            item.label === 'My Patients' ? <Users size={20} /> :
            item.label === 'Schedule' ? <Calendar size={20} /> :
            <User size={20} />,
          badge: item.label === 'My Patients' ? waitingCount : undefined,
        }))}
        currentPath="/doctor/queue"
        onNavigate={navigate}
        onLogout={handleLogout}
        user={userForSidebar}
      />

      <div className="lg:ml-64">
        <Header
          title="My Patients"
          subtitle={`${patients.length} patients today — ${waitingCount} waiting, ${inProgressCount} in consultation`}
          notificationCount={waitingCount}
          actions={
            <Button
              variant="primary"
              icon={<Users size={16} />}
              onClick={handleCallNext}
              disabled={waitingCount === 0}
            >
              Call Next Patient
            </Button>
          }
          user={userForSidebar}
        />

        <div className="p-4 sm:p-6">
          {/* Quick summary bar */}
          <motion.div
            className="grid grid-cols-3 gap-4 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-warning-50 border border-warning-100">
              <Clock size={18} className="text-warning-600" />
              <div>
                <p className="text-lg font-bold text-warning-700">{waitingCount}</p>
                <p className="text-xs text-warning-600">Waiting</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 border border-primary-100">
              <Stethoscope size={18} className="text-primary-600" />
              <div>
                <p className="text-lg font-bold text-primary-700">{inProgressCount}</p>
                <p className="text-xs text-primary-600">With You</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-success-50 border border-success-100">
              <Users size={18} className="text-success-600" />
              <div>
                <p className="text-lg font-bold text-success-700">
                  {patients.filter((p) => p.status === 'completed').length}
                </p>
                <p className="text-xs text-success-600">Completed</p>
              </div>
            </div>
          </motion.div>

          {/* Patient list */}
          {patients.length === 0 ? (
            <EmptyState
              icon={<Users size={40} />}
              title="No patients in queue today"
              description="Patients will appear here once they are registered and assigned to you."
            />
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {patients.map((patient) => (
                  <motion.div
                    key={patient.visit_id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      onClick={() => navigate(`/doctor/patient/${patient.visit_id}`)}
                      className={`w-full text-left card p-4 sm:p-5 transition-all hover:shadow-md ${
                        patient.status === 'in_progress'
                          ? 'border-l-4 border-l-primary-500 bg-primary-50/30'
                          : patient.status === 'completed'
                          ? 'opacity-60'
                          : patient.priority === 'emergency'
                          ? 'border-l-4 border-l-danger-500'
                          : patient.priority === 'urgent'
                          ? 'border-l-4 border-l-warning-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Token */}
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                          patient.status === 'completed' ? 'bg-surface-100' :
                          patient.priority === 'emergency' ? 'bg-danger-100' :
                          patient.priority === 'urgent' ? 'bg-warning-100' :
                          'bg-primary-100'
                        }`}>
                          <span className={`text-lg font-bold ${
                            patient.status === 'completed' ? 'text-surface-500' :
                            patient.priority === 'emergency' ? 'text-danger-700' :
                            patient.priority === 'urgent' ? 'text-warning-700' :
                            'text-primary-700'
                          }`}>
                            #{patient.token_number}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-surface-900">{patient.patient_name}</span>
                            {patient.patient_age != null && (
                              <span className="text-sm text-surface-500">
                                {patient.patient_age}y {patient.patient_gender ? `/ ${patient.patient_gender}` : ''}
                              </span>
                            )}
                            <Badge variant={priorityVariant[patient.priority]} size="sm">
                              {patient.priority.charAt(0).toUpperCase() + patient.priority.slice(1)}
                            </Badge>
                            {patient.status === 'in_progress' && (
                              <Badge variant="info" size="sm">With You</Badge>
                            )}
                            {patient.status === 'completed' && (
                              <Badge variant="success" size="sm">Completed</Badge>
                            )}
                          </div>
                          <p className="text-sm text-surface-600 mt-1 truncate">{patient.chief_complaint || 'No chief complaint recorded'}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-surface-400">
                            {patient.phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={12} /> {patient.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {formatWaitTime(patient.queued_at)}
                            </span>
                          </div>
                        </div>

                        <ChevronRight size={20} className="text-surface-300 shrink-0 mt-1" />
                      </div>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
