import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Section, SectionLabel, fadeUp } from './motion';

const FAQS = [
  { q: 'What is MediKiosk?', a: 'MediKiosk is an AI-powered patient intake and clinical history platform. Patients use self-service kiosks (or their phones) to describe symptoms in their own language; the platform structures that information, digitizes past documents with OCR, flags urgent symptoms, and prepares a clinical summary for a physician to review.' },
  { q: 'How does MediKiosk help patients and healthcare staff?', a: 'For patients, it removes the language barrier and cuts waiting-room paperwork. For staff, it delivers a structured history, organized documents, and a triage view before the consultation begins, so clinicians spend more time examining and talking rather than writing notes.' },
  { q: 'How does MediKiosk use AI?', a: 'MediKiosk uses AI for speech recognition and translation (via Bhashini), for clinical history structuring and summarization (via Google Gemini), and for OCR-based document understanding. AI-generated content is always presented as assistance, never as a diagnosis, and is reviewed by a qualified clinician before it becomes part of the record.' },
  { q: 'Is patient information secure?', a: 'Patient records and uploaded documents are stored in private, access-controlled storage with encryption in transit and at rest. Only authorized hospital staff involved in the patient\'s care can access them, staff are authenticated per role, and retention and erasure rules follow the Digital Personal Data Protection Act 2023.' },
  { q: 'Does MediKiosk replace a doctor?', a: 'No. MediKiosk never makes a diagnosis or treats patients. It prepares information and flags possible urgent symptoms for the human care team. A qualified clinician always reviews the AI-generated summary and is the one who makes clinical decisions.' },
  { q: 'What if the patient cannot read?', a: 'Low-literacy mode replaces text with large icons and audio guidance, so every patient can navigate independently.' },
  { q: 'What about internet connectivity?', a: 'Offline mode stores data locally for up to 30 minutes and syncs automatically once connectivity returns.' },
  { q: 'Is my voice recording stored?', a: 'Voice recordings are deleted within 24 hours. Only the transcribed clinical text is retained.' },
  { q: 'Can it handle noisy OPDs?', a: 'Noise cancellation, a directional microphone, and a full touch fallback keep the experience reliable even in busy waiting areas.' },
  { q: 'What about data privacy?', a: 'DPDP-compliant, encrypted, and consent-driven. Patients are told what is collected and why before consenting, and can request erasure of their records.' },
  { q: 'Does it work for AYUSH hospitals?', a: 'Yes — full Dashavidha Pariksha support with Vata, Pitta, and Kapha assessments built in.' },
  { q: 'What if the AI makes a mistake?', a: 'Physician review is mandatory before anything is saved to the EMR, so a human always confirms the final record.' },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" bg="#ffffff" className="py-[100px]">
      <div className="max-w-[820px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-12">
          <SectionLabel className="mb-4" color="#4F46E5">Questions answered</SectionLabel>
          <motion.h2
            variants={fadeUp}
            className="text-[40px] leading-tight font-semibold text-[#111827]"
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
                  <span className="text-[18px] font-semibold text-[#111827]">{f.q}</span>
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
