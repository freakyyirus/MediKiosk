import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { useSessionStore } from '../../stores';
import { documentApi } from '../../api/client';
import Stepper from '../../components/Stepper';
import EmergencyFab from '../../components/EmergencyFab';

const DOC_TYPES = [
  { id: 'prescription', label: 'Prescription' },
  { id: 'lab_report', label: 'Lab Report' },
  { id: 'imaging', label: 'Imaging / X-Ray' },
  { id: 'discharge_summary', label: 'Discharge Summary' },
  { id: 'other', label: 'Other' },
];

export default function DocumentUpload() {
  const navigate = useNavigate();
  const { session, incrementDocuments } = useSessionStore();
  const [capturing, setCapturing] = useState(false);
  const [aligned, setAligned] = useState(true);
  const [uploaded, setUploaded] = useState<{ name: string; type: string; page: number }[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleScan = () => {
    setCapturing(true);
    setAligned(true);
    if (navigator.vibrate) navigator.vibrate(30);

    // Simulate camera capture after a beat
    setTimeout(() => {
      const pageNum = uploaded.length + 1;
      const name = `Document_${Date.now().toString().slice(-6)}.png`;
      setCapturing(false);
      setUploaded((prev) => [...prev, { name, type: 'document', page: pageNum }]);
      incrementDocuments();
    }, 1800);
  };

  const uploadAll = async () => {
    if (!session?.id || uploaded.length === 0) return;
    setUploading(true);
    try {
      for (const doc of uploaded) {
        const formData = new FormData();
        formData.append('session_id', String(session.id));
        formData.append('patient_id', String(session.patient_id || 0));
        formData.append('doc_type', 'other');
        // Build a real file blob from the simulated capture
        const blob = new Blob(['simulated-image-content'], { type: 'image/png' });
        formData.append('file', new File([blob], doc.name, { type: 'image/png' }));
        await documentApi.upload(formData);
      }
    } catch {
      /* best-effort */
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <div className="px-10 pt-8">
        <Stepper steps={[{ label: 'Language' }, { label: 'Health Check' }, { label: 'Documents' }, { label: 'Done' }]} current={2} />
      </div>

      <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full px-8 py-6">
        <div className="text-center animate-fade-in mb-6 w-full">
          <div className="w-16 h-16 rounded-[22px] bg-primary-100 border border-primary-200 flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-primary-700" />
          </div>
          <h1 className="text-3xl font-bold text-surface-900">Upload Documents</h1>
          <p className="text-lg text-surface-500 mt-2">
            Scan prescriptions, lab reports, or imaging for faster assessment.
          </p>
        </div>

        {/* Camera view with corner brackets */}
        <div className="w-full max-w-xl animate-fade-in">
          <div className="relative aspect-[4/3] rounded-[20px] overflow-hidden bg-gradient-to-br from-surface-200 to-surface-300 border border-surface-300 shadow-lg">
            {/* Simulated camera/subject area */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3/4 h-4/5 rounded-xl border-2 border-dashed border-surface-400 bg-white/60 flex flex-col items-center justify-center gap-3">
                <FileText className="w-12 h-12 text-surface-400" />
                {capturing ? (
                  <span className="shimmer text-lg font-semibold text-primary-700 rounded-full px-6 py-2">Scanning...</span>
                ) : (
                  <span className="text-lg text-surface-500">Align the document here</span>
                )}
              </div>
            </div>

            {/* Animated corner brackets */}
            <div className="capture-frame absolute inset-0 pointer-events-none">
              <div className={`corner tl ${aligned ? '' : 'animate-corner-blink'}`} />
              <div className={`corner tr ${aligned ? '' : 'animate-corner-blink'}`} />
              <div className={`corner bl ${aligned ? '' : 'animate-corner-blink'}`} />
              <div className={`corner br ${aligned ? '' : 'animate-corner-blink'}`} />
            </div>

            {/* Aligned indicator */}
            {aligned && !capturing && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <span className="inline-flex items-center gap-2 bg-success-600 text-white font-semibold px-4 py-2 rounded-full text-sm">
                  <Check className="w-4 h-4" /> Aligned
                </span>
              </div>
            )}
          </div>

          {/* Capture control */}
          <div className="flex justify-center my-6">
            <button
              onClick={handleScan}
              disabled={capturing || uploading}
              className="relative w-[76px] h-[76px] rounded-full border-4 border-primary-600 bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform touch-target"
              aria-label="Capture document"
            >
              <div className="w-14 h-14 rounded-full bg-primary-600" />
            </button>
          </div>
        </div>

        {/* Multi-page thumbnail gallery */}
        {uploaded.length > 0 && (
          <div className="w-full max-w-xl card p-5 mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-800">Captured Pages ({uploaded.length})</h3>
              <span className="text-sm text-surface-500">Drag to reorder</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {uploaded.map((doc) => (
                <div key={doc.page} className="shrink-0 w-24 text-center">
                  <div className="aspect-[3/4] rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 border border-primary-200 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary-600" />
                  </div>
                  <span className="text-xs text-surface-500 mt-1 block">Page {doc.page}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document type chips */}
        <div className="w-full max-w-xl mb-6">
          <p className="text-sm font-semibold text-surface-600 mb-2">Document type:</p>
          <div className="flex gap-2 flex-wrap">
            {DOC_TYPES.map((d) => (
              <button
                key={d.id}
                className="px-4 py-2 rounded-full border-2 border-surface-200 text-surface-600 text-sm font-medium bg-white hover:border-primary-400 hover:text-primary-700 transition-colors"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex gap-3 max-w-xl">
          <button onClick={() => navigate('/kiosk/interview')} className="touch-target card px-4 flex items-center justify-center text-surface-500 hover:border-surface-300" aria-label="Back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => {
              if (uploaded.length > 0) uploadAll();
              navigate('/kiosk/summary');
            }}
            className="touch-target flex-1 bg-primary-600 hover:bg-primary-700 text-white text-lg font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-600/25"
          >
            {uploading ? 'Uploading...' : uploaded.length > 0 ? 'Continue' : 'Skip'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <EmergencyFab />
    </div>
  );
}
