import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, CalendarPlus, ClipboardList, Heart, FileUser, UserCircle,
  CalendarClock, FileText, ArrowRight, Plus, Monitor,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Sidebar, Header, StatsCard, Card, Button, LoadingSpinner, EmptyState } from '../../components/shared';
import { useAuthStore } from '../../stores/authStore';
import { useT } from '../../lib/i18n';
import type { Patient } from '../../types';

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
  created_at: string;
}

const NAV_ITEMS = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/patient/dashboard' },
  { icon: <CalendarPlus size={20} />, label: 'Book OPD', path: '/patient/book-opd' },
  { icon: <ClipboardList size={20} />, label: 'My Visits', path: '/patient/visits' },
  { icon: <Heart size={20} />, label: 'Health Timeline', path: '/patient/health-timeline' },
  { icon: <FileUser size={20} />, label: 'Documents', path: '/patient/documents' },
  { icon: <UserCircle size={20} />, label: 'Profile', path: '/patient/profile' },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  booked: { label: 'Booked', className: 'bg-primary-100 text-primary-700' },
  confirmed: { label: 'Confirmed', className: 'bg-indigo-100 text-indigo-700' },
  in_queue: { label: 'In Queue', className: 'bg-warning-100 text-warning-700' },
  with_doctor: { label: 'With Doctor', className: 'bg-orange-100 text-orange-700' },
  completed: { label: 'Completed', className: 'bg-success-100 text-success-700' },
  cancelled: { label: 'Cancelled', className: 'bg-danger-100 text-danger-700' },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function PatientDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const t = useT();

  const [profile, setProfile] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentPath = location.pathname;

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [profileRes, visitsRes, docRes] = await Promise.all([
        supabase.from('patients').select('*').eq('id', user.id).single(),
        supabase.from('visits').select('*').eq('patient_id', user.id).order('visit_date', { ascending: false }).limit(50),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('patient_id', user.id),
      ]);
      if (profileRes.data) setProfile(profileRes.data as Patient);
      if (visitsRes.data) {
        setVisits(visitsRes.data as VisitRecord[]);
        setTotalVisits((visitsRes.data as VisitRecord[]).filter(v => v.status !== 'cancelled').length);
      }
      setDocCount(docRes.count ?? 0);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleNavigate = (path: string) => navigate(path);
  const handleLogout = () => { logout(); navigate('/'); };

  const upcomingVisits = visits.filter(v =>
    ['booked', 'confirmed', 'in_queue'].includes(v.status) && new Date(v.visit_date) >= new Date()
  );
  const nextAppointment = upcomingVisits.sort((a, b) =>
    new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
  )[0];
  const recentVisits = visits.slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar
        items={NAV_ITEMS}
        currentPath={currentPath}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={{
          name: profile?.name || 'Patient',
          role: 'Patient',
        }}
      />

      <div className="lg:ml-64 min-h-screen flex flex-col pl-14 lg:pl-0">
        <Header
          title="Patient Portal"
          subtitle={`Welcome back, ${profile?.name?.split(' ')[0] || 'Patient'}!`}
          user={{ name: profile?.name || 'Patient', role: 'Patient' }}
        />

        <main className="flex-1 p-4 sm:p-6 space-y-6">
          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-surface-900">
                  Welcome, {profile?.name || 'Patient'}
                </h2>
                <p className="text-surface-500 mt-1">Here's an overview of your health journey.</p>
              </div>
              <Button
                variant="primary"
                size="lg"
                icon={<Plus size={20} />}
                onClick={() => navigate('/patient/book-opd')}
              >
                Book New OPD
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            {...fadeUp}
            transition={{ delay: 0.2 }}
          >
            <StatsCard
              title="Total Visits"
              value={totalVisits}
              icon={<ClipboardList size={20} />}
              color="primary"
            />
            <StatsCard
              title="Upcoming Appointments"
              value={upcomingVisits.length}
              icon={<CalendarClock size={20} />}
              color="success"
            />
            <StatsCard
              title="Documents"
              value={docCount}
              icon={<FileText size={20} />}
              color="warning"
            />
          </motion.div>

          {/* Kiosk Mode entry */}
          <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
            <Card className="border-2 border-primary-200 bg-gradient-to-r from-primary-50 via-white to-accent-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center shrink-0">
                    <Monitor size={28} className="text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-surface-900">{t('kioskMode')}</p>
                    <p className="text-surface-600 mt-0.5">
                      {t('kioskModeDesc')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Monitor size={18} />}
                  onClick={() => navigate('/patient/kiosk')}
                >
                  {t('startKioskMode')}
                </Button>
              </div>
            </Card>
          </motion.div>

          {nextAppointment && (
            <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
              <Card className="border-l-4 border-l-primary-500">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-500 mb-1">Next Appointment</p>
                    <h3 className="text-lg font-semibold text-surface-900">
                      {nextAppointment.hospital_name} — {nextAppointment.department_name}
                    </h3>
                    <p className="text-surface-600 mt-1">
                      Dr. {nextAppointment.doctor_name} · {new Date(nextAppointment.visit_date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} at {nextAppointment.visit_time}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">
                        Token: {nextAppointment.token_number}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[nextAppointment.status]?.className || ''}`}>
                        {STATUS_BADGE[nextAppointment.status]?.label || nextAppointment.status}
                      </span>
                    </div>
                  </div>
                  <CalendarClock size={32} className="text-primary-300 shrink-0" />
                </div>
              </Card>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-surface-900">Recent Activity</h3>
                  <button
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    onClick={() => navigate('/patient/visits')}
                  >
                    View All
                  </button>
                </div>
                {recentVisits.length === 0 ? (
                  <EmptyState
                    icon={<ClipboardList size={24} />}
                    title="No visits yet"
                    description="Your health visits will appear here."
                  />
                ) : (
                  <div className="space-y-3">
                    {recentVisits.map((visit) => (
                      <div key={visit.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 hover:bg-surface-100 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                          <ClipboardList size={18} className="text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-900 truncate">
                            {visit.hospital_name} — {visit.department_name}
                          </p>
                          <p className="text-xs text-surface-500 truncate">
                            {visit.chief_complaint || 'No complaint recorded'} · {new Date(visit.visit_date).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[visit.status]?.className || 'bg-surface-100 text-surface-600'}`}>
                          {STATUS_BADGE[visit.status]?.label || visit.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>

            <motion.div {...fadeUp} transition={{ delay: 0.5 }}>
              <Card>
                <h3 className="text-lg font-semibold text-surface-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {[
                    { icon: <CalendarPlus size={20} />, label: 'Book OPD', desc: 'Schedule a new outpatient visit', path: '/patient/book-opd', color: 'bg-primary-50 text-primary-600' },
                    { icon: <FileUser size={20} />, label: 'View Documents', desc: 'Access your medical documents', path: '/patient/documents', color: 'bg-success-50 text-success-600' },
                    { icon: <Heart size={20} />, label: 'Health Timeline', desc: 'Track your health history', path: '/patient/health-timeline', color: 'bg-danger-50 text-danger-600' },
                  ].map((action) => (
                    <button
                      key={action.path}
                      onClick={() => navigate(action.path)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-50 hover:bg-surface-100 transition-all text-left group"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color} group-hover:scale-105 transition-transform`}>
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-900">{action.label}</p>
                        <p className="text-xs text-surface-500">{action.desc}</p>
                      </div>
                      <ArrowRight size={16} className="text-surface-400 group-hover:text-primary-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
