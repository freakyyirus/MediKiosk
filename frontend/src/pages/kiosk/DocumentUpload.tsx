import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, ArrowLeft, ArrowRight, FileText, AlertCircle } from 'lucide-react';
import { useSessionStore } from '../../stores';
import { documentApi, getErrorMessage } from '../../api/client';
import Stepper from '../../components/Stepper';
import EmergencyFab from '../../components/EmergencyFab';
import { useToastStore } from '../../components/shared/Toast';

const DOC_TYPES = [
  { id: 'prescription', label: 'Prescription' },
  { id: 'lab_report', label: 'Lab Report' },
  { id: 'imaging', label: 'Imaging / X-Ray' },
  { id: 'discharge_summary', label: 'Discharge Summary' },
  { id: 'other', label: 'Other' },
];

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

type CapturedDoc = { name: string; file: File; page: number };

export default function DocumentUpload() {
  const navigate = useNavigate();
  const { session, incrementDocuments } = useSessionStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [aligned, setAligned] = useState(true);
  const [uploaded, setUploaded] = useState<CapturedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState('other');

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED.includes(file.type)) {
      return `"${file.name}" has an unsupported file type. Please upload a JPG, PNG, WebP, or PDF.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `"${file.name}" is larger than 15 MB. Please upload a smaller file.`;
    }
    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const next: CapturedDoc[] = [];
    for (const file of Array.from(files)) {
      const err = validateFile(file);
      if (err) {
        setError(err);
        continue;
      }
      next.push({ name: file.name, file, page: uploaded.length + next.length + 1 });
    }
    if (next.length > 0) {
      setUploaded((prev) => [...prev, ...next]);
      if (navigator.vibrate) navigator.vibrate(30);
      setAligned(true);
      incrementDocuments();
    }
  };

  const handleScan = () => {
    setError(null);
    setCapturing(true);
    // Real capture: opens the device camera on mobile/kiosk, file picker otherwise.
    fileInputRef.current?.click();
    // Reset after the picker closes; the file handler drives the success path.
    setTimeout(() => setCapturing(false), 1200);
  };

  const uploadAll = async (): Promise<boolean> => {
    if (!session?.id || uploaded.length === 0) return true;
    setUploading(true);
    let ok = true;
    try {
      for (const doc of uploaded) {
        const formData = new FormData();
        formData.append('session_id', String(session.id));
        formData.append('patient_id', String(session.patient_id || 0));
        formData.append('doc_type', docType);
        formData.append('file', doc.file, doc.name);
        await documentApi.upload(formData);
      }
    } catch (err) {
      ok = false;
      useToastStore.getState().addToast('error', getErrorMessage(err, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
    return ok;
  };

  const handleContinue = async () => {
    if (uploaded.length > 0) {
      const ok = await uploadAll();
      if (!ok) return; // stay on the page so the patient can retry or skip
    }
    navigate('/kiosk/summary');
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
          <p className="text-sm text-surface-500 mt-2 max-w-lg mx-auto">
            Your document is being securely processed and stored. This usually takes a few seconds.
          </p>
        </div>

        {/* Camera view with corner brackets */}
        <div className="w-full max-w-xl animate-fade-in">
          <div className="relative aspect-[4/3] rounded-[20px] overflow-hidden bg-gradient-to-br from-surface-200 to-surface-300 border border-surface-300 shadow-lg">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3/4 h-4/5 rounded-xl border-2 border-dashed border-surface-400 bg-white/60 flex flex-col items-center justify-center gap-3">
                <FileText className="w-12 h-12 text-surface-400" />
                {uploading ? (
                  <span className="shimmer text-lg font-semibold text-primary-700 rounded-full px-6 py-2">Uploading securely…</span>
                ) : capturing ? (
                  <span className="shimmer text-lg font-semibold text-primary-700 rounded-full px-6 py-2">Scanning…</span>
                ) : (
                  <>
                    <span className="text-lg text-surface-500">Align the document here</span>
                    <span className="text-sm text-surface-400">Accepts JPG, PNG, WebP, or PDF (max 15 MB)</span>
                  </>
                )}
              </div>
            </div>

            <div className="capture-frame absolute inset-0 pointer-events-none">
              <div className={`corner tl ${aligned ? '' : 'animate-corner-blink'}`} />
              <div className={`corner tr ${aligned ? '' : 'animate-corner-blink'}`} />
              <div className={`corner bl ${aligned ? '' : 'animate-corner-blink'}`} />
              <div className={`corner br ${aligned ? '' : 'animate-corner-blink'}`} />
            </div>

            {aligned && !capturing && !uploading && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <span className="inline-flex items-center gap-2 bg-success-600 text-white font-semibold px-4 py-2 rounded-full text-sm">
                  <Check className="w-4 h-4" /> Ready
                </span>
              </div>
            )}
          </div>

          {/* Hidden file input for real camera/file capture */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Capture control */}
          <div className="flex justify-center my-6">
            <button
              onClick={handleScan}
              disabled={capturing || uploading}
              className="relative w-[76px] h-[76px] rounded-full border-4 border-primary-600 bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform touch-target"
              aria-label="Capture or choose document"
            >
              <div className="w-14 h-14 rounded-full bg-primary-600" />
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="w-full max-w-xl mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Multi-page thumbnail gallery */}
        {uploaded.length > 0 && (
          <div className="w-full max-w-xl card p-5 mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-800">Captured Pages ({uploaded.length})</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {uploaded.map((doc) => (
                <div key={doc.page} className="shrink-0 w-24 text-center">
                  <div className="aspect-[3/4] rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 border border-primary-200 flex items-center justify-center overflow-hidden">
                    {doc.file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(doc.file)} alt={`Captured page ${doc.page}`} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-8 h-8 text-primary-600" />
                    )}
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
                onClick={() => setDocType(d.id)}
                aria-pressed={docType === d.id}
                className={`px-4 py-2 rounded-full border-2 text-sm font-medium bg-white transition-colors ${
                  docType === d.id
                    ? 'border-primary-500 text-primary-700'
                    : 'border-surface-200 text-surface-600 hover:border-primary-400 hover:text-primary-700'
                }`}
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
            onClick={handleContinue}
            disabled={uploading}
            className="touch-target flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-lg font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-600/25"
          >
            {uploading ? 'Uploading…' : uploaded.length > 0 ? 'Continue' : 'Skip'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <EmergencyFab />
    </div>
  );
}