import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, HeartPulse, BellRing, ShieldCheck, ArrowLeft, LayoutDashboard } from 'lucide-react';
import Logo from '../../components/brand/Logo';
import VitalsPanel, { type AbnormalVital } from '../../components/advanced/VitalsPanel';
import EarlyWarningAlarm from '../../components/advanced/EarlyWarningAlarm';
import { useAdvancedStore } from '../../stores/advancedFeaturesStore';
import { useAuthStore } from '../../stores/authStore';

export default function VitalsMonitor() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { vitals, emergencyAlerts, acknowledgeEmergency, resolveEmergency, loadAll } = useAdvancedStore();
  const [alarm, setAlarm] = useState<{ alertType: string; alertTypeHindi?: string; severity: 'critical' | 'high' | 'medium'; abnormalVitals: AbnormalVital[]; confidenceScore: number } | null>(null);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleEmergency = (a: typeof alarm) => {
    if (!a) return;
    setAlarm(a);
    useAdvancedStore.getState().raiseEmergency({
      alert_type: a.alertType,
      alert_type_hindi: a.alertTypeHindi,
      severity: a.severity as 'critical',
      triggered_symptoms: a.abnormalVitals.map((v) => v.label),
      confidence_score: a.confidenceScore,
    });
  };

  const handleAcknowledge = async () => {
    if (!alarm) return;
    setAlarm(null);
    const active = emergencyAlerts[0];
    if (active) {
      await acknowledgeEmergency(active.id);
      await resolveEmergency(active.id, 'Acknowledged at triage station');
    }
  };

  const handleIgnore = () => {
    setAlarm(null);
    const active = emergencyAlerts[0];
    if (active) acknowledgeEmergency(active.id);
  };

  const latest = vitals[0];

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900">
      {alarm && (
        <EarlyWarningAlarm
          alertType={alarm.alertType}
          alertTypeHindi={alarm.alertTypeHindi}
          severity={alarm.severity}
          abnormalVitals={alarm.abnormalVitals}
          confidenceScore={alarm.confidenceScore}
          onAcknowledge={handleAcknowledge}
          onIgnore={handleIgnore}
        />
      )}

      <header className="bg-white border-b border-surface-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(user?.role === 'doctor' ? '/doctor/dashboard' : '/hospital/dashboard')}
              className="touch-target flex items-center gap-2 rounded-xl border border-surface-300 px-3 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={16} /> Dashboard
            </button>
            <Logo size={44} variant="gradient" showWordmark={false} />
            <div>
              <h1 className="text-xl font-black tracking-tight">Vitals & Early Warning Station</h1>
              <p className="text-sm text-surface-400 font-medium">Feature 4 + 5 · live triage monitor</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-success-700 bg-success-50 border border-success-200 rounded-full px-4 py-2 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4" /> Monitoring Active
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Vitals input */}
        <div className="lg:col-span-3 card p-6">
          <VitalsPanel onEmergency={handleEmergency} />
        </div>

        {/* Right rail */}
        <div className="lg:col-span-2 space-y-5">
          {/* Latest reading */}
          <div className="card p-5">
            <h2 className="font-bold text-surface-900 mb-3 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-primary-600" /> Latest Reading
            </h2>
            {latest ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-surface-400">SpO2</span><span className="font-bold">{latest.spo2 ?? '—'}%</span></div>
                <div className="flex justify-between"><span className="text-surface-400">Pulse</span><span className="font-bold">{latest.pulse_rate ?? '—'} bpm</span></div>
                <div className="flex justify-between"><span className="text-surface-400">BP</span><span className="font-bold">{latest.bp_systolic ?? '—'}/{latest.bp_diastolic ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-surface-400">Temp</span><span className="font-bold">{latest.temperature != null ? `${latest.temperature.toFixed(1)}°C` : '—'}</span></div>
                <div className="mt-2 pt-2 border-t border-surface-100">
                  <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full ${latest.is_abnormal ? 'bg-danger-50 text-danger-700 border border-danger-200' : 'bg-success-50 text-success-700 border border-success-200'}`}>
                    {latest.is_abnormal ? 'ABNORMAL' : 'NORMAL'}
                  </span>
                  <span className="ml-2 text-xs text-surface-400 font-medium">{new Date(latest.measured_at).toLocaleTimeString()}</span>
                </div>
                {latest.abnormal_reason && (
                  <p className="text-xs text-danger-600 bg-danger-50 rounded-lg p-2 mt-2">{latest.abnormal_reason}</p>
                )}
              </div>
            ) : (
              <p className="text-surface-400 text-sm">No readings yet — enter vitals on the left.</p>
            )}
          </div>

          {/* Emergency alert log */}
          <div className="card p-5">
            <h2 className="font-bold text-surface-900 mb-3 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-danger-600" /> Alert Log
            </h2>
            {emergencyAlerts.length > 0 ? (
              <div className="space-y-3">
                {emergencyAlerts.slice(0, 6).map((a) => (
                  <div key={a.id} className="rounded-xl border border-surface-200 p-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{a.alert_type}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.severity === 'critical' ? 'bg-danger-50 text-danger-700' : 'bg-warning-50 text-warning-700'}`}>
                        {a.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-surface-400 mt-1">
                      {new Date(a.alarm_triggered_at).toLocaleString()} · {a.resolution_status}
                    </p>
                    {a.triggered_symptoms && a.triggered_symptoms.length > 0 && (
                      <p className="text-xs font-semibold text-surface-600 mt-1">{a.triggered_symptoms.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-400 text-sm">No active alarms.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}