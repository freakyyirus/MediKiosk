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

function Counter({ value, suffix, label, color }: { value: number; suffix: string; label: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const n = useCount(value, inView);
  return (
    <motion.div ref={ref} variants={fadeUp} className="text-center p-6">
      <div className="text-[clamp(40px,6vw,72px)] font-bold leading-none" style={{ color, fontFamily: 'Inter' }}>
        {n}{suffix}
      </div>
      <div className="text-[16px] text-[#6B7280] mt-3 max-w-[240px] mx-auto leading-snug">{label}</div>
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
    <Section id="impact" bg="#F8F7FF" className="py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <SectionLabel className="mb-4" color="#4F46E5">Impact</SectionLabel>
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(28px,4vw,40px)] leading-tight font-semibold text-[#111827]"
            style={{ fontFamily: 'Inter' }}
          >
            Real numbers from real hospitals.
          </motion.h2>
        </div>

        {/* counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x divide-surface-200 mb-16">
          <Counter value={90} suffix=" sec" color="#F97316" label="Average history-taking time, down from 5 minutes." />
          <Counter value={80} suffix="%" color="#14B8A6" label="History completeness score, up from 45%." />
          <Counter value={12} suffix="" color="#4F46E5" label="Indian languages supported natively." />
          <Counter value={200} suffix="+" color="#EF4444" label="Emergency red flag patterns monitored continuously." />
        </div>

        {/* before/after bar chart */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl p-8 shadow-lg shadow-surface-900/5 max-w-[760px] mx-auto">
          <div className="text-center text-lg font-semibold text-[#111827] mb-8">Before vs After MediKiosk</div>
          <div className="grid gap-6">
            {METRICS.map((m, i) => (
              <BarRow key={m.label} label={m.label} before={m.before} after={m.after} delay={i * 0.15} />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-[13px] text-surface-500">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-surface-300" /> Before</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-gradient-to-r from-[#F97316] to-[#14B8A6]" /> After</span>
          </div>
        </motion.div>
      </div>

      {/* guardian success floats on the right on large screens */}
      <div className="hidden xl:block absolute right-6 top-1/2 -translate-y-1/2 w-[230px] opacity-90 pointer-events-none select-none">
        <Guardian state="success" />
      </div>
    </Section>
  );
}

function BarRow({ label, before, after, delay }: { label: string; before: number; after: number; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  return (
    <div ref={ref}>
      <div className="text-[14px] font-medium text-surface-600 mb-1.5">{label}</div>
      <div className="flex items-center gap-3">
        <span className="w-12 text-[12px] text-surface-400 text-right">{before}%</span>
        <div className="flex-1 h-3.5 rounded-full bg-surface-100 overflow-hidden">
          <motion.div
            className="h-full bg-surface-300 rounded-full"
            initial={{ width: 0 }}
            animate={inView ? { width: `${before}%` } : {}}
            transition={{ duration: 1, ease: 'easeOut', delay }}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <span className="w-12 text-[12px] text-[#F97316] text-right">{after}%</span>
        <div className="flex-1 h-3.5 rounded-full bg-surface-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#F97316] to-[#14B8A6]"
            initial={{ width: 0 }}
            animate={inView ? { width: `${after}%` } : {}}
            transition={{ duration: 1, ease: 'easeOut', delay: delay + 0.2 }}
          />
        </div>
      </div>
    </div>
  );
}
