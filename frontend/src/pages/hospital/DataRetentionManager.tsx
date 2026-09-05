import { useEffect, useState } from 'react';
import { ShieldAlert, Trash2, History, Play, CheckCircle2, FileClock, XCircle, Loader2 } from 'lucide-react';
import { useAdvancedStore, type RetentionPolicy, type DeletionLogEntry } from '../../stores/advancedFeaturesStore';

interface DeletionRequest {
  id: string;
  patientId: number;
  patientName: string;
  dataTypes: string[];
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy?: string;
  result?: string;
}

const mockRequests: DeletionRequest[] = [
  { id: 'req-1', patientId: 1, patientName: 'Demo Patient', dataTypes: ['voice_recording', 'session_temp'], requestedAt: new Date().toISOString(), status: 'pending', requestedBy: 'patient-app' },
  { id: 'req-2', patientId: 2, patientName: 'Sunita Devi', dataTypes: ['voice_recording'], requestedAt: new Date(Date.now() - 86400_000).toISOString(), status: 'approved', requestedBy: 'patient-app' },
];

export default function DataRetentionManager() {
  const { policies, deletionLogs, runCleanup, erasePatient, loadAll } = useAdvancedStore();
  const [requests, setRequests] = useState<DeletionRequest[]>(mockRequests);
  const [running, setRunning] = useState(false);
  const [erasingId, setErasingId] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [deletedCount, setDeletedCount] = useState(0);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const togglePolicy = async (policy: RetentionPolicy) => {
    const updated = { ...policy, auto_delete_enabled: !policy.auto_delete_enabled };
    const { supabase, isSupabaseConfigured } = await import('../../lib/supabase');
    if (isSupabaseConfigured) {
      await supabase.from('data_retention_policies').update({ auto_delete_enabled: updated.auto_delete_enabled }).eq('id', policy.id);
    }
    const next = policies.map((p) => (p.id === policy.id ? updated : p));
    useAdvancedStore.setState({ policies: next });
  };

  const handleRunCleanup = async () => {
    setRunning(true);
    const res = await runCleanup();
    setDeletedCount(res.deleted);
    setLastRun(new Date().toLocaleTimeString());
    setRunning(false);
  };

  const decideRequest = async (id: string, status: 'approved' | 'rejected') => {
  if (status === 'rejected') {
    setRequests((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    return;
  }
  const req = requests.find((x) => x.id === id);
  if (!req) return;
  setErasingId(id);
  const res = await erasePatient(req.patientId, 'dpdpa_right_to_erasure');
  setErasingId(null);
  setRequests((r) =>
    r.map((x) =>
      x.id === id
        ? {
            ...x,
            status: res.ok ? 'approved' : 'pending',
            result: res.ok
              ? `Erased: ${Object.entries(res.removed ?? {}).map(([k, v]) => `${k} ${v}`).join(', ')}`
              : `Failed: ${res.error}`,
          }
        : x
    )
  );
};

  const activePolicies = policies.filter((p) => p.auto_delete_enabled);

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900">
      <header className="bg-white border-b border-surface-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-danger-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Data Retention & Auto-Delete</h1>
            <p className="text-sm text-surface-400 font-medium">Feature 6 · DPDPA-aligned privacy controls</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-3xl font-black text-primary-700">{activePolicies.length}</p>
            <p className="text-sm font-semibold text-surface-500">Auto-delete policies ON</p>
          </div>
          <div className="card p-5">
            <p className="text-3xl font-black text-warning-600">{requests.filter((r) => r.status === 'pending').length}</p>
            <p className="text-sm font-semibold text-surface-500">Deletion requests pending</p>
          </div>
          <div className="card p-5">
            <p className="text-3xl font-black text-success-600">{deletionLogs.length}</p>
            <p className="text-sm font-semibold text-surface-500">Cleanup jobs logged</p>
          </div>
        </div>

        {/* Policies */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-1">Retention Policies</h2>
          <p className="text-sm text-surface-400 mb-5">Toggle auto-delete per data type. Approvals required where marked.</p>
          <div className="space-y-3">
            {policies.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-surface-50 border border-surface-200 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-surface-200 flex items-center justify-center">
                    <FileClock className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-bold text-surface-800 capitalize">{p.data_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-surface-400 font-medium">
                      {p.retention_days === 0 ? 'Delete immediately' : `Retain ${p.retention_days} days`}
                      {p.requires_doctor_approval ? ' · doctor approval required' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => togglePolicy(p)}
                  aria-pressed={p.auto_delete_enabled}
                  aria-label={`Toggle auto delete for ${p.data_type}`}
                  className={`w-[60px] h-8 rounded-full relative transition-colors ${p.auto_delete_enabled ? 'bg-danger-500' : 'bg-surface-300'}`}
                >
                  <span
                    className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${p.auto_delete_enabled ? 'left-[30px]' : 'left-1'}`}
                  />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleRunCleanup}
            disabled={running}
            className="touch-target mt-5 w-full bg-surface-900 hover:bg-surface-800 text-white font-bold rounded-2xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" /> {running ? 'Running cleanup…' : 'Run Cleanup Now'}
          </button>
          {lastRun && (
            <p className="mt-3 text-center text-sm font-semibold text-success-700 bg-success-50 border border-success-200 rounded-xl py-2.5">
              <CheckCircle2 className="inline w-4 h-4 mr-1.5 -mt-0.5" />
              Cleanup at {lastRun}: {deletedCount} data type(s) deleted ({deletionLogs.length} total logged)
            </p>
          )}
        </div>

        {/* Deletion requests */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-warning-600" />
            <h2 className="text-lg font-bold">Patient Deletion Requests</h2>
          </div>
          <p className="text-sm text-surface-400 mb-5">Patient initiated under DPDPA right-to-erasure. Approve to apply.</p>
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="bg-surface-50 border border-surface-200 rounded-2xl p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-surface-800">{r.patientName}</p>
                    <p className="text-xs text-surface-400">{new Date(r.requestedAt).toLocaleString()} · {r.dataTypes.join(', ')}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                    r.status === 'approved' ? 'bg-success-50 text-success-700 border border-success-200'
                    : r.status === 'rejected' ? 'bg-surface-100 text-surface-500 border border-surface-200'
                    : 'bg-warning-50 text-warning-700 border border-warning-200'
                  }`}>
                    {r.status}
                  </span>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => decideRequest(r.id, 'approved')}
                      disabled={erasingId === r.id}
                      className="touch-target flex-1 bg-success-600 hover:bg-success-700 text-white font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                    >
                      {erasingId === r.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Erasing…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Approve & Delete
                        </>
                      )}
                    </button>
                    <button onClick={() => decideRequest(r.id, 'rejected')} className="touch-target flex-1 bg-surface-200 hover:bg-surface-300 text-surface-700 font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
                {r.result && (
                  <p className={`mt-3 text-xs font-semibold ${r.status === 'approved' ? 'text-success-700' : 'text-danger-600'}`}>{r.result}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cleanup log */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <History className="w-5 h-5 text-primary-600" /> Deletion Audit Log
          </h2>
          <p className="text-sm text-surface-400 mb-5">Immutable record of every automated deletion.</p>
          {deletionLogs.length > 0 ? (
            <div className="space-y-2.5">
              {deletionLogs.map((l: DeletionLogEntry) => (
                <div key={l.id} className="bg-surface-50 border border-surface-100 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-surface-800 capitalize">{l.data_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-surface-400">
                      {l.deletion_reason.replace(/_/g, ' ')} · {l.deletion_method}
                    </p>
                  </div>
                  <div className="text-right">
                    <Trash2 className={`w-4 h-4 inline-block mb-1 ${l.deletion_method === 'hard' ? 'text-danger-500' : 'text-warning-500'}`} />
                    <p className="text-xs font-semibold text-surface-500">{new Date(l.deleted_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-400">No deletions recorded yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}