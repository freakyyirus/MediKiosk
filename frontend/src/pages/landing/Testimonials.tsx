import { motion } from 'framer-motion';
import { Mic2, FileScan, HeartPulse, Languages } from 'lucide-react';
import { Section, SectionLabel, fadeUp } from './motion';

// Not testimonials — explicitly product-capability cards. No fabricated
// doctors, hospitals, patients, or ratings are presented on this page.
const CAPABILITIES = [
  {
    icon: Mic2,
    title: 'Voice-first intake',
    body: 'Patients describe symptoms in their own language. Speech is transcribed and structured for clinical review.',
  },
  {
    icon: Languages,
    title: 'Multilingual by design',
    body: 'Clinical interviews run in Hindi, Tamil, Bengali, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Odia, Assamese and English.',
  },
  {
    icon: FileScan,
    title: 'Document digitization',
    body: 'Prescriptions, lab reports and discharge summaries are OCR-processed and kept in private, access-controlled storage.',
  },
  {
    icon: HeartPulse,
    title: 'Human review, always',
    body: 'AI structures information and flags urgent symptoms, but a qualified clinician reviews every summary before it enters the record.',
  },
];

export default function Testimonials() {
  return (
    <Section id="testimonials" bg="#ffffff" className="py-[100px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <SectionLabel className="mb-4" color="#4F46E5">How it helps</SectionLabel>
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(28px,5.5vw,40px)] leading-tight font-semibold text-[#111827]"
            style={{ fontFamily: 'Inter' }}
          >
            Designed for real-world clinical workflows.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-[17px] text-[#6B7280] max-w-[640px] mx-auto leading-relaxed">
            MediKiosk focuses on the things hospital staff need: structured histories, multilingual intake, faster triage, and paperwork that is ready for review.
          </motion.p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CAPABILITIES.map((c, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="relative bg-[#F0EBFF] rounded-2xl p-8 shadow-lg shadow-surface-900/5 flex flex-col"
            >
              <span className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center mb-4">
                <c.icon className="w-6 h-6" aria-hidden="true" />
              </span>
              <h3 className="text-[19px] font-semibold text-[#111827]">{c.title}</h3>
              <p className="mt-3 text-[15px] text-[#4B5563] leading-relaxed flex-1">{c.body}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-[13px] text-[#9CA3AF]">
          No patient testimonials are displayed on this site. Capacities shown above describe the platform, not individual outcomes.
        </p>
      </div>
    </Section>
  );
}