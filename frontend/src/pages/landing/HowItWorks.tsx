import { motion } from 'framer-motion';
import { Mic, User, SlidersHorizontal, Camera, ClipboardList, Stethoscope, MonitorSmartphone } from 'lucide-react';
import { Section, SectionLabel } from './motion';

const STEPS = [
  {
    icon: Mic, num: '1', color: '#6B4EE6', title: 'Choose Your Language',
    body: '12 Indian languages available. Large touch cards with native script, flag, and audio preview. Low-literacy mode hides text entirely — just icons and voice.',
    mock: 'lang' as const,
  },
  {
    icon: User, num: '2', color: '#6B4EE6', title: 'Tell Us What Brings You Here',
    body: 'Tap the body part that hurts, or simply speak. The AI listens, transcribes in real-time, and asks smart follow-ups. "When did it start?" "What makes it worse?"',
    mock: 'body' as const,
  },
  {
    icon: SlidersHorizontal, num: '3', color: '#6B4EE6', title: 'Answer a Few Questions',
    body: 'Voice or touch — your choice. Pain scales with emoji faces. Yes/No with massive buttons. Severity sliders. Everything designed for shaky hands and tired eyes.',
    mock: 'pain' as const,
  },
  {
    icon: Camera, num: '4', color: '#2DD4BF', title: 'Upload Old Documents',
    body: 'Hold prescriptions and reports to the camera. Multi-page handling. Auto-classification: prescription, lab report, or discharge summary. Extracted data appears in seconds.',
    mock: 'scan' as const,
  },
  {
    icon: ClipboardList, num: '5', color: '#2DD4BF', title: 'Review Your Summary',
    body: 'The AI reads your summary back in your language. Confirm it\'s correct. Your OPD token number appears — head to the waiting area.',
    mock: 'token' as const,
  },
  {
    icon: Stethoscope, num: '6', color: '#10B981', title: 'Doctor Sees Everything',
    body: 'The physician opens your structured history, timeline of documents, and any red flags. They can edit inline, confirm, and save directly to the hospital EMR.',
    mock: 'doctor' as const,
  },
];

export default function HowItWorks() {
  return (
    <Section id="how" bg="#1A1A2E" className="py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 circuit-lines opacity-[0.08] pointer-events-none" />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4" color="#9B87F5">How It Works</SectionLabel>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-[clamp(28px,4vw,40px)] leading-tight font-semibold text-white max-w-[680px] mx-auto"
            style={{ fontFamily: 'Inter' }}
          >
            From walking in to seeing the doctor. Six simple steps.
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-[1fr_1.1fr] gap-8 lg:gap-12">
          {/* Timeline */}
          <div className="relative">
            {/* glowing vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/10" />
            <div className="absolute left-6 top-0 bottom-0 w-0.5 overflow-hidden">
              <motion.div
                className="w-full bg-purple-gradient"
                initial={{ height: '0%' }}
                whileInView={{ height: '100%' }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              />
            </div>

            <div className="space-y-12">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.num}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative flex gap-5"
                >
                  {/* node */}
                  <motion.div
                    className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg shrink-0"
                    style={{ background: s.color, boxShadow: `0 0 0 6px ${s.color}22` }}
                    initial={{ scale: 0.6 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: i * 0.1 }}
                  >
                    <span className="flex items-center gap-1"><s.icon className="w-4 h-4" />{s.num}</span>
                  </motion.div>
                  {/* content */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Inter' }}>{s.title}</h3>
                    <p className="text-[16px] text-white/60 leading-relaxed">{s.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Central kiosk illustration */}
          <div className="relative flex items-center justify-center lg:sticky lg:top-28">
            <div className="w-full max-w-[460px]">
              <KioskIllustration />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* CSS-built isometric kiosk tablet with patient silhouette + circuit flowing cards */
function KioskIllustration() {
  return (
    <div className="relative">
      {/* circuit lines */}
      <svg className="absolute -inset-6 w-[calc(100%+48px)] h-[calc(100%+48px)] pointer-events-none opacity-60" viewBox="0 0 460 520" fill="none">
        <motion.path d="M60 60 H180 V140 H260" stroke="#6B4EE6" strokeWidth="1.5" strokeDasharray="4 4"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4 }} />
        <motion.path d="M400 60 H300 V140 H260" stroke="#2DD4BF" strokeWidth="1.5" strokeDasharray="4 4"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, delay: 0.3 }} />
        <motion.path d="M60 440 H180 V360 H240" stroke="#6B4EE6" strokeWidth="1.5" strokeDasharray="4 4"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, delay: 0.6 }} />
        <motion.path d="M400 440 H280 V360 H260" stroke="#2DD4BF" strokeWidth="1.5" strokeDasharray="4 4"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, delay: 0.9 }} />
      </svg>

      {/* kiosk tablet (isometric) */}
      <div className="relative mx-auto w-[220px] rotate-x tilt-style">
        <div className="rounded-[24px] bg-gradient-to-b from-[#2b2650] to-[#1b1838] p-2 shadow-2xl shadow-primary-900/50 border border-[#3a3366]">
          <div className="rounded-[18px] bg-[#F8F7FF] p-3" style={{ fontFamily: 'Inter' }}>
            <div className="h-2 w-16 mx-auto rounded-full bg-surface-200 mb-3" />
            <div className="grid grid-cols-3 gap-2">
              {['हिं', 'EN', 'த'].map((lc, i) => (
                <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-[13px] font-bold ${i === 0 ? 'bg-primary-600 text-white' : 'bg-white border border-surface-200 text-surface-600'}`}>
                  {lc}
                </div>
              ))}
            </div>
            <div className="mt-3 h-16 rounded-lg bg-surface-50 flex flex-col items-center justify-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center"><Mic className="w-3 h-3 text-white" /></div>
              <div className="flex gap-0.5">
                {[0.6,0.8,0.7,1,0.7].map((v,i)=>(<span key={i} className="w-0.5 bg-primary-500 rounded" style={{height:`${v*12}px`}}/>))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* patient silhouette */}
      <div className="absolute -left-4 bottom-6 flex flex-col items-center">
        <div className="relative w-20 h-28">
          <svg viewBox="0 0 80 112" className="w-full h-full">
            <circle cx="40" cy="18" r="13" fill="#6B4EE6" opacity="0.85" />
            <path d="M22 112 L22 76 Q22 66 30 62 L50 62 Q58 66 58 76 L58 112 Z" fill="#6B4EE6" opacity="0.85" />
          </svg>
          <motion.div className="absolute inset-x-0 top-1/2 flex justify-center"
            animate={{ x: [0, 60, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <motion.span className="w-1 h-1 rounded-full bg-teal-400" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity }} />
          </motion.div>
        </div>
        <span className="text-[11px] text-white/50 mt-1">Patient</span>
      </div>

      {/* floating organized data cards */}
      {[
        { cls: 'top-2 right-0', label: 'History', c: '#6B4EE6' },
        { cls: 'top-24 -right-2', label: 'Allergy', c: '#FF8C69' },
        { cls: 'bottom-4 right-0', label: 'Red Flag', c: '#EF4444' },
        { cls: 'top-32 -left-2', label: 'Report', c: '#2DD4BF' },
      ].map((d, i) => (
        <motion.div
          key={d.label}
          className={`absolute ${d.cls} glass-card px-3 py-2 rounded-xl text-[12px] font-semibold text-surface-700 shadow-lg`}
          initial={{ opacity: 0, y: 12, scale: 0.8 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 + i * 0.2 }}
          animate={{ y: [0, -6, 0] }}
        >
          <span className="w-2 h-2 inline-block rounded-full mr-1.5" style={{ background: d.c }} />
          {d.label}
        </motion.div>
      ))}

      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 white/60 hidden lg:flex items-center gap-2 text-[11px] text-white/40">
        <MonitorSmartphone className="w-3.5 h-3.5" /> OPD Kiosk · 10-inch
      </div>
    </div>
  );
}
