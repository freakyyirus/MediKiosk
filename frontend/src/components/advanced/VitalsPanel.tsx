import { useState } from 'react';
import { Activity, HeartPulse, Thermometer, Wind, Weight, Droplets, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { advancedApi } from '../../api/client';
import { useAdvancedStore, type VitalsReading } from '../../stores/advancedFeaturesStore';

interface VitalsPanelProps {
  patientId?: string;
  visitId?: string;
  onEmergency: (alert: { alertType: string; alertTypeHindi?: string; severity: 'critical' | 'high' | 'medium'; abnormalVitals: AbnormalVital[]; confidenceScore: number }) => void;
}

export interface AbnormalVital {
  label: string;
  value: string;
  reason: string;
  severity: 'critical' | 'warning';
}

// Thresholds (Indian clinical context)
const THRESHOLDS = {
  spo2: { warning: 94, critical: 90 },
  pulse: { warningHigh: 110, criticalHigh: 130, criticalLow: 45 },
  bpHigh: { warningSys: 140, criticalSys: 180, warningDia: 90, criticalDia: 110 },
  temp: { warningHigh: 38.5, criticalHigh: 40.5, warningLow: 35.5, criticalLow: 35 },
};

export function analyzeVitals(input: Partial<VitalsReading>): AbnormalVital[] {
  const flags: AbnormalVital[] = [];
  const { spo2, pulse_rate, bp_systolic, bp_diastolic, temperature } = input;

  if (spo2 != null) {
    if (spo2 < THRESHOLDS.spo2.critical) flags.push({ label: 'Oxygen (SpO2)', value: `${spo2}%`, reason: 'Severe hypoxia — emergency', severity: 'critical' });
    else if (spo2 < THRESHOLDS.spo2.warning) flags.push({ label: 'Oxygen (SpO2)', value: `${spo2}%`, reason: 'Below 94% — monitor closely', severity: 'warning' });
  }

  if (pulse_rate != null) {
    if (pulse_rate >= THRESHOLDS.pulse.criticalHigh || pulse_rate <= THRESHOLDS.pulse.criticalLow)
      flags.push({ label: 'Pulse Rate', value: `${pulse_rate} bpm`, reason: 'Critical tachycardia/bradycardia', severity: 'critical' });
    else if (pulse_rate >= THRESHOLDS.pulse.warningHigh)
      flags.push({ label: 'Pulse Rate', value: `${pulse_rate} bpm`, reason: 'Elevated heart rate', severity: 'warning' });
  }

  if (bp_systolic != null) {
    const high = bp_systolic >= THRESHOLDS.bpHigh.criticalSys || (bp_diastolic != null && bp_diastolic >= THRESHOLDS.bpHigh.criticalDia);
    if (high) flags.push({ label: 'Blood Pressure', value: `${bp_systolic}/${bp_diastolic ?? '—'}`, reason: 'Hypertensive crisis', severity: 'critical' });
    else if (bp_systolic >= THRESHOLDS.bpHigh.warningSys || (bp_diastolic != null && bp_diastolic >= THRESHOLDS.bpHigh.warningDia))
      flags.push({ label: 'Blood Pressure', value: `${bp_systolic}/${bp_diastolic ?? '—'}`, reason: 'Above 140/90 — review', severity: 'warning' });
  }

  if (temperature != null) {
    if (temperature >= THRESHOLDS.temp.criticalHigh)
      flags.push({ label: 'Temperature', value: `${temperature.toFixed(1)}°C`, reason: 'Very high fever', severity: 'critical' });
    else if (temperature >= THRESHOLDS.temp.warningHigh)
      flags.push({ label: 'Temperature', value: `${temperature.toFixed(1)}°C`, reason: 'Fever — monitor', severity: 'warning' });
    else if (temperature <= THRESHOLDS.temp.criticalLow)
      flags.push({ label: 'Temperature', value: `${temperature.toFixed(1)}°C`, reason: 'Hypothermia risk', severity: 'critical' });
    else if (temperature <= THRESHOLDS.temp.warningLow)
      flags.push({ label: 'Temperature', value: `${temperature.toFixed(1)}°C`, reason: 'Low temperature', severity: 'warning' });
  }

  return flags;
}

const SensorCard = ({ icon: Icon, title, unit, value, onChange, badge, placeholder }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  badge?: string;
  placeholder?: string;
}) => (
  <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-white border border-surface-200 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <p className="font-bold text-surface-800 leading-none">{title}</p>
          <p className="text-xs text-surface-400 font-medium mt-0.5">{badge || unit}</p>
        </div>
      </div>
    </div>
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border-2 border-surface-200 bg-white px-3 py-2.5 pr-10 text-lg font-bold text-surface-800 outline-none focus:border-primary-400"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 font-semibold text-sm">{unit}</span>
    </div>
  </div>
);

export default function VitalsPanel({ patientId, visitId, onEmergency }: VitalsPanelProps) {
  const addVitals = useAdvancedStore((s) => s.addVitals);
  const [spo2, setSpo2] = useState('');
  const [pulse, setPulse] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [temp, setTemp] = useState('');
  const [weight, setWeight] = useState('');
  const [sensorType, setSensorType] = useState('manual');
  const [lastFlags, setLastFlags] = useState<AbnormalVital[]>([]);
  const [saved, setSaved] = useState(false);
  const [backendHit, setBackendHit] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);

  const handleSave = async (raiseEvenIfNormal = false) => {
    const reading: Partial<VitalsReading> = {
      patient_id: patientId,
      visit_id: visitId,
      sensor_type: sensorType,
      spo2: spo2 ? Number(spo2) : null,
      pulse_rate: pulse ? Number(pulse) : null,
      bp_systolic: bpSys ? Number(bpSys) : null,
      bp_diastolic: bpDia ? Number(bpDia) : null,
      temperature: temp ? Number(temp) : null,
      weight: weight ? Number(weight) : null,
    };
    let flags = analyzeVitals(reading);

    // Backend verification (best-effort — falls back to local thresholds).
    try {
      const res = await advancedApi.vitalsAnalyze({
        spo2: reading.spo2,
        pulse: reading.pulse_rate,
        bp_systolic: reading.bp_systolic,
        bp_diastolic: reading.bp_diastolic,
        temperature: reading.temperature,
      });
      const backendFlags: AbnormalVital[] = (res.data.flags || []).map((f) => ({
        label: f.label,
        value: f.value,
        reason: f.reason,
        severity: f.severity === 'critical' ? 'critical' : 'warning',
      }));
      if (backendFlags.length > 0) flags = backendFlags;
      setBackendHit(true);
    } catch {
      setBackendHit(false);
    }

    setLastFlags(flags);
    setSaved(true);

    const critical = flags.filter((f) => f.severity === 'critical');
    await addVitals({
      ...reading,
      is_abnormal: flags.length > 0,
      abnormal_reason: flags.length > 0 ? flags.map((f) => `${f.label}: ${f.reason}`).join('; ') : null,
    });

    if (critical.length > 0 && !raiseEvenIfNormal) {
      setAlarmActive(true);
      onEmergency({
        alertType: 'Critical vitals alarm',
        alertTypeHindi: 'महत्वपूर्ण लक्षण अलार्म',
        severity: 'critical',
        abnormalVitals: critical,
        confidenceScore: 0.97,
      });
    }
    setTimeout(() => setSaved(false), 3000);
  };

  if (alarmActive) return null;

  const filled = spo2 || pulse || bpSys || bpDia || temp || weight;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-black text-lg text-surface-900 tracking-tight">Vitals Capture</p>
          <p className="text-sm text-surface-400 font-medium">Feature 4 · connected sensors or manual entry</p>
        </div>
        <select
          value={sensorType}
          onChange={(e) => setSensorType(e.target.value)}
          className="rounded-xl border-2 border-surface-200 bg-white px-3 py-2 text-sm font-semibold text-surface-700 outline-none focus:border-primary-400"
        >
          <option value="manual">Manual input</option>
          <option value="pulse_oximeter">Pulse oximeter</option>
          <option value="bp_monitor">BP monitor</option>
          <option value="thermometer">Thermometer</option>
          <option value="weighing_scale">Weighing scale</option>
          <option value="multi_parameter">Multi-parameter</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SensorCard icon={Wind} title="Oxygen" unit="%" value={spo2} onChange={setSpo2} badge="SpO2 · normal 95-100" placeholder="98" />
        <SensorCard icon={HeartPulse} title="Pulse" unit="bpm" value={pulse} onChange={setPulse} badge="Resting 60-100" placeholder="76" />
        <SensorCard icon={Droplets} title="BP Systolic" unit="mmHg" value={bpSys} onChange={setBpSys} badge="Below 140" placeholder="120" />
        <SensorCard icon={Droplets} title="BP Diastolic" unit="mmHg" value={bpDia} onChange={setBpDia} badge="Below 90" placeholder="80" />
        <SensorCard icon={Thermometer} title="Temperature" unit="°C" value={temp} onChange={setTemp} badge="Normal 36-37.5" placeholder="36.8" />
        <SensorCard icon={Weight} title="Weight" unit="kg" value={weight} onChange={setWeight} badge="Optional" placeholder="65" />
      </div>

      {lastFlags.length > 0 && (
        <div className={`mt-4 rounded-2xl border p-4 flex items-start gap-3 animate-fade-in ${
          lastFlags.some((f) => f.severity === 'critical') ? 'bg-danger-50 border-danger-200' : 'bg-warning-50 border-warning-200'
        }`}>
          <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${lastFlags.some((f) => f.severity === 'critical') ? 'text-danger-600' : 'text-warning-600'}`} />
          <div>
            <p className="font-bold text-surface-900">Abnormal readings detected</p>
            {lastFlags.map((f, i) => (
              <p key={i} className="text-sm text-surface-700 font-medium">{f.label}: {f.value} — {f.reason}</p>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => handleSave()}
        disabled={!filled}
        className="touch-target mt-4 w-full bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 disabled:text-surface-500 text-white font-bold rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-colors"
      >
        <Zap className="w-5 h-5" /> {saved ? 'Vitals Saved & Analyzed' : 'Save & Analyze Vitals'}
      </button>
      <p className="mt-2 text-center text-xs text-surface-400 font-medium">
        {filled ? 'Critical thresholds trigger the early-warning alarm automatically.' : 'Enter at least one reading.'}
      </p>
      <p className="mt-1 text-center text-xs font-semibold flex items-center justify-center gap-1.5">
        {backendHit ? (
          <><CheckCircle2 className="w-3.5 h-3.5 text-success-500" /> <span className="text-success-600">Verified by backend vitals engine</span></>
        ) : saved ? (
          <span className="text-warning-600">Backend offline — used local thresholds</span>
        ) : null}
      </p>
    </div>
  );
}