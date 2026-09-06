import { motion } from 'framer-motion';
import { Network, FileCode2, AudioLines, LayoutGrid, Database } from 'lucide-react';
import { Section, fadeUp } from './motion';

const PARTNERS = [
  { icon: Network, name: 'ABDM', desc: 'Ayushman Bharat Digital Mission — ABHA-linked records.' },
  { icon: FileCode2, name: 'FHIR R4', desc: 'Interoperable clinical data in a universal standard.' },
  { icon: AudioLines, name: 'Bhashini', desc: 'Nationally-backed speech-to-text in Indian languages.' },
  { icon: LayoutGrid, name: 'HMIS', desc: 'Plugs into existing Hospital Management systems.' },
  { icon: Database, name: 'EMR', desc: 'One-click push to leading electronic medical records.' },
];

export default function Partners() {
  return (
    <Section id="partners" bg="#F8F7FF" className="py-[80px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-12">
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(24px,4.5vw,32px)] leading-tight font-semibold text-[#111827]"
            style={{ fontFamily: 'Inter' }}
          >
            Plays well with India's health infrastructure.
          </motion.h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {PARTNERS.map((p, i) => (
            <motion.div
              key={p.name}
              variants={fadeUp}
              className="bg-white rounded-2xl p-6 border border-surface-100 text-center group hover:shadow-lg transition-shadow"
            >
              <div className="mx-auto w-14 h-14 rounded-xl bg-surface-100 group-hover:bg-primary-50 flex items-center justify-center text-surface-400 group-hover:text-primary-600 transition-colors mb-4">
                <p.icon className="w-7 h-7" />
              </div>
              <div className="font-bold text-[#111827]">{p.name}</div>
              <p className="text-[13px] text-[#6B7280] mt-1.5 leading-snug">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}
