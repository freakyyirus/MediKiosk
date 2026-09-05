import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Network, Trash2 } from 'lucide-react';
import Guardian from './Guardian';
import { Section, SectionLabel, fadeUp } from './motion';

const PILLARS = [
  { icon: ShieldCheck, color: '#6B4EE6', title: 'DPDP Act 2023 Compliant', desc: 'Granular consent for every purpose. Right to access, correct, and delete. Complete audit trails.' },
  { icon: Lock, color: '#2DD4BF', title: 'End-to-End Encryption', desc: 'AES-256 at rest. TLS 1.3 in transit. Voice recordings deleted within 24 hours.' },
  { icon: Network, color: '#FF8C69', title: 'ABDM Integrated', desc: 'FHIR R4 bundles. ABHA-linked health records. Consent artifacts for every data share.' },
  { icon: Trash2, color: '#6B7280', title: 'Zero Data Retention', desc: 'Session data cleared from kiosk immediately after submission. No voice left behind.' },
];

const FLOW = ['Patient', 'Kiosk', 'Encrypted Tunnel', 'Hospital Server', 'ABDM Cloud'];

export default function Security() {
  return (
    <Section id="security" bg="#ffffff" className="py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <SectionLabel className="mb-4" color="#4F46E5">Security</SectionLabel>
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(28px,4vw,40px)] leading-tight font-semibold text-[#111827] max-w-[720px] mx-auto"
            style={{ fontFamily: 'Inter' }}
          >
            Your health data stays yours. Protected by law, encrypted by design.
          </motion.h2>
        </div>

        {/* 4 pillar cards */}
        <div className="grid sm:grid-cols-2 gap-6 mb-14">
          {PILLARS.map((p, i) => (
            <motion.div key={p.title} variants={fadeUp} className="bg-white rounded-2xl p-8 border border-surface-100 shadow-lg shadow-surface-900/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${p.color}18` }}>
                <p.icon className="w-7 h-7" style={{ color: p.color }} />
              </div>
              <h3 className="text-xl font-semibold text-[#111827] mb-2" style={{ fontFamily: 'Inter' }}>{p.title}</h3>
              <p className="text-[15px] text-[#6B7280] leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* encryption flow */}
          <motion.div variants={fadeUp} className="bg-[#F0EBFF] rounded-2xl p-8">
            <div className="text-lg font-semibold text-[#111827] mb-7 text-center">Encryption Flow</div>
            <div className="flex items-center justify-between gap-1 flex-wrap">
              {FLOW.map((f, i) => (
                <div key={f} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <motion.span
                      className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center"
                      initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15, type: 'spring' }}
                    >
                      {i === 0 || i === 1 ? <Lock className="w-4 h-4 text-primary-600" /> : i === FLOW.length - 1 ? <Lock className="w-4 h-4 text-teal-500" /> : <span className="w-4 h-4 rounded-full bg-primary-200" />}
                    </motion.span>
                    <span className="text-[10px] text-surface-600 text-center leading-tight">{f}</span>
                  </div>
                  {i < FLOW.length - 1 && (
                    <div className="relative flex-1 mx-0.5 mb-5">
                      <span className="block h-0.5 bg-primary-300/60" />
                      {[0, 1].map((d) => (
                        <motion.span
                          key={d}
                          className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-500"
                          style={{ left: 0 }}
                          animate={{ left: ['0%', '100%'] }}
                          transition={{ duration: 1.4, repeat: Infinity, delay: d * 0.7, ease: 'linear' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* shield guardian */}
          <div className="relative flex justify-center">
            <div className="w-[260px] lg:w-[300px] opacity-90">
              <Guardian state="shield" />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
