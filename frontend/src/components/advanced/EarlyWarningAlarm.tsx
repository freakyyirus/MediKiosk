import { useEffect, useRef, useState } from 'react';
import { Siren, XCircle, CheckCircle2, Activity, HeartPulse, AlertTriangle } from 'lucide-react';

export interface AbnormalVital {
  label: string;
  value: string;
  reason: string;
  severity: 'critical' | 'warning';
}

interface EarlyWarningAlarmProps {
  alertType: string;
  alertTypeHindi?: string;
  severity: 'critical' | 'high' | 'medium';
  abnormalVitals: AbnormalVital[];
  confidenceScore?: number | null;
  onAcknowledge: () => void;
  onIgnore?: () => void;
  autoCloseMs?: number;
}

/**
 * Feature 5 — Early Warning Alarm.
 * Full-screen red flashing overlay with a continuous WW601/ambulance siren
 * generated via the Web Audio API (no asset file needed). Active vitals are
 * shown so the nurse/doctor sees exactly which readings tripped the alarm.
 */
export default function EarlyWarningAlarm({
  alertType,
  alertTypeHindi,
  severity,
  abnormalVitals,
  confidenceScore,
  onAcknowledge,
  onIgnore,
  autoCloseMs = 12000,
}: EarlyWarningAlarmProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Beastie siren loop via Web Audio API
  const startSiren = () => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.value = 0.08;
      master.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 700;
      osc.connect(master);

      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 1.4;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 200;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.start();
      lfo.start();
      audioCtxRef.current = ctx;
    } catch {
      /* Audio not permitted or unsupported — visual alarm still shows */
    }
  };

  useEffect(() => {
    startSiren();
    const t = setTimeout(onAcknowledge, autoCloseMs);
    return () => {
      clearTimeout(t);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const severityLabel = severity === 'critical' ? 'CRITICAL' : severity === 'high' ? 'HIGH' : 'MEDIUM';

  return (
    <div className="min-h-screen bg-gradient-to-br from-danger-700 via-danger-600 to-red-900 flex flex-col items-center justify-center px-6 relative overflow-hidden animate-fade-in">
      {/* Pulsing rings */}
      <div className="absolute w-[560px] h-[560px] rounded-full border-4 border-white/25 animate-emergency" />
      <div className="absolute w-[400px] h-[400px] rounded-full border-4 border-white/20 animate-emergency" style={{ animationDelay: '0.4s' }} />
      <div className="absolute w-[260px] h-[260px] rounded-full border-4 border-white/15 animate-emergency" style={{ animationDelay: '0.8s' }} />

      <div className="relative z-10 text-center w-full max-w-2xl animate-scale-in">
        <span className="inline-flex items-center gap-2 bg-white/20 text-white font-black px-6 py-2.5 rounded-full text-xl tracking-widest mb-6">
          <Siren className="w-6 h-6 animate-pulse" /> EARLY WARNING ALARM
        </span>

        <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-3 animate-emergency">
          {alertTypeHindi || alertType.replace(/_/g, ' ')}
        </h1>
        <p className="text-white/90 text-2xl font-medium mb-8">
          {severityLabel} — vitals crossed threshold
        </p>

        {/* Confidence */}
        {confidenceScore != null && (
          <p className="text-white/80 text-lg font-semibold mb-4">
            Alert confidence: {(confidenceScore * 100).toFixed(0)}%
          </p>
        )}

        {/* Vitals list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-xl mx-auto">
          {abnormalVitals.map((v, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-left flex items-start gap-3 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              {v.severity === 'critical' ? (
                <HeartPulse className="w-7 h-7 text-white shrink-0 animate-pulse" />
              ) : (
                <Activity className="w-7 h-7 text-white/90 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-white font-bold flex items-center gap-1.5">{v.label}</p>
                <p className="text-white/90 text-sm font-semibold">{v.value}</p>
                <p className="text-white/70 text-xs">{v.reason}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => { setConfirmed(true); onAcknowledge(); }}
            className="touch-target-lg flex-[1.2] bg-white text-danger-700 text-2xl font-black rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
          >
            <CheckCircle2 className="w-7 h-7" /> {confirmed ? 'Notified' : "I'm Here — Notify Staff"}
          </button>
          {onIgnore && (
            <button
              onClick={onIgnore}
              className="touch-target-lg flex-1 border-4 border-white/70 text-white text-2xl font-bold rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-white/10"
            >
              <XCircle className="w-7 h-7" /> False Alarm
            </button>
          )}
        </div>

        <p className="mt-8 text-white/75 text-lg flex items-center justify-center gap-2">
          <Siren className="w-5 h-5 animate-pulse" /> Audio alarm playing · Staff dashboard alerted
        </p>
      </div>
    </div>
  );
}