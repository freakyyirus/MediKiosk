import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, Clock, LogOut, Search, Stethoscope, Pill,
  FileText, Check, ChevronRight, User,
} from 'lucide-react';
import { useSessionStore } from '../../stores';
import { physicianApi } from '../../api/client';
import type { PhysicianQueueItem } from '../../types';

interface SelectedDetail {
  sessionId: number;
  patientName: string | null;
  chief: string | null;
}

const SAMPLE_RED_FLAGS = ['chest_pain_mi', 'hemoptysis'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { resetSession } = useSessionStore();
  const [queue, setQueue] = useState<PhysicianQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedDetail | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await physicianApi.getDashboard('pending');
      setQueue(res.data.queue || []);
    } catch {
      setQueue([
        {
          session_id: 101, patient_name: 'Rajesh Kumar', chief_complaint: 'Persistent chest pain worsening on exertion',
          red_flags: [{ type: 'chest_pain_mi', severity: 'critical', confidence: 0.95, triggered_by: ['chest pain'] }],
          wait_time_minutes: 4, priority: 'critical', summary_preview: null,
        },
        {
          session_id: 102, patient_name: 'Priya Sharma', chief_complaint: 'Fever and cold for 3 days',
          red_flags: [], wait_time_minutes: 9, priority: 'normal', summary_preview: null,
        },
        {
          session_id: 103, patient_name: 'Amit Patel', chief_complaint: 'Cough with blood-tinged sputum',
          red_flags: [{ type: 'hemoptysis', severity: 'high', confidence: 0.88, triggered_by: ['coughing blood'] }],
          wait_time_minutes: 12, priority: 'high', summary_preview: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('access_token');
    resetSession();
    navigate('/');
  };

  const openSummary = (item: PhysicianQueueItem) => {
    setSelected({
      sessionId: item.session_id,
      patientName: item.patient_name,
      chief: item.chief_complaint,
    });
  };

  const summarySections: {
    id: string; icon: typeof Stethoscope; title: string; value: string; abnormal?: boolean;
  }[] = [
    { id: 'complaint', icon: Stethoscope, title: 'Chief Complaint', value: selected?.chief || '—' },
    { id: 'meds', icon: Pill, title: 'Current Medications', value: 'Amlodipine 5mg OD', abnormal: true },
    { id: 'vitals', icon: Activity, title: 'Vitals (from reports)', value: 'BP 150/95 mmHg', abnormal: true },
    { id: 'docs', icon: FileText, title: 'Documents', value: '2 uploaded · 1 lab report' },
  ];

  return (
    <div className="min-h-screen mesh-bg text-surface-900">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-surface-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-primary-600 to-primary-400 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/25">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Physician Dashboard</h1>
              <p className="text-sm text-surface-500">MediKiosk Clinical Portal</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-colors touch-target">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* Split pane */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-[calc(100vh-73px)] overflow-hidden">

        {/* LEFT: queue */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-primary-600" /> Patient Queue</h2>
              <p className="text-sm text-surface-500">{queue.length} waiting</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input placeholder="Search patients..." className="h-11 pl-9 pr-4 bg-white border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="card p-5 shimmer h-28" />
              ))
            ) : queue.length === 0 ? (
              <div className="card p-12 text-center text-surface-500">
                <User className="w-12 h-12 mx-auto mb-3 text-surface-300" />
                <p className="font-semibold text-lg">No patients in queue</p>
              </div>
            ) : (
              queue.map((item, i) => {
                const hasFlag = item.red_flags?.length > 0;
                return (
                  <button
                    key={item.session_id}
                    onClick={() => openSummary(item)}
                    className={`w-full text-left card p-5 transition-all hover:shadow-lg relative overflow-hidden ${selected?.sessionId === item.session_id ? 'border-primary-400 ring-2 ring-primary-200' : ''}`}
                  >
                    {/* red flag stripe on left */}
                    {hasFlag && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-danger-500 to-danger-600" />
                    )}
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${hasFlag ? 'bg-danger-50' : 'bg-primary-50'}`}>
                        <User className={`w-6 h-6 ${hasFlag ? 'text-danger-600' : 'text-primary-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-surface-900 truncate">{item.patient_name || `Patient #${item.session_id}`}</span>
                          {hasFlag && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-danger-600 bg-danger-50 px-2 py-0.5 rounded-full shrink-0">
                              <AlertTriangle className="w-3 h-3" /> {item.red_flags![0]?.type?.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-surface-500 text-sm truncate mt-0.5">{item.chief_complaint}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-lg font-bold ${hasFlag ? 'text-danger-600' : 'text-primary-700'}`}>
                          {item.wait_time_minutes}m
                        </span>
                        <p className="text-[11px] text-surface-400">wait</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-surface-300" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: structured summary */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" /> Summary Preview
            </h2>
            {selected && <span className="text-sm text-surface-500 font-medium bg-white px-3 py-1 rounded-full border border-surface-200">{selected.patientName}</span>}
          </div>

          {!selected ? (
            <div className="flex-1 card flex flex-col items-center justify-center text-center text-surface-400 p-8">
              <FileText className="w-14 h-14 mb-4 text-surface-300" />
              <p className="text-lg font-medium">Select a patient to review</p>
              <p className="text-surface-400">Their structured summary appears here</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {summarySections.map((s) => (
                <div key={s.id} className={`card p-5 border-l-4 ${s.abnormal ? 'border-warning-400' : 'border-primary-300'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center">
                      <s.icon className="w-4 h-4 text-primary-600" />
                    </div>
                    <p className="text-sm font-bold text-surface-500 uppercase tracking-wider">{s.title}</p>
                    {s.abnormal && <span className="text-[11px] font-bold text-warning-700 bg-warning-50 px-2 py-0.5 rounded-full ml-auto">Abnormal</span>}
                  </div>
                  {/* inline editable field */}
                  <input
                    defaultValue={s.value}
                    className={`inline-edit text-lg font-medium ${s.abnormal ? 'abnormal-value' : ''}`}
                    aria-label={s.title}
                  />
                </div>
              ))}

              {/* horizontal document timeline */}
              <div className="card p-5">
                <p className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-4">Document Timeline</p>
                <div className="flex items-start justify-between">
                  {[
                    { t: 'Prescription', d: 'Today', icon: FileText },
                    { t: 'Lab Report', d: 'Today', icon: Activity },
                    { t: 'Imaging', d: 'Pending', icon: FileText },
                  ].map((doc, i, arr) => (
                    <div key={i} className="flex items-center w-full last:w-auto">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-center">
                          <doc.icon className="w-5 h-5 text-primary-600" />
                        </div>
                        <p className="text-xs font-semibold mt-1 text-surface-700">{doc.t}</p>
                        <p className="text-[11px] text-surface-400">{doc.d}</p>
                      </div>
                      {i < arr.length - 1 && <div className="flex-1 h-0.5 bg-gradient-to-r from-primary-300 to-surface-200 mx-2 mb-5" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* confirm actions */}
              <div className="flex gap-3 pt-1">
                <button className="touch-target flex-[2] bg-success-600 hover:bg-success-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-success-600/25">
                  <Check className="w-5 h-5" /> Confirm
                </button>
                <button className="touch-target flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-2xl shadow-lg shadow-primary-600/25">
                  Request More Info
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
