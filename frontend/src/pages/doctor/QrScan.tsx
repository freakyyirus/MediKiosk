import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, ScanLine, KeyRound, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DecodedSlip {
  token: string;
  patientName: string;
  department: string;
  chiefComplaint: string;
  priority: number;
  validUntil: number;
}

function decodePayload(raw: string): DecodedSlip | null {
  const text = raw.startsWith('MEDIKIOSK|') ? raw.slice('MEDIKIOSK|'.length) : raw;
  try {
    const json = JSON.parse(atob(text));
    return {
      token: json.t,
      patientName: json.p,
      department: json.dept,
      chiefComplaint: json.cc,
      priority: json.pr,
      validUntil: json.exp,
    };
  } catch {
    return null;
  }
}

export default function DoctorQrScan() {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [decoded, setDecoded] = useState<DecodedSlip | null>(null);
  const [invalidCode, setInvalidCode] = useState(false);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        /* noop */
      }
      scannerRef.current = null;
      setCameraActive(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const scanner = new Html5Qrcode('qr-reader-region');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          const slip = decodePayload(decodedText);
          if (slip && slip.validUntil > Date.now()) {
            setDecoded(slip);
            stopCamera();
          } else {
            setInvalidCode(true);
          }
        },
        () => {}
      );
      setCameraActive(true);
    } catch {
      setCameraError('Camera unavailable. Use manual entry below.');
    }
  };

  const handleManualSubmit = () => {
    const slip = decodePayload(manualCode.trim());
    if (slip && slip.validUntil > Date.now()) {
      setInvalidCode(false);
      setDecoded(slip);
    } else {
      setInvalidCode(true);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900">
      <header className="bg-white border-b border-surface-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/doctor/dashboard')} className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center hover:bg-surface-200" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Scan Smart QR Slip</h1>
          <p className="text-sm text-surface-500">Point the camera at the patient's kiosk slip</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        {!decoded ? (
          <>
            {/* Camera region */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold">Camera Scanner</h2>
              </div>
              <div id="qr-reader-region" className="w-full aspect-square bg-surface-900 rounded-2xl overflow-hidden" />
              {cameraError && (
                <div className="mt-3 flex items-center gap-2 text-warning-700 bg-warning-50 border border-warning-200 rounded-xl px-4 py-3 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {cameraError}
                </div>
              )}
              <div className="mt-4 flex gap-3">
                {!cameraActive ? (
                  <button
                    onClick={startCamera}
                    className="touch-target flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl py-3 flex items-center justify-center gap-2"
                  >
                    <ScanLine className="w-5 h-5" /> Start Camera
                  </button>
                ) : (
                  <button onClick={stopCamera} className="touch-target flex-1 bg-surface-200 hover:bg-surface-300 text-surface-700 font-bold rounded-2xl py-3">
                    Stop Camera
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 border-t border-surface-200" />
              <span className="text-sm font-semibold text-surface-400 uppercase">or</span>
              <div className="flex-1 border-t border-surface-200" />
            </div>

            {/* Manual entry */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold">Manual Entry</h2>
              </div>
              <textarea
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Paste QR payload, e.g. MEDIKIOSK|eyJ0IjoiQS00MiIs..."
                rows={3}
                className="w-full rounded-2xl border-2 border-surface-200 p-4 text-sm focus:border-primary-400 outline-none"
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="touch-target mt-3 w-full bg-surface-900 hover:bg-surface-800 text-white font-bold rounded-2xl py-3 disabled:opacity-40"
              >
                Decode Payload
              </button>
              {invalidCode && (
                <p className="mt-3 text-sm font-semibold text-danger-600">Invalid or expired code.</p>
              )}
              <button
                onClick={() => setManualCode('MEDIKIOSK|' + btoa(JSON.stringify({ v: 1, t: 'A-42', p: 'Demo Patient', dept: 'Cardiology', cc: 'Chest pain, breathlessness', pr: 2, exp: Date.now() + 30 * 60 * 1000 })))}
                className="mt-3 text-sm text-primary-600 font-semibold"
              >
                Use demo payload
              </button>
            </div>
          </>
        ) : (
          <div className="animate-fade-in">
            <div className="card p-8 text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 52 52" className="w-8 h-8">
                  <path className="draw-check" fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" d="M14 27l8 8 16-17" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-success-700">Slip Verified</h2>
              <p className="text-surface-500 mt-1">Valid until {new Date(decoded.validUntil).toLocaleTimeString()}</p>
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="text-lg font-bold border-b border-surface-100 pb-3">Patient Summary</h3>
              <div className="flex justify-between">
                <span className="text-surface-400 font-medium">OPD Token</span>
                <span className="font-black text-primary-700 text-lg">{decoded.token}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400 font-medium">Patient Name</span>
                <span className="font-bold">{decoded.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400 font-medium">Department</span>
                <span className="font-bold">{decoded.department}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-surface-400 font-medium shrink-0">Chief Complaint</span>
                <span className="font-bold text-right">{decoded.chiefComplaint}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-400 font-medium">Priority</span>
                <span className={`font-bold px-3 py-1 rounded-full ${decoded.priority <= 2 ? 'bg-danger-50 text-danger-700 border border-danger-200' : 'bg-success-50 text-success-700 border border-success-200'}`}>
                  {decoded.priority <= 2 ? 'URGENT' : 'Normal'}
                </span>
              </div>

              {decoded.priority <= 2 && (
                <div className="bg-danger-50 border border-danger-200 rounded-xl p-3 flex items-start gap-2 text-danger-700 text-sm font-medium">
                  <AlertTriangle className="w-5 h-5 shrink-0" /> High-priority patient — consider fast-tracking this case.
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setDecoded(null)} className="touch-target flex-1 card py-3 font-semibold text-surface-600 hover:border-primary-300">
                Scan Another
              </button>
              <button onClick={() => navigate(`/doctor/patient/${decoded.token}`)} className="touch-target flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl py-3 flex items-center justify-center gap-2">
                Open Patient Card
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}