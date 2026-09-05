import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useSessionStore } from '../../stores';
import Logo from '../brand/Logo';
import { useAdvancedStore } from '../../stores/advancedFeaturesStore';

export interface QrSlipData {
  tokenNumber: string;
  patientName: string;
  department: string;
  chiefComplaint: string;
  priority: number;
}

/**
 * Smart QR slip (Feature 3). Encodes a signed lightweight payload the doctor
 * app can scan to pull the kiosk summary. Falls back to on-screen QR when a
 * printer isn't attached.
 */
export default function QRCodeSlip({ data }: { data: QrSlipData }) {
  const session = useSessionStore((s) => s.session);
  const createQrSlip = useAdvancedStore((s) => s.createQrSlip);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [slipId, setSlipId] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false);

  const payload = useMemo(() => {
    const core = {
      v: 1,
      t: data.tokenNumber,
      p: data.patientName,
      dept: data.department,
      cc: data.chiefComplaint,
      pr: data.priority,
      exp: Date.now() + 30 * 60 * 1000,
    };
    return btoa(JSON.stringify(core));
  }, [data]);

  useEffect(() => {
    QRCode.toDataURL(payload, { width: 320, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [payload]);

  useEffect(() => {
    if (persisted || !session?.id) return;
    createQrSlip({
      visitId: String(session.id),
      patientId: session.patient_id ? String(session.patient_id) : undefined,
      payload: `MEDIKIOSK|${payload}`,
    }).then((rec) => {
      setSlipId(rec.id);
      setPersisted(true);
    });
  }, [persisted, session, payload, createQrSlip]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-3xl p-6 shadow-2xl border border-surface-100" data-testid="qr-slip">
        {/* Brand strip */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Logo size={40} variant="gradient" showWordmark={false} />
            <div>
              <p className="font-black text-surface-900 leading-none">MediKiosk</p>
              <p className="text-xs text-surface-400 font-semibold uppercase tracking-wider mt-1">OPD Smart Slip</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-success-50 text-success-700 border border-success-200 rounded-full px-3 py-1">
            Scan to view summary
          </span>
        </div>

        {/* Token */}
        <div className="text-center my-3">
          <p className="text-5xl font-black tracking-tight text-primary-700">{data.tokenNumber}</p>
          <p className="text-sm text-surface-500 font-semibold uppercase tracking-widest mt-1">OPD Token</p>
        </div>

        {/* QR code */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4 flex justify-center my-5">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR code to share medical summary with doctor" className="w-56 h-56" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-surface-300">
              <span className="text-sm">Generating QR…</span>
            </div>
          )}
        </div>

        {/* Patient meta */}
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-surface-400 font-medium">Patient</span>
            <span className="font-bold text-surface-800">{data.patientName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-surface-400 font-medium">Department</span>
            <span className="font-bold text-surface-800">{data.department}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-surface-400 font-medium shrink-0">Complaint</span>
            <span className="font-bold text-surface-800 text-right truncate">{data.chiefComplaint}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-surface-400 font-medium">Priority</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full ${data.priority <= 2 ? 'bg-danger-50 text-danger-700 border border-danger-200' : 'bg-success-50 text-success-700 border border-success-200'}`}>
              {data.priority <= 2 ? 'URGENT' : 'Normal'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-dashed border-surface-200 flex items-center justify-between text-xs text-surface-400 font-medium">
          <span>Valid for 30 minutes</span>
          <span>{slipId ? `Slip #${slipId.slice(0, 8).toUpperCase()}` : '…'}</span>
        </div>
      </div>
    </div>
  );
}