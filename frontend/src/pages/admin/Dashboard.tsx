import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, Activity, Database, Shield, LogOut, ChevronRight } from 'lucide-react';
import { useSessionStore } from '../../stores';
import { patientApi, physicianApi } from '../../api/client';

interface AdminStats {
  totalPatients: number;
  todayPatients: number;
  totalSessions: number;
  activeSessions: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { resetSession } = useSessionStore();
  const [stats, setStats] = useState<AdminStats>({ totalPatients: 0, todayPatients: 0, totalSessions: 0, activeSessions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [patientsRes, dashRes] = await Promise.all([
        patientApi.search({}),
        physicianApi.getDashboard('all'),
      ]);
      const patientList = (patientsRes as any).data || [];
      setStats({
        totalPatients: Array.isArray(patientList) ? patientList.length : 0,
        todayPatients: 0,
        totalSessions: dashRes.data.queue?.length || 0,
        activeSessions: dashRes.data.pending_count || 0,
      });
    } catch {
      setStats({ totalPatients: 0, todayPatients: 0, totalSessions: 0, activeSessions: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('access_token');
    resetSession();
    navigate('/');
  };

  const adminSections = [
    { title: 'Patient Records', desc: 'View and manage patient database', icon: Users, color: 'primary', route: '/admin/patients' },
    { title: 'System Analytics', desc: 'Usage stats and performance metrics', icon: Activity, color: 'accent', route: '/admin/analytics' },
    { title: 'Database Management', desc: 'Backup, restore, and maintenance', icon: Database, color: 'success', route: '/admin/database' },
    { title: 'Security & Compliance', desc: 'Access logs and consent management', icon: Shield, color: 'warning', route: '/admin/security' },
    { title: 'Settings', desc: 'System configuration and integrations', icon: Settings, color: 'surface', route: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen mesh-bg text-surface-900 font-sans">
      <div className="bg-white/90 backdrop-blur border-b border-surface-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-600 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-accent-900">Admin Dashboard</h1>
              <p className="text-xs text-surface-500">MediKiosk System Administration</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Patients', value: loading ? '...' : stats.totalPatients },
            { label: 'Today', value: loading ? '...' : stats.todayPatients },
            { label: 'Total Sessions', value: loading ? '...' : stats.totalSessions },
            { label: 'Active Sessions', value: loading ? '...' : stats.activeSessions },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-surface-200 shadow-sm">
              <p className="text-3xl font-bold text-surface-900">{stat.value}</p>
              <p className="text-xs text-surface-500 font-medium mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Admin Sections */}
        <div className="space-y-3">
          {adminSections.map((section) => (
            <button
              key={section.title}
              onClick={() => navigate(section.route)}
              className="w-full bg-white rounded-2xl p-5 border border-surface-200 shadow-sm hover:border-surface-300 hover:shadow-md transition-all flex items-center gap-4 text-left"
            >
              <div className={`w-12 h-12 rounded-xl bg-${section.color}-50 flex items-center justify-center shrink-0`}>
                <section.icon className={`w-6 h-6 text-${section.color}-600`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-surface-900">{section.title}</p>
                <p className="text-sm text-surface-500 mt-0.5">{section.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-surface-300 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
