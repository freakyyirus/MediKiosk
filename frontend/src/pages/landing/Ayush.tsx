import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Wind, Flame, Droplet } from 'lucide-react';
import { Section, SectionLabel, fadeUp } from './motion';

function RadarChart() {
  const size = 380;
  const cx = size / 2, cy = size / 2, r = size / 2 - 46;
  const axes = [
    { deg: 90, val: 0.62, color: '#7C9CC0', label: 'Vata', sans: 'वात' },
    { deg: 210, val: 0.78, color: '#FF8C69', label: 'Pitta', sans: 'पित्त' },
    { deg: 330, val: 0.35, color: '#2DD4BF', label: 'Kapha', sans: 'कफ' },
  ];
  const pt = (deg: number, v: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * v * Math.cos(rad), cy + r * v * Math.sin(rad)];
  };
  const poly = axes.map((a) => pt(a.deg, a.val).join(',')).join(' ');
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <svg ref={ref} viewBox={`0 0 ${size} ${size}`} className="w-[320px] max-w-full mx-auto" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6B4EE6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#6B4EE6" stopOpacity="0.02" />
        </radialGradient>
      </defs>
      {/* concentric rings */}
      {[0.33, 0.66, 1].map((f) => (
        <polygon key={f} points={axes.map((a) => pt(a.deg, f).join(',')).join(' ')} fill="none" stroke="#6B4EE6" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />
      ))}
      {/* axes + labels */}
      {axes.map((a) => {
        const [x, y] = pt(a.deg, 1);
        const [lx, ly] = pt(a.deg, 1.18);
        const [sx, sy] = pt(a.deg, 1.3);
        return (
          <g key={a.deg}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#6B4EE6" strokeOpacity="0.25" />
            <text x={lx} y={ly} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1A1A2E">{a.label}</text>
            <text x={sx} y={sy} textAnchor="middle" fontSize="11" fill="#9CA3AF">{a.sans}</text>
          </g>
        );
      })}
      {/* fill */}
      <polygon points={poly} fill="url(#radarFill)" />
      {/* self-draw polygon */}
      <motion.polygon
        points={poly}
        fill="none" stroke="#6B4EE6" strokeWidth="2.5" strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{ duration: 1.6, ease: 'easeInOut' }}
        style={{ filter: 'drop-shadow(0 0 8px rgba(107,78,230,0.4))' }}
      />
      {/* dosha orbs at vertices */}
      {axes.map((a, i) => {
        const [x, y] = pt(a.deg, a.val);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="9" fill="none" stroke={a.color} strokeWidth="1" opacity="0.6">
              <animate attributeName="r" values="8;12;8" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={x} cy={y} r="6" fill={a.color} />
          </g>
        );
      })}
    </svg>
  );
}

const DOSHAS = [
  { icon: Wind, color: '#7C9CC0', name: 'Vata', desc: 'Air & movement — governs motion, breath, and nerve impulses.' },
  { icon: Flame, color: '#FF8C69', name: 'Pitta', desc: 'Fire & transformation — controls metabolism and digestion.' },
  { icon: Droplet, color: '#2DD4BF', name: 'Kapha', desc: 'Water & earth — gives structure, lubrication, and stability.' },
];

export default function Ayush() {
  return (
    <Section id="ayush" bg="linear-gradient(135deg,#2DD4BF0D, #F8F7FF 55%)" className="py-[120px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <SectionLabel className="mb-4" color="#2DD4BF">AYUSH Integration</SectionLabel>
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(28px,4vw,40px)] leading-tight font-semibold text-[#1A1A2E] max-w-[720px] mx-auto"
            style={{ fontFamily: 'Inter' }}
          >
            Ayurveda, Unani, Siddha, and Homeopathy — supported natively.
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* radar chart */}
          <div className="flex justify-center">
            <div className="absolute inset-0 -z-10 rounded-full bg-teal-400/10 blur-3xl" />
            <RadarChart />
          </div>

          {/* Dashavidha content */}
          <div className="space-y-6">
            <motion.div variants={fadeUp}>
              <h3 className="text-2xl font-semibold text-[#1A1A2E] mb-2" style={{ fontFamily: 'Inter' }}>Dashavidha Pariksha</h3>
              <p className="text-[16px] text-[#6B7280] leading-relaxed">The tenfold examination, digitized with the same care a seasoned Vaidya brings to a consultation.</p>
            </motion.div>
            {[
              { t: 'Prakriti Assessment', d: '20-question constitution analysis. Vata, Pitta, Kapha dominance scored.' },
              { t: 'Vikriti Detection', d: 'Current dosha imbalance identified from symptoms.' },
              { t: 'Nidana & Samprapti', d: 'Causative factors and pathogenesis summarized for the Vaidya.' },
            ].map((c, i) => (
              <motion.div key={c.t} variants={fadeUp} className="p-5 rounded-xl bg-white shadow-sm border border-surface-100">
                <div className="font-semibold text-[#1A1A2E] text-lg">{c.t}</div>
                <p className="text-[15px] text-[#6B7280] mt-1">{c.d}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* dosha cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mt-16">
          {DOSHAS.map((d, i) => (
            <motion.div
              key={d.name}
              variants={fadeUp}
              className="bg-white rounded-2xl p-6 shadow-lg shadow-surface-900/5 text-center"
            >
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center relative" style={{ background: `${d.color}1a` }}>
                <motion.span className="absolute inset-0 rounded-full" style={{ background: d.color }}
                  animate={{ scale: [1, 1.5], opacity: [0.3, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }} />
                <d.icon className="w-7 h-7 relative" style={{ color: d.color }} />
              </div>
              <div className="text-xl font-semibold text-[#1A1A2E] mt-4" style={{ fontFamily: 'Inter' }}>{d.name}</div>
              <p className="text-[15px] text-[#6B7280] mt-2 leading-relaxed">{d.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}
