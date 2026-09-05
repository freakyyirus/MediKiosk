import { motion } from 'framer-motion';
import { Section, SectionLabel, fadeUp } from './motion';

const TESTIMONIALS = [
  {
    q: "My mother only speaks Tamil. She was able to explain her knee pain completely without me translating. The doctor already knew everything before she sat down.",
    name: 'Priya K.', role: 'Family Caregiver', initials: 'PK', badge: 'Chennai',
  },
  {
    q: "I see 80 patients a day. With MediKiosk, I spend time examining and diagnosing, not writing history. My patients feel heard.",
    name: 'Dr. R. Sharma', role: 'Physician', initials: 'RS', badge: 'Delhi Govt Hospital',
  },
  {
    q: "The red flag system caught a silent MI in a 45-year-old man who just said 'chest discomfort.' He got his ECG in 3 minutes.",
    name: 'Anjali', role: 'Triage Nurse', initials: 'AN', badge: 'Mumbai',
  },
];

export default function Testimonials() {
  return (
    <Section id="testimonials" bg="#ffffff" className="py-[100px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <SectionLabel className="mb-4" color="#6B4EE6">Voices from the field</SectionLabel>
          <motion.h2
            variants={fadeUp}
            className="text-[40px] leading-tight font-semibold text-[#1A1A2E]"
            style={{ fontFamily: 'Inter' }}
          >
            Trusted by the people who care.
          </motion.h2>
        </div>

        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="min-w-[85%] sm:min-w-[70%] lg:min-w-0 snap-center relative bg-[#F0EBFF] rounded-2xl p-8 shadow-lg shadow-surface-900/5 flex flex-col"
            >
              <span className="absolute top-2 left-5 text-[96px] leading-none font-bold text-primary-200 select-none" aria-hidden="true">"</span>
              <p className="relative text-[20px] italic text-[#1A1A2E] leading-relaxed flex-1 pt-8">"{t.q}"</p>
              <div className="mt-6 flex items-center gap-3">
                <span className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-bold">
                  {t.initials}
                </span>
                <div>
                  <div className="font-semibold text-[#1A1A2E]">{t.name}</div>
                  <div className="text-[14px] text-[#6B7280]">{t.role}</div>
                </div>
                <span className="ml-auto px-3 py-1 rounded-full bg-white shadow text-[12px] font-semibold text-primary-700">{t.badge}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}
