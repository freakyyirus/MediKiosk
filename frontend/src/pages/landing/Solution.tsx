import { motion } from 'framer-motion';
import { Mic, Camera, ClipboardList, Timer, Check } from 'lucide-react';
import { Section, SectionLabel, fadeUp } from './motion';

const FEATURES = [
  {
    icon: Mic,
    gradient: 'linear-gradient(135deg,#6366F1,#4F46E5)',
    title: 'Speak Naturally',
    body: 'Patients describe symptoms in Hindi, Tamil, Bengali, or any of 12 languages. Our AI asks gentle follow-ups using the SOCRATES framework — just like a trained nurse.',
    tag: 'Bhashini ASR Powered',
    mock: 'voice' as const,
  },
  {
    icon: Camera,
    gradient: 'linear-gradient(135deg,#F97316,#FB923C)',
    title: 'Scan Everything',
    body: 'Old prescriptions, lab reports, discharge summaries — just hold them up to the camera. Auto-crop, perspective correction, and medical-grade OCR extract medications and diagnoses instantly.',
    tag: 'Tesseract + EasyOCR',
    mock: 'camera' as const,
  },
  {
    icon: ClipboardList,
    gradient: 'linear-gradient(135deg,#14B8A6,#2DD4BF)',
    title: 'Instant Summary',
    body: 'Before the patient enters the room, the doctor sees a structured bilingual summary. Chief complaint, history, allergies, medications, red flags — all organized and ready.',
    tag: 'Gemini 1.5 Pro + FHIR R4',
    mock: 'summary' as const,
  },
];

export default function Solution() {
  return (
    <Section id="product" bg="#F8F7FF" className="py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4" color="#4F46E5">The Solution</SectionLabel>
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(28px,4vw,40px)] leading-tight font-semibold text-[#111827] max-w-[680px] mx-auto"
            style={{ fontFamily: 'Inter' }}
          >
            A compassionate digital nurse at every kiosk.
          </motion.h2>
        </div>

        {/* feature cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {FEATURES.map((f, i) => (
            <motion.article
              key={i}
              variants={fadeUp}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-2xl shadow-lg shadow-surface-900/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* gradient header */}
              <div className="h-24 flex items-center justify-center" style={{ background: f.gradient }}>
                <div className="relative flex items-center justify-center">
                  {f.icon === Mic && (
                    <>
                      <motion.span className="absolute inset-0 rounded-full bg-white/30" animate={{ scale: [1, 1.9], opacity: [0.5, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }} />
                      <motion.span className="absolute inset-0 rounded-full bg-white/40" animate={{ scale: [1, 1.4], opacity: [0.4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.4 }} />
                    </>
                  )}
                  <div className="relative w-14 h-14 rounded-full bg-white/25 flex items-center justify-center">
                    <f.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>

              <div className="p-8 flex flex-col gap-4 flex-1 bg-white">
                <h3 className="text-[22px] font-bold text-[#111827] mb-1 tracking-tight" style={{ fontFamily: 'Inter' }}>{f.title}</h3>
                <p className="text-[15px] text-[#4B5563] leading-relaxed m-0">{f.body}</p>
                <div className="mt-auto flex flex-col gap-5 pt-4">
                  <MiniMockup type={f.mock} />
                  <div className="flex justify-center">
                    <span className="inline-flex items-center bg-surface-50 text-surface-600 px-4 py-1.5 rounded-full text-[12px] font-semibold tracking-wide uppercase border border-surface-200 shadow-sm">{f.tag}</span>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* glass banner */}
        <motion.div
          variants={fadeUp}
          className="glass-banner rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-surface-100 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-5">
            <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center border border-primary-200 shadow-sm">
              <Timer className="w-7 h-7 text-primary-600" />
            </span>
            <span className="text-[22px] font-bold text-[#111827] tracking-tight" style={{ fontFamily: 'Inter' }}>Ready in under 90 seconds</span>
          </div>
          <div className="flex items-center gap-3">
            {['Speak', 'Scan', 'Done'].map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                {i > 0 && <span className="w-10 h-px bg-surface-300" />}
                <span className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white shadow-sm border border-surface-200 text-[14px] font-semibold text-surface-700">
                  <span className={`w-6 h-6 rounded-full ${i === 2 ? 'bg-teal-500 text-white shadow-inner' : 'bg-primary-600 text-white shadow-inner'} flex items-center justify-center`}>
                    {i === 2 ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

function MiniMockup({ type }: { type: 'voice' | 'camera' | 'summary' }) {
  if (type === 'voice') {
    return (
      <div className="rounded-2xl bg-surface-50/50 border border-surface-200/60 p-4 flex flex-col items-center justify-center gap-4 h-[180px] shadow-inner relative overflow-hidden">
        <div className="relative w-12 h-12 flex items-center justify-center mt-2">
          <motion.span className="absolute inset-0 rounded-full bg-primary-500/20" animate={{ scale: [1, 2], opacity: [0.8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }} />
          <motion.span className="absolute inset-0 rounded-full bg-primary-400/30" animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.4 }} />
          <div className="relative w-11 h-11 rounded-full bg-gradient-to-b from-primary-500 to-primary-600 shadow-sm flex items-center justify-center"><Mic className="w-5 h-5 text-white" /></div>
        </div>
        <p className="text-[13px] font-medium text-surface-600 text-center leading-snug">"मेरे सीने में दर्द है..."</p>
        <div className="flex items-center gap-1.5 h-4 mb-2">
          {[0.6, 1, 0.5, 0.9, 0.7, 1, 0.4].map((v, i) => (
            <span key={i} className="w-1 rounded-full bg-primary-400" style={{ height: `${v * 100}%`, animation: 'waveform 1s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    );
  }
  if (type === 'camera') {
    return (
      <div className="rounded-2xl bg-surface-50/50 border border-surface-200/60 p-4 flex flex-col items-center justify-center gap-4 h-[180px] shadow-inner relative overflow-hidden">
        <div className="relative w-12 h-12 flex items-center justify-center mt-2">
          <motion.span className="absolute inset-0 rounded-xl bg-coral-500/20" animate={{ scale: [1, 1.5], opacity: [0.8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }} />
          <motion.span className="absolute inset-0 rounded-xl bg-coral-400/30" animate={{ scale: [1, 1.25], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.4 }} />
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-b from-coral-400 to-coral-500 shadow-sm flex items-center justify-center"><Camera className="w-5 h-5 text-white" /></div>
        </div>
        <p className="text-[13px] font-medium text-surface-600 text-center leading-snug">"Rx: Tab Paracetamol 500mg..."</p>
        
        <div className="relative h-12 w-[85%] bg-[#FDFBF7] rounded-lg border border-surface-200 overflow-hidden flex-shrink-0 shadow-sm mb-2 p-2">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(transparent 90%, #94a3b8 10%)', backgroundSize: '100% 12px' }} />
          <div className="relative z-10 flex flex-col -rotate-3 mt-1 ml-1 opacity-80">
            <span className="text-[12px] font-bold text-blue-900 leading-none" style={{ fontFamily: 'cursive', transform: 'skewX(-15deg)' }}>Rx: Tab Paracetamol 500mg</span>
            <span className="text-[11px] font-bold text-blue-900 leading-none ml-4 mt-1" style={{ fontFamily: 'cursive', transform: 'skewX(-15deg)' }}>1 tab BD x 5 days</span>
          </div>
          <motion.span
            className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-transparent to-coral-400/10 border-b border-coral-400 pointer-events-none"
            animate={{ y: ['-50%', '150%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-surface-50/50 border border-surface-200/60 p-6 flex flex-col justify-center h-[180px] shadow-inner relative overflow-hidden">
      <div className="border-l-[3px] border-l-red-500 pl-4 space-y-4 py-1">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase bg-red-100 text-red-700 rounded-full shadow-sm">Chest Pain</span>
          <span className="px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase bg-white border border-surface-200 text-surface-500 rounded-full shadow-sm">62M · Wait 4m</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-danger-500 shrink-0" />
            <span className="text-[12px] font-semibold text-surface-700 leading-none">Artery swelling indicated</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[12px] font-medium text-surface-600 leading-none">BP: 150/94 (Elevated)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
            <span className="text-[12px] font-medium text-surface-600 leading-none">No known allergies</span>
          </div>
        </div>
      </div>
    </div>
  );
}
