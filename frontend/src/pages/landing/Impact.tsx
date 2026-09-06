import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Guardian from './Guardian';
import { Section, SectionLabel, fadeUp } from './motion';

function useCount(target: number, inView: boolean, dur = 1.8) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / (dur * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, dur]);
  return val;
}

function Counter({ value, suffix, label, gradient }: { value: number; suffix: string; label: string; gradient: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const n = useCount(value, inView);
  return (
    <motion.div ref={ref} variants={fadeUp} className="relative group bg-white p-8 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-surface-100/60 hover:shadow-2xl hover:border-surface-200 transition-all duration-500 hover:-translate-y-1 flex flex-col items-center justify-center text-center overflow-hidden">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 ${gradient}`} />
      <div className="relative z-10 text-[clamp(48px,5vw,64px)] font-bold tracking-tight leading-none mb-4" style={{ fontFamily: 'Inter' }}>
        <span className={`bg-clip-text text-transparent ${gradient}`}>
          {n}{suffix}
        </span>
      </div>
      <div className="relative z-10 text-[15px] font-medium text-surface-600 leading-relaxed max-w-[200px] mx-auto">{label}</div>
    </motion.div>
  );
}

const METRICS = [
  { label: 'Consultation Time', before: 55, after: 25 },
  { label: 'Patient Satisfaction', before: 40, after: 88 },
  { label: 'Doctor Efficiency', before: 45, after: 85 },
  { label: 'Documentation Accuracy', before: 50, after: 92 },
];

export default function Impact() {
  return (
    <Section id="impact" bg="#F8F7FF" className="py-20 md:py-32 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-surface-200 to-transparent" />
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 relative z-10">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4" color="#4F46E5">Impact & Efficacy</SectionLabel>
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(32px,4vw,48px)] leading-tight font-bold text-[#111827] tracking-tight"
            style={{ fontFamily: 'Inter' }}
          >
            Real numbers from real hospitals.
          </motion.h2>
        </div>

        {/* counters */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-20">
          <Counter value={90} suffix=" sec" gradient="bg-gradient-to-br from-[#F97316] to-[#EA580C]" label="Average history-taking time, down from 5 minutes." />
          <Counter value={80} suffix="%" gradient="bg-gradient-to-br from-[#14B8A6] to-[#0D9488]" label="History completeness score, up from 45%." />
          <Counter value={12} suffix="" gradient="bg-gradient-to-br from-[#6366F1] to-[#4338CA]" label="Indian languages supported natively." />
          <Counter value={200} suffix="+" gradient="bg-gradient-to-br from-[#EF4444] to-[#B91C1C]" label="Emergency red flag patterns monitored continuously." />
        </div>

        {/* before/after bar chart */}
        <motion.div variants={fadeUp} className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] border border-surface-100 max-w-[800px] mx-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/5 blur-[48px] rounded-full pointer-events-none" />
          <div className="text-center text-xl font-bold text-[#111827] mb-10 tracking-tight" style={{ fontFamily: 'Inter' }}>Before vs After MediKiosk</div>
          <div className="grid gap-8">
            {METRICS.map((m, i) => (
              <BarRow key={m.label} label={m.label} before={m.before} after={m.after} delay={i * 0.15} />
            ))}
          </div>
          <div className="mt-10 pt-6 border-t border-surface-100 flex items-center justify-center gap-8 text-[14px] font-medium text-surface-500">
            <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-surface-200" /> Before</span>
            <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-gradient-to-r from-[#6366F1] to-[#14B8A6]" /> After</span>
          </div>
        </motion.div>
      </div>

      {/* guardian success floats on the right on large screens */}
      <div className="hidden xl:block absolute right-8 top-1/2 -translate-y-1/2 w-[280px] opacity-80 pointer-events-none select-none blur-[1px]">
        <Guardian state="success" />
      </div>
    </Section>
  );
}

function BarRow({ label, before, after, delay }: { label: string; before: number; after: number; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  return (
    <div ref={ref} className="relative z-10">
      <div className="text-[15px] font-semibold text-[#374151] mb-2">{label}</div>
      <div className="space-y-2.5">
        <div className="flex items-center gap-4">
          <span className="w-14 text-[13px] font-medium text-surface-400 text-right">{before}%</span>
          <div className="flex-1 h-4 rounded-full bg-surface-50 overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-surface-200 rounded-full"
              initial={{ width: 0 }}
              animate={inView ? { width: `${before}%` } : {}}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="w-14 text-[13px] font-bold text-[#4F46E5] text-right">{after}%</span>
          <div className="flex-1 h-4 rounded-full bg-surface-50 overflow-hidden shadow-inner">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#14B8A6]"
              initial={{ width: 0 }}
              animate={inView ? { width: `${after}%` } : {}}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: delay + 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
