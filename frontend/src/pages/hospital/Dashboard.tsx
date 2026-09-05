import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  AlertTriangle,
  Activity,
  Clock,
  CheckCircle2,
  Stethoscope,
  Building2,
  ListOrdered,
  UserCog,
  CalendarDays,
  ArrowRight,
  TrendingUp,
  HeartPulse,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import {
  Sidebar,
  Header,
  StatsCard,
  Card,
  LoadingSpinner,
  EmptyState,
  Badge,
} from '../../components/shared';

interface DashboardStats {
  totalToday: number;
  inQueue: number;
  completed: number;
  emergencyCases: number;
}

interface DepartmentStat {
  name: string;
  count: number;
}

interface QueueStatus {
  department_name: string;
  current_token: number;
  waiting_count: number;
}

interface RecentVisit {
  id: number;
  token: number;
  patient_name: string;
  department_name: string;
  status: string;
  created_at: string;
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

const statusColor: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  booked: 'info',
  confirmed: 'info',
  in_queue: 'warning',
  with_doctor: 'warning',
  completed: 'success',
  emergency: 'danger',
};

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ totalToday: 0, inQueue: 0, completed: 0, emergencyCases: 0 });
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [queueStatuses, setQueueStatuses] = useState<QueueStatus[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [hospitalId, setHospitalId] = useState<string | null>(null);

  const getHospitalId = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('hospitals')
      .select('id')
      .eq('admin_id', user.id)
      .single();
    return data?.id ?? null;
  }, [user]);

  useEffect(() => {
    (async () => {
      const hid = await getHospitalId();
      setHospitalId(hid);
    })();
  }, [getHospitalId]);

  const fetchDashboardData = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const { data: visits } = await supabase
      .from('visits')
      .select('id, token, status, priority, department_name, created_at, patient:patient_id(name)')
      .eq('hospital_id', hospitalId)
      .eq('visit_date', today)
      .order('created_at', { ascending: false });

    if (visits) {
      const totalToday = visits.length;
      const inQueue = visits.filter((v) => ['booked', 'checked_in', 'in_queue'].includes(v.status)).length;
      const completed = visits.filter((v) => v.status === 'completed').length;
      const emergencyCases = visits.filter((v) => v.priority === 'emergency').length;
      setStats({ totalToday, inQueue, completed, emergencyCases });

      const deptMap: Record<string, number> = {};
      visits.forEach((v) => {
        const dept = v.department_name || 'Unassigned';
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      });
      setDepartmentStats(
        Object.entries(deptMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      );

      setRecentVisits(
        visits.slice(0, 10).map((v) => ({
          id: v.id,
          token: v.token,
          patient_name: (v.patient as unknown as { name: string })?.name || 'Unknown',
          department_name: v.department_name || 'Unassigned',
          status: v.status,
          created_at: v.created_at,
        }))
      );
    }

    const { data: queues } = await supabase
      .from('queues')
      .select('department_name, current_token, waiting_count')
      .eq('hospital_id', hospitalId);

    if (queues) {
      setQueueStatuses(queues);
    }

    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    if (hospitalId) fetchDashboardData();
  }, [hospitalId, fetchDashboardData]);

  useEffect(() => {
    if (!hospitalId) return;
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [hospitalId, fetchDashboardData]);

  const maxDeptCount = Math.max(...departmentStats.map((d) => d.count), 1);

  if (loading && !hospitalId) {
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
          title="Hospital Dashboard"
          subtitle={`Overview for ${profile && 'hospital_name' in profile ? profile.hospital_name || 'Your Hospital' : 'Your Hospital'}`}
          user={user ? { name: user.full_name, role: 'Admin' } : undefined}
        />

        <div className="p-4 sm:p-6 space-y-6">
          <motion.div {...fadeIn}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Total Patients Today" value={stats.totalToday} icon={<Users size={22} />} color="primary" />
              <StatsCard title="In Queue" value={stats.inQueue} icon={<Clock size={22} />} color="warning" />
              <StatsCard title="Completed" value={stats.completed} icon={<CheckCircle2 size={22} />} color="success" />
              <StatsCard title="Emergency Cases" value={stats.emergencyCases} icon={<AlertTriangle size={22} />} color="danger" />
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div {...fadeIn} className="lg:col-span-2">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-surface-900">Department Distribution</h3>
                  <TrendingUp size={18} className="text-surface-400" />
                </div>
                {departmentStats.length === 0 ? (
                  <p className="text-sm text-surface-500 py-8 text-center">No data available for today</p>
                ) : (
                  <div className="space-y-3">
                    {departmentStats.map((dept) => (
                      <div key={dept.name} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-surface-700 w-32 truncate">{dept.name}</span>
                        <div className="flex-1 bg-surface-100 rounded-full h-6 overflow-hidden">
                          <motion.div
                            className="h-full bg-primary-500 rounded-full flex items-center justify-end pr-2"
                            initial={{ width: 0 }}
                            animate={{ width: `${(dept.count / maxDeptCount) * 100}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          >
                            <span className="text-xs font-medium text-white">{dept.count}</span>
                          </motion.div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>

            <motion.div {...fadeIn}>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-surface-900">Live Queue Status</h3>
                  <Activity size={18} className="text-success-500" />
                </div>
                {queueStatuses.length === 0 ? (
                  <p className="text-sm text-surface-500 py-8 text-center">No active queues</p>
                ) : (
                  <div className="space-y-3">
                    {queueStatuses.map((q) => (
                      <div key={q.department_name} className="p-3 bg-surface-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-surface-800">{q.department_name}</span>
                          <Badge variant="info" size="sm">Token #{q.current_token}</Badge>
                        </div>
                        <p className="text-xs text-surface-500 mt-1">{q.waiting_count} patients waiting</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          </div>

          <motion.div {...fadeIn}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-surface-900">Recent Visits</h3>
                <button
                  onClick={() => navigate('/hospital/opd')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  View All <ArrowRight size={14} />
                </button>
              </div>
              {recentVisits.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList size={24} />}
                  title="No visits today"
                  description="Patients will appear here as they visit the hospital"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200">
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">Token</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">Patient</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">Department</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">Status</th>
                        <th className="text-left py-3 px-2 text-xs font-medium text-surface-500 uppercase">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentVisits.map((visit) => (
                        <tr
                          key={visit.id}
                          className="border-b border-surface-100 hover:bg-surface-50 cursor-pointer"
                          onClick={() => navigate('/hospital/opd')}
                        >
                          <td className="py-3 px-2 font-mono font-medium text-surface-900">#{visit.token}</td>
                          <td className="py-3 px-2 text-surface-700">{visit.patient_name}</td>
                          <td className="py-3 px-2 text-surface-600">{visit.department_name}</td>
                          <td className="py-3 px-2">
                            <Badge variant={statusColor[visit.status] || 'neutral'} size="sm">
                              {visit.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-surface-500">
                            {new Date(visit.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
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
