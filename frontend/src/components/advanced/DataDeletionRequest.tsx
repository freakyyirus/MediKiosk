import { useState } from 'react';
import { ShieldAlert, FileClock, CheckCircle2, Trash2 } from 'lucide-react';
import { useAdvancedStore } from '../../stores/advancedFeaturesStore';

const DATA_TYPES = [
  { value: 'voice_recording', label: 'Voice recordings' },
  { value: 'session_temp', label: 'Temporary session data' },
];

/**
 * Patient-initiated right-to-erasure request (Feature 6).
 * Files a request logged to data_deletion_logs and requires doctor approval.
 */
export default function DataDeletionRequest() {
  const requestDataDeletion = useAdvancedStore((s) => s.requestDataDeletion);
  const [selected, setSelected] = useState<string[]>(['voice_recording']);
  const [submitted, setSubmitted] = useState<{ requestId: string; status: string } | null>(null);

  const toggle = (v: string) => {
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  };

  const submit = async () => {
    if (selected.length === 0) return;
    const res = await requestDataDeletion(selected);
    setSubmitted(res);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="w-5 h-5 text-danger-600" />
        <h2 className="text-lg font-bold">Request Data Deletion</h2>
      </div>
      <p className="text-sm text-surface-400 mb-4">
        Right to erasure under the DPDPA. Your request is reviewed and approved by the hospital before execution.
      </p>

      {!submitted ? (
        <>
          <div className="space-y-2.5 mb-5">
            {DATA_TYPES.map((dt) => (
              <button
                key={dt.value}
                onClick={() => toggle(dt.value)}
                className={`w-full flex items-center justify-between bg-surface-50 border-2 rounded-2xl px-4 py-3 transition-colors ${
                  selected.includes(dt.value) ? 'border-danger-400 bg-danger-50' : 'border-surface-200'
                }`}
              >
                <span className="font-semibold text-surface-800 flex items-center gap-2.5">
                  <FileClock className="w-5 h-5 text-primary-600" /> {dt.label}
                </span>
                <span className={selected.includes(dt.value) ? 'text-danger-600 font-black' : 'text-surface-300 font-black'} aria-hidden>
                  {selected.includes(dt.value) ? '✓' : '○'}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={submit}
            disabled={selected.length === 0}
            className="touch-target w-full bg-danger-600 hover:bg-danger-700 disabled:bg-surface-300 disabled:text-surface-500 text-white font-bold rounded-2xl py-3.5 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" /> Submit Deletion Request
          </button>
        </>
      ) : (
        <div className="text-center py-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-success-600" />
          </div>
          <p className="font-bold text-lg text-success-700 mb-1">Request Submitted</p>
          <p className="text-sm text-surface-500">
            Request ID <span className="font-bold text-surface-800">{submitted.requestId}</span> · Status:{' '}
            <span className="capitalize font-semibold text-warning-700">{submitted.status.replace(/_/g, ' ')}</span>
          </p>
          <p className="text-xs text-surface-400 mt-2">The hospital will review and approve this within 72 hours.</p>
        </div>
      )}
    </div>
  );
}