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
              className="bg-white rounded-2xl shadow-lg shadow-surface-900/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden will-change-transform flex flex-col"
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
                  <div className="relative w-14 h-14 rounded-full bg-white/25 backdrop-blur flex items-center justify-center">
                    <f.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <h3 className="text-2xl font-semibold text-[#111827] mb-0" style={{ fontFamily: 'Inter' }}>{f.title}</h3>
                <p className="text-[16px] text-[#6B7280] leading-relaxed m-0">{f.body}</p>
                <MiniMockup type={f.mock} />
                <div className="mt-auto">
                  <span className="inline-flex items-center bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium border border-indigo-100">{f.tag}</span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* glass banner */}
        <motion.div
          variants={fadeUp}
          className="glass-banner rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-xl bg-primary-600/15 flex items-center justify-center">
              <Timer className="w-6 h-6 text-primary-700" />
            </span>
            <span className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: 'Inter' }}>Ready in under 90 seconds</span>
          </div>
          <div className="flex items-center gap-2">
            {['Speak', 'Scan', 'Done'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <span className="w-8 h-px bg-primary-300" />}
                <span className="flex items-center gap-2 px-3 py-2 rounded-full bg-white shadow-sm border border-surface-100 text-[14px] font-semibold text-surface-700">
                  <span className={`w-5 h-5 rounded-full ${i === 2 ? 'bg-teal-500 text-white' : 'bg-primary-600 text-white'} flex items-center justify-center`}>
                    {i === 2 ? <Check className="w-3 h-3" /> : i + 1}
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
      <div className="rounded-xl bg-surface-50 border border-surface-100 p-4 flex flex-col items-center gap-3">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <motion.span className="absolute inset-0 rounded-full bg-primary-500/30" animate={{ scale: [1, 1.8], opacity: [0.6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }} />
          <motion.span className="absolute inset-0 rounded-full bg-primary-400/40" animate={{ scale: [1, 1.4], opacity: [0.5, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.3 }} />
          <div className="relative w-11 h-11 rounded-full bg-primary-600 flex items-center justify-center"><Mic className="w-5 h-5 text-white" /></div>
        </div>
        <p className="text-[13px] text-surface-500 text-center leading-snug">"मेरे सीने में दर्द है..."</p>
        <div className="flex items-center gap-1 h-4">
          {[0.7, 0.9, 0.6, 1, 0.8, 1, 0.6].map((v, i) => (
            <span key={i} className="w-1 rounded-full bg-primary-500" style={{ height: `${v * 100}%`, animation: 'waveform 0.8s ease-in-out infinite' }} />
          ))}
        </div>
        <div className="flex gap-1.5 w-full justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="high" />
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="w-2 h-2 rounded-full bg-surface-300" />
        </div>
      </div>
    );
  }
  if (type === 'camera') {
    return (
      <div className="relative h-28 rounded-xl bg-surface-50 border border-surface-100 overflow-hidden">
        <div className="absolute inset-4 bg-[#E8E4F3] rounded-lg relative overflow-hidden">
          {/* fake prescription lines */}
          <div className="absolute top-4 left-4 space-y-1.5">
            <div className="w-16 h-1.5 bg-primary-300/70 rounded" />
            <div className="w-20 h-1.5 bg-surface-300 rounded" />
            <div className="w-14 h-1.5 bg-surface-200 rounded" />
            <div className="w-18 h-1.5 bg-surface-300 rounded" />
          </div>
          {/* corner brackets locking */}
          {[
            'top-1 left-1 border-t-2 border-l-2',
            'top-1 right-1 border-t-2 border-r-2',
            'bottom-1 left-1 border-b-2 border-l-2',
            'bottom-1 right-1 border-b-2 border-r-2',
          ].map((pos, i) => (
            <motion.span
              key={i}
              className={`absolute w-5 h-5 ${pos} border-coral-500 rounded`}
              animate={{ scale: [1, 0.9, 1], borderColor: ['#FF8C69', '#2DD4BF', '#FF8C69'] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
          <span className="absolute inset-x-0 top-1/2 h-px bg-white/60 shimmer-line" />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-surface-50 border border-surface-100 border-l-4 border-l-red-500 p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-600 rounded-full">Chest Pain</span>
        <span className="px-2 py-0.5 text-[10px] font-bold bg-surface-200 text-surface-600 rounded-full">62M · Wait 4m</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary-600" /><div className="h-1.5 flex-1 bg-surface-200 rounded" /></div>
        <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" /><div className="h-1.5 flex-1 bg-surface-200 rounded" /></div>
        <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-danger-500" /><div className="h-1.5 flex-1 bg-surface-200 rounded w-2/3" /></div>
      </div>
    </div>
  );
}
