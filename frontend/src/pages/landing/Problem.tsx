import { motion } from 'framer-motion';
import { Clock, Users, ClipboardX } from 'lucide-react';
import Guardian from './Guardian';
import { Section, SectionLabel, fadeUp } from './motion';

const STATS = [
  {
    icon: Clock,
    border: '#EF4444',
    num: '2-5',
    unit: 'minutes',
    text: 'Average doctor-patient consultation time. Not enough to ask, listen, and diagnose.',
  },
  {
    icon: Users,
    border: '#FF8C69',
    num: '10,000+',
    unit: 'patients/day',
    text: 'Registered daily in large public hospitals. Queues stretch for hours.',
  },
  {
    icon: ClipboardX,
    border: '#6B4EE6',
    num: '45%',
    unit: 'completeness',
    text: 'History completeness in rushed consultations. Critical details get missed every day.',
  },
];

const QUOTES = [
  'Mujhe 3 ghante wait karna pada, doctor ne sirf 2 minute diye.',
  'I brought all my reports but the doctor had no time to read them.',
  'My father is 72 — he can\'t fill forms or navigate hospital counters alone.',
  'Maine apni sugar ki dawai ka naam bhool gaya, doctor ko bata nahi paaya.',
  'I visited 3 hospitals this year. No one has my full medical history.',
  'Bache ro rahe the, queue lamba tha, maine apni allergy batana bhool gayi.',
  'The prescription from my village doctor was handwritten — no one could read it.',
  'I don\'t speak English or Hindi well. I couldn\'t explain my chest pain properly.',
  'Meri maa ko BP, diabetes, thyroid sab hai — ek visit mein sab kaise bataye?',
  'I carried 4 years of paper reports in a plastic bag. Half were damaged by rain.',
];

export default function Problem() {
  return (
    <Section id="problem" bg="#ffffff" className="py-[120px] overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        {/* heading */}
        <div className="text-center mb-16">
          <SectionLabel className="mb-4" color="#6B4EE6">The Challenge</SectionLabel>
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(28px,4vw,40px)] leading-tight font-semibold text-[#1A1A2E] max-w-[680px] mx-auto"
            style={{ fontFamily: 'Inter' }}
          >
            India's OPDs are drowning. Patients suffer in silence.
          </motion.h2>
        </div>

        {/* stat cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-14">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="relative bg-white rounded-2xl p-8 shadow-lg shadow-surface-900/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              style={{ borderTop: `4px solid ${s.border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${s.border}18` }}>
                  <s.icon className="w-6 h-6" style={{ color: s.border }} />
                </span>
              </div>
              <div className="text-[clamp(36px,5vw,56px)] font-bold leading-none text-[#1A1A2E]" style={{ fontFamily: 'Inter' }}>
                {s.num}
              </div>
              <div className="text-[20px] text-surface-500 font-medium mt-1 mb-3">{s.unit}</div>
              <p className="text-[16px] text-[#6B7280] leading-relaxed">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* fragment figure + quote marquee */}
      <div className="w-full overflow-hidden mb-12">
        {/* marquee */}
        <motion.div variants={fadeUp} className="relative py-4 overflow-hidden" aria-hidden="true">
          <MarqueeRow quotes={QUOTES.slice(0, 5)} />
          <MarqueeRow quotes={QUOTES.slice(5)} reverse />
        </motion.div>
      </div>

      <div className="px-6 lg:px-10 relative z-10">
        <motion.div 
          variants={fadeUp}
          className="mt-8 bg-gradient-to-br from-white to-primary-50 border border-primary-100 rounded-[32px] p-8 md:p-12 shadow-xl shadow-primary-900/5 relative overflow-hidden flex flex-col md:flex-row items-center gap-10 md:gap-16 max-w-[1200px] mx-auto"
        >
          {/* Decorative background glows */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-300/20 rounded-full blur-[64px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-300/20 rounded-full blur-[48px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

          {/* Guardian Image */}
          <div className="relative z-10 w-[200px] md:w-[260px] shrink-0">
            <Guardian state="fragmented" />
          </div>
          
          {/* Text Content */}
          <div className="relative z-10 text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-primary-700 font-semibold text-sm mb-6 shadow-sm border border-primary-100">
              <ClipboardX className="w-4 h-4 text-primary-500" />
              The Reality
            </div>
            
            <h3 className="text-[clamp(28px,4vw,42px)] font-bold text-[#1A1A2E] mb-5 leading-tight" style={{ fontFamily: 'Inter' }}>
              Millions of stories, lost in <br className="hidden xl:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                fragmented paperwork.
              </span>
            </h3>
            
            <p className="text-lg md:text-[20px] text-[#4B5563] leading-relaxed max-w-2xl mx-auto md:mx-0">
              A patient's real history lives across crumpled prescriptions, faded
              reports, and misfiled folders. The pressure of a crowded waiting
              room means critical context rarely makes it to the doctor in time.
            </p>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

function MarqueeRow({ quotes, reverse }: { quotes: string[]; reverse?: boolean }) {
  const row = [...quotes, ...quotes];
  return (
    <div className={`marquee-track flex gap-4 pr-4 shrink-0 ${reverse ? 'marquee-reverse' : ''}`}>
      {row.map((q, i) => (
        <span
          key={i}
          className="shrink-0 px-5 py-3 rounded-full bg-white/90 border border-surface-200 shadow-sm text-[15px] text-[#6B7280] whitespace-nowrap"
        >
          " {q} "
        </span>
      ))}
    </div>
  );
}
