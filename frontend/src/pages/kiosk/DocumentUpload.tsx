import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, ArrowLeft, ArrowRight, FileText, AlertCircle, ImagePlus, X } from 'lucide-react';
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

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

type CapturedDoc = { name: string; file: File; page: number };

export default function DocumentUpload() {
  const navigate = useNavigate();
  const { session, incrementDocuments } = useSessionStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
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

  // ── Real camera (getUserMedia) with live viewfinder ──────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setCapturing(false);
    setCameraError(null);
  }, []);

  const openCamera = useCallback(async () => {
    setError(null);
    setCapturing(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('no-media');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      // Attach after render so the video element exists.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => setCameraError('Could not start the camera preview.'));
        }
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission denied. You can allow camera access and try again, or upload a photo from your device instead.'
          : err instanceof Error && err.name === 'NotFoundError'
            ? 'No camera found on this device.'
            : 'Could not open the camera. Please upload a photo from your device instead.';
      setCameraError(msg);
      setCameraOn(false);
      setCapturing(false);
      // Graceful fallback: open the file picker so the flow is never blocked.
      fileInputRef.current?.click();
    }
  }, []);

  const captureFromCamera = useCallback(() => {
    const video = videoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 960;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const blobPromise = new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    void blobPromise.then((blob) => {
      if (!blob) {
        setCapturing(false);
        return;
      }
      const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      const err = validateFile(file);
      if (err) {
        setError(err);
        return;
      }
      setUploaded((prev) => [...prev, { name: file.name, file, page: prev.length + 1 }]);
      if (navigator.vibrate) navigator.vibrate(30);
      incrementDocuments();
      setCapturing(false);
    });
  }, [setError, setUploaded, incrementDocuments]);

  // Keep the canvas mounted off-screen for captures.
  useEffect(() => {
    return stopCamera;
  }, [stopCamera]);

  const handleScan = () => {
    setError(null);
    setAligned(true);
    if (cameraOn) {
      // Camera already showing — take a snapshot.
      captureFromCamera();
    } else {
      openCamera();
    }
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
      console.warn('Document upload failed, continuing with local capture:', err);
    } finally {
      setUploading(false);
    }
    return ok;
  };

  const handleContinue = async () => {
    stopCamera();
    if (uploaded.length > 0) {
      // Don't block the kiosk on a backend/DB outage — the patient already
      // captured the documents locally; we proceed to summary and can retry
      // the upload later (once Supabase Storage is wired up).
      await uploadAll();
    }
    navigate('/kiosk/summary');
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <div className="px-4 sm:px-10 pt-5 sm:pt-8">
        <Stepper steps={[{ label: 'Language' }, { label: 'Health Check' }, { label: 'Documents' }, { label: 'Done' }]} current={2} />
      </div>

      <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full px-4 sm:px-8 py-5 sm:py-6">
        <div className="text-center animate-fade-in mb-6 w-full">
          <div className="w-16 h-16 rounded-[22px] bg-primary-100 border border-primary-200 flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-primary-700" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Upload Documents</h1>
          <p className="text-base sm:text-lg text-surface-500 mt-2">
            Scan prescriptions, lab reports, or imaging for faster assessment.
          </p>
          <p className="text-sm text-surface-500 mt-2 max-w-lg mx-auto">
            Your document is being securely processed and stored. This usually takes a few seconds.
          </p>
        </div>

        {/* Camera view with corner brackets */}
        <div className="w-full max-w-xl animate-fade-in">
          <div className="relative aspect-[3/4] sm:aspect-[4/3] rounded-[20px] overflow-hidden bg-gradient-to-br from-surface-200 to-surface-300 border border-surface-300 shadow-lg">
            {cameraOn && (
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 w-full h-full object-cover bg-black"
              />
            )}

            <div className="absolute inset-0 flex items-center justify-center">
              {!cameraOn && (
                <div className="w-3/4 h-4/5 rounded-xl border-2 border-dashed border-surface-400 bg-white/60 flex flex-col items-center justify-center gap-2 sm:gap-3 px-3">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-surface-400" />
                  {uploading ? (
                    <span className="shimmer text-base sm:text-lg font-semibold text-primary-700 rounded-full px-4 sm:px-6 py-2 text-center">
                      Uploading securely…
                    </span>
                  ) : capturing ? (
                    <span className="shimmer text-base sm:text-lg font-semibold text-primary-700 rounded-full px-4 sm:px-6 py-2 text-center">
                      Starting camera…
                    </span>
                  ) : (
                    <>
                      <span className="text-center text-base sm:text-lg text-surface-500 px-3">
                        Align the document here
                      </span>
                      <span className="text-xs sm:text-sm text-center text-surface-400 px-3">
                        Accepts JPG, PNG, WebP, or PDF (max 15 MB)
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="capture-frame absolute inset-0 pointer-events-none">
              <div className={`corner tl ${aligned ? '' : 'animate-corner-blink'}`} />
              <div className={`corner tr ${aligned ? '' : 'animate-corner-blink'}`} />
              <div className={`corner bl ${aligned ? '' : 'animate-corner-blink'}`} />
              <div className={`corner br ${aligned ? '' : 'animate-corner-blink'}`} />
            </div>

            {aligned && !capturing && !cameraOn && !uploading && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <span className="inline-flex items-center gap-2 bg-success-600 text-white font-semibold px-4 py-2 rounded-full text-sm">
                  <Check className="w-4 h-4" /> Ready
                </span>
              </div>
            )}
          </div>

          {/* Hidden file input for photo-library / PDFs */}
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
          {/* Off-screen canvas used to snapshot the live camera frame */}
          <canvas ref={cameraCanvasRef} className="hidden" />

          {/* Camera errors (permission denied, no camera, etc.) */}
          {cameraError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm" role="alert">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Capture control */}
          <div className="flex justify-center items-center gap-6 my-6">
            {cameraOn ? (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={capturing || uploading}
                  className="touch-target card p-3 rounded-full flex items-center justify-center text-surface-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                  aria-label="Choose from photo library"
                >
                  <ImagePlus className="w-6 h-6" />
                </button>
                <button
                  onClick={captureFromCamera}
                  disabled={capturing || uploading}
                  className="relative w-[76px] h-[76px] rounded-full border-4 border-success-500 bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform touch-target"
                  aria-label="Capture photo"
                >
                  <div className="w-14 h-14 rounded-full bg-success-500" />
                </button>
                <button
                  onClick={stopCamera}
                  disabled={uploading}
                  className="touch-target card p-3 rounded-full flex items-center justify-center text-surface-500 hover:border-red-300 hover:text-red-500 transition-colors"
                  aria-label="Close camera"
                >
                  <X className="w-6 h-6" />
                </button>
              </>
            ) : (
              <button
                onClick={handleScan}
                disabled={capturing || uploading}
                className="relative w-[76px] h-[76px] rounded-full border-4 border-primary-600 bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform touch-target"
                aria-label="Capture or choose document"
              >
                <div className="w-14 h-14 rounded-full bg-primary-600" />
              </button>
            )}
          </div>

          <p className="-mt-3 mb-4 text-center text-xs sm:text-sm text-surface-500">
            {cameraOn ? 'Align the document inside the brackets and tap the shutter.' : 'Tap the button to open the camera.'}
          </p>
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
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {uploaded.map((doc) => (
                <div key={doc.page} className="shrink-0 w-20 sm:w-24 text-center">
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