import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, CheckCircle, Clock, Timer, Stethoscope,
  Calendar, ChevronRight, User, QrCode, ScanText,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores';
import { Sidebar, Header, StatsCard, Card, LoadingSpinner, EmptyState, Button } from '../../components/shared';

interface DoctorProfile {
  id: string;
  name: string;
  specialization: string | null;
  department: string | null;
}

interface TodayStats {
  totalPatients: number;
  completed: number;
  inQueue: number;
  avgWaitTime: number;
}

interface QueuePatient {
  visit_id: string;
  patient_name: string;
  chief_complaint: string;
  priority: string;
  token_number: number;
  queued_at: string;
  age: number | null;
  gender: string | null;
}

const sidebarItems = [
  { label: 'Dashboard', path: '/doctor/dashboard' },
  { label: 'Patient Queue', path: '/doctor/queue' },
  { label: 'Scan QR Slip', path: '/doctor/scan-qr' },
  { label: 'Prescription OCR', path: '/doctor/ocr' },
  { label: 'Schedule', path: '/doctor/schedule' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [stats, setStats] = useState<TodayStats>({ totalPatients: 0, completed: 0, inQueue: 0, avgWaitTime: 0 });
  const [nextPatient, setNextPatient] = useState<QueuePatient | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDoctorProfile = useCallback(async () => {
    if (!user?.id) return null;
    const { data } = await supabase
      .from('doctors')
      .select('id, name, specialization, department')
      .eq('user_id', user.id)
      .single();
    return data as DoctorProfile | null;
  }, [user?.id]);

  const fetchTodayData = useCallback(async (doctorId: string) => {
    const today = new Date().toISOString().split('T')[0];

    const { data: visits } = await supabase
      .from('visits')
      .select('id, status, queued_at, token_number')
      .eq('doctor_id', doctorId)
      .eq('visit_date', today);

    if (!visits) return;

    const completed = visits.filter((v) => v.status === 'completed').length;
    const waiting = visits.filter((v) => v.status === 'waiting' || v.status === 'in_progress');
    const inQueue = waiting.length;

    let avgWaitTime = 0;
    if (waiting.length > 0) {
      const now = Date.now();
      const waits = waiting.map((v) => {
        const queued = new Date(v.queued_at).getTime();
        return (now - queued) / 60000;
      });
      avgWaitTime = Math.round(waits.reduce((a, b) => a + b, 0) / waits.length);
    }

    setStats({
      totalPatients: visits.length,
      completed,
      inQueue,
      avgWaitTime,
    });

    const { data: nextData } = await supabase
      .from('visits')
      .select('id, chief_complaint, priority, token_number, queued_at, patients(name, date_of_birth, gender)')
      .eq('doctor_id', doctorId)
      .eq('visit_date', today)
      .in('status', ['waiting', 'in_progress'])
      .order('priority', { ascending: true })
      .order('token_number', { ascending: true })
      .limit(1)
      .single();

    if (nextData) {
      const patient = (nextData as any).patients;
      const dob = patient?.date_of_birth;
      let age: number | null = null;
      if (dob) {
        const birth = new Date(dob);
        const now = new Date();
        age = now.getFullYear() - birth.getFullYear();
        if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
          age--;
        }
      }
      setNextPatient({
        visit_id: nextData.id,
        patient_name: patient?.name || 'Unknown',
        chief_complaint: nextData.chief_complaint || '',
        priority: nextData.priority || 'normal',
        token_number: nextData.token_number || 0,
        queued_at: nextData.queued_at,
        age,
        gender: patient?.gender || null,
      });
    } else {
      setNextPatient(null);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const profile = await fetchDoctorProfile();
        if (profile) {
          setDoctor(profile);
          await fetchTodayData(profile.id);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchDoctorProfile, fetchTodayData]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'danger';
      case 'urgent': return 'warning';
      default: return 'success';
    }
  };

  const formatWaitTime = (queuedAt: string) => {
    const diff = (Date.now() - new Date(queuedAt).getTime()) / 60000;
    if (diff < 1) return '<1 min';
    return `${Math.round(diff)} min`;
  };

  const userForSidebar = doctor
    ? { name: doctor.name, role: doctor.specialization || 'Doctor' }
    : undefined;

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
            item.label === 'Patient Queue' ? <Users size={20} /> :
            item.label === 'Scan QR Slip' ? <QrCode size={20} /> :
            item.label === 'Prescription OCR' ? <ScanText size={20} /> :
            <Calendar size={20} />,
          badge: item.label === 'Patient Queue' ? stats.inQueue : undefined,
        }))}
        currentPath="/doctor/dashboard"
        onNavigate={navigate}
        onLogout={handleLogout}
        user={userForSidebar}
      />

      <div className="lg:ml-64">
        <Header
          title="Doctor Dashboard"
          subtitle={`Dr. ${doctor?.name || ''} — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
          notificationCount={stats.inQueue}
          user={userForSidebar}
        />

        <div className="p-4 sm:p-6 space-y-6">
          {/* Stats */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StatsCard
              title="Patients Today"
              value={stats.totalPatients}
              icon={<Users size={20} />}
              color="primary"
            />
            <StatsCard
              title="Completed"
              value={stats.completed}
              icon={<CheckCircle size={20} />}
              color="success"
            />
            <StatsCard
              title="In Queue"
              value={stats.inQueue}
              icon={<Clock size={20} />}
              color="warning"
            />
            <StatsCard
              title="Avg Wait Time"
              value={`${stats.avgWaitTime} min`}
              icon={<Timer size={20} />}
              color="primary"
            />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Schedule */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-surface-900">Today's Schedule</h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/schedule')}>
                    View Calendar <ChevronRight size={16} />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-50 border border-primary-100">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                      <Stethoscope size={20} className="text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-surface-900">Morning OPD</p>
                      <p className="text-xs text-surface-500">9:00 AM — 1:00 PM</p>
                    </div>
                    <span className="text-sm font-medium text-primary-700">4 hours</span>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary-50 border border-secondary-100">
                    <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
                      <Stethoscope size={20} className="text-secondary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-surface-900">Evening OPD</p>
                      <p className="text-xs text-surface-500">4:00 PM — 7:00 PM</p>
                    </div>
                    <span className="text-sm font-medium text-secondary-700">3 hours</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-4 border-t border-surface-200">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-surface-500">Daily Progress</span>
                    <span className="font-medium text-surface-900">
                      {stats.totalPatients > 0 ? Math.round((stats.completed / stats.totalPatients) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: stats.totalPatients > 0
                          ? `${Math.round((stats.completed / stats.totalPatients) * 100)}%`
                          : '0%',
                      }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Next Patient */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="h-full">
                <h2 className="text-lg font-semibold text-surface-900 mb-4">Next Patient</h2>

                {nextPatient ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary-700">
                          #{nextPatient.token_number}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-surface-900 truncate">
                          {nextPatient.patient_name}
                        </p>
                        <p className="text-sm text-surface-500">
                          {nextPatient.age ? `${nextPatient.age}y` : ''} {nextPatient.gender ? `/ ${nextPatient.gender}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                      <p className="text-xs text-surface-500 mb-1">Chief Complaint</p>
                      <p className="text-sm text-surface-800">{nextPatient.chief_complaint || 'Not recorded'}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        getPriorityColor(nextPatient.priority) === 'danger' ? 'bg-danger-100 text-danger-700' :
                        getPriorityColor(nextPatient.priority) === 'warning' ? 'bg-warning-100 text-warning-700' :
                        'bg-success-100 text-success-700'
                      }`}>
                        {nextPatient.priority.charAt(0).toUpperCase() + nextPatient.priority.slice(1)}
                      </span>
                      <span className="text-xs text-surface-500">
                        Waiting {formatWaitTime(nextPatient.queued_at)}
                      </span>
                    </div>

                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => navigate(`/doctor/patient/${nextPatient.visit_id}`)}
                    >
                      Open Patient Card
                    </Button>
                  </div>
                ) : (
                  <EmptyState
                    icon={<User size={32} />}
                    title="No patients waiting"
                    description="All caught up! Patients will appear here when queued."
                  />
                )}
              </Card>
            </motion.div>
          </div>

          {/* Today's completed consultations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-900">Today's Consultations</h2>
                <span className="text-sm text-surface-500">{stats.completed} completed</span>
              </div>

              {stats.completed === 0 ? (
                <div className="text-center py-8 text-surface-400">
                  <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No consultations completed yet today</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl bg-success-50 border border-success-100">
                    <p className="text-2xl font-bold text-success-700">{stats.completed}</p>
                    <p className="text-xs text-success-600 mt-1">Completed</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-warning-50 border border-warning-100">
                    <p className="text-2xl font-bold text-warning-700">{stats.inQueue}</p>
                    <p className="text-xs text-warning-600 mt-1">Remaining</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-primary-50 border border-primary-100">
                    <p className="text-2xl font-bold text-primary-700">{stats.totalPatients}</p>
                    <p className="text-xs text-primary-600 mt-1">Total</p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
