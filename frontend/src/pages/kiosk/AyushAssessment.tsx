import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, Sparkles } from 'lucide-react';
import Stepper from '../../components/Stepper';
import EmergencyFab from '../../components/EmergencyFab';

/**
 * AYUSH mode — Tridosha assessment.
 * Teal-purple gradient theme with dosha radar chart + circular diagrams.
 */

const DOSHAS = [
  { key: 'vata', label: 'Vāta', color: '#6b4ee6', desc: 'Movement · Air & Space' },
  { key: 'pitta', label: 'Pitta', color: '#ff8c69', desc: 'Transformation · Fire & Water' },
  { key: 'kapha', label: 'Kapha', color: '#2dd4bf', desc: 'Structure · Earth & Water' },
];

const RADAR = {
  vata: 62,
  pitta: 78,
  kapha: 35,
};

function TridoshaRadar() {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 30;

  const point = (angleDeg: number, value: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const scaled = (value / 100) * r;
    return [cx + scaled * Math.cos(rad), cy + scaled * Math.sin(rad)];
  };

  const axes = [
    { deg: 90, color: '#6b4ee6', label: 'Vāta', val: RADAR.vata },
    { deg: 210, color: '#ff8c69', label: 'Pitta', val: RADAR.pitta },
    { deg: 330, color: '#2dd4bf', label: 'Kapha', val: RADAR.kapha },
  ];

  const polygon = axes.map((a) => point(a.deg, a.val).join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar-chart max-w-[280px] mx-auto">
      {/* grid rings */}
      {[0.33, 0.66, 1].map((f) => (
        <polygon
          key={f}
          points={axes.map((a) => point(a.deg, 100 * f).join(',')).join(' ')}
          fill="none"
          stroke="#e7e4f5"
          strokeWidth="1"
        />
      ))}
      {/* axes */}
      {axes.map((a) => {
        const [x, y] = point(a.deg, 100);
        return <line key={a.deg} x1={cx} y1={cy} x2={x} y2={y} stroke="#e7e4f5" strokeWidth="1" />;
      })}
      {/* data polygon */}
      <polygon points={polygon} fill="rgba(107,78,230,0.15)" stroke="#6b4ee6" strokeWidth="2.5" strokeLinejoin="round" />
      {/* vertex dots + labels */}
      {axes.map((a) => {
        const [px, py] = point(a.deg, a.val);
        const [lx, ly] = point(a.deg, 118);
        return (
          <g key={a.deg}>
            <circle cx={px} cy={py} r="5" fill={a.color} />
            <text x={lx} y={ly} textAnchor="middle" fontSize="13" fontWeight="700" fill="#453f66">
              {a.label} {a.val}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DoshaRing({ color, label, value }: { color: string; label: string; value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const filled = (value / 100) * c;
  return (
    <div className="flex flex-col items-center text-center w-20 sm:w-24">
      <div className="relative w-14 h-14 sm:w-16 sm:h-16">
        <svg viewBox="0 0 64 64" className="w-14 h-14 sm:w-16 sm:h-16 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#efeaff" strokeWidth="6" />
          <circle
            cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${filled} ${c - filled}`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-surface-800">{value}</span>
      </div>
      <span className="mt-2 font-bold text-sm sm:text-base text-surface-700" style={{ color }}>{label}</span>
    </div>
  );
}

export default function AyushAssessment() {
  const navigate = useNavigate();

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.lang = 'en-IN';
      speechSynthesis.speak(u);
    }
  };

  const dominant = 'Pitta';

  return (
    <div className="min-h-screen ayush-mode flex flex-col">
      <div className="px-4 sm:px-10 pt-5 sm:pt-8">
        <div className="max-w-3xl mx-auto">
          <Stepper
            steps={[
              { label: 'Language' },
              { label: 'Assessment' },
              { label: 'Dosha' },
              { label: 'Done' },
            ]}
            current={2}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full px-4 sm:px-8 py-5 sm:py-6">
        <div className="text-center animate-fade-in mb-6">
          <div className="inline-flex items-center gap-2 text-sm font-bold tracking-wider uppercase text-accent-700 bg-accent-50 border border-accent-200 px-4 py-1.5 rounded-full mb-4">
            <Sparkles className="w-4 h-4" /> AYUSH Mode
          </div>
          <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-primary-700 via-primary-600 to-accent-500 bg-clip-text text-transparent">
            Your Tridosha Profile
          </h1>
          <p className="text-base sm:text-lg text-surface-500 mt-3 max-w-xl mx-auto">
            Ancient wisdom, modern care. Your dominant dosha is <span className="font-bold text-accent-600">{dominant}</span>.
          </p>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Radar chart */}
          <div className="card p-4 sm:p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="font-bold text-lg text-surface-800">Dosha Balance</h3>
              <button className="audio-btn" aria-label="Hear dosha summary" onClick={() => speak(`Your dominant dosha is ${dominant} at 78 percent.`)}>
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            <TridoshaRadar />
            <p className="text-sm text-surface-500 mt-2">Measured from your health history</p>
          </div>

          {/* Circular dosha diagrams */}
          <div className="card p-4 sm:p-6 flex flex-col justify-center">
            <h3 className="font-bold text-lg text-surface-800 text-center mb-4">Dosha Breakdown</h3>
            <div className="flex justify-center gap-2 sm:gap-4">
              {DOSHAS.map((d) => (
                <DoshaRing key={d.key} color={d.color} label={d.label} value={RADAR[d.key as keyof typeof RADAR]} />
              ))}
            </div>
            <div className="mt-6 space-y-2">
              {DOSHAS.map((d) => (
                <div key={d.key} className="flex items-center gap-2 sm:gap-3 text-surface-700">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="font-semibold w-20 shrink-0">{d.label}</span>
                  <span className="text-surface-500 text-sm">{d.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full card p-5 sm:p-6 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-bold text-lg text-surface-800">Balance & Lifestyle Tips</h3>
            <button className="audio-btn" aria-label="Hear tips" onClick={() => speak('To balance Pitta, stay cool, avoid spicy food, and get restful sleep.')}>
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-base sm:text-lg text-surface-600 leading-relaxed">
            To balance <span className="font-bold text-coral-500">Pitta</span>, keep cool with fresh foods and hydrating drinks.
            These suggestions are general wellness guidance — your physician will interpret your full report.
          </p>
        </div>

        <div className="w-full flex items-center gap-2">
          <button onClick={() => navigate('/kiosk/interview')} className="card touch-target px-5 flex items-center justify-center text-surface-500 hover:border-surface-300" aria-label="Back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => navigate('/kiosk/documents')}
            className="flex-1 touch-target bg-gradient-to-r from-primary-600 to-accent-500 hover:from-primary-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-primary-600/30 transition-all"
          >
            Continue
          </button>
        </div>
      </div>

      <EmergencyFab />
    </div>
  );
}
