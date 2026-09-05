import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Section, SectionLabel, fadeUp } from './motion';

const FAQS = [
  { q: 'What if the patient cannot read?', a: 'Low-literacy mode replaces text with large icons and audio guidance, so every patient can navigate independently.' },
  { q: 'What about internet connectivity?', a: 'Offline mode stores data locally for up to 30 minutes and syncs automatically once connectivity returns.' },
  { q: 'Is my voice recording stored?', a: 'Voice recordings are deleted within 24 hours. Only the transcribed clinical text is retained.' },
  { q: 'Can it handle noisy OPDs?', a: 'Noise cancellation, a directional microphone, and a full touch fallback keep the experience reliable even in busy waiting areas.' },
  { q: 'What about data privacy?', a: 'DPDP-compliant, end-to-end encrypted, and consent-driven. Patients control what is shared and with whom.' },
  { q: 'Does it work for AYUSH hospitals?', a: 'Yes — full Dashavidha Pariksha support with Vata, Pitta, and Kapha assessments built in.' },
  { q: 'What if the AI makes a mistake?', a: 'Physician review is mandatory before anything is saved to the EMR, so a human always confirms the final record.' },
  { q: 'How much does it cost?', a: 'Designed for public hospitals with affordable per-kiosk pricing and no lock-in contracts.' },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" bg="#ffffff" className="py-[100px]">
      <div className="max-w-[820px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-12">
          <SectionLabel className="mb-4" color="#6B4EE6">Questions answered</SectionLabel>
          <motion.h2
            variants={fadeUp}
            className="text-[40px] leading-tight font-semibold text-[#1A1A2E]"
            style={{ fontFamily: 'Inter' }}
          >
            Common questions.
          </motion.h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div key={i} variants={fadeUp} className="rounded-xl border border-surface-100 overflow-hidden bg-white">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-[18px] font-semibold text-[#1A1A2E]">{f.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }} className="shrink-0">
                    <ChevronDown className="w-5 h-5 text-surface-400" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 text-[16px] text-[#6B7280] leading-relaxed">{f.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
