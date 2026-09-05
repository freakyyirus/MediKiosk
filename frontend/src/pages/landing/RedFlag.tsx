import { motion } from 'framer-motion';
import { HeartPulse, Brain, Droplets, Bell } from 'lucide-react';
import Guardian from './Guardian';
import { Section, fadeUp } from './motion';

const ALERTS = [
  {
    icon: HeartPulse, title: 'Chest Pain Protocol',
    desc: 'Automatic cardiac triage triggered. ECG prep notified.',
  },
  {
    icon: Brain, title: 'Stroke FAST Check',
    desc: 'Facial droop, arm weakness, speech difficulty detected. Neurology alerted.',
  },
  {
    icon: Droplets, title: 'Severe Bleeding',
    desc: 'Hematemesis or melena flagged. Surgical team notified.',
  },
];

export default function RedFlag() {
  return (
    <Section id="safety" bg="linear-gradient(135deg,#FEE2E2,#ffffff 60%)" className="py-20 md:py-28 overflow-hidden">
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 items-center">
        {/* LEFT */}
        <div>
          <motion.div variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-danger-500 mb-4">
            Safety First
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-[48px] leading-tight font-bold text-[#111827] max-w-[560px]"
            style={{ fontFamily: 'Inter' }}
          >
            Emergencies don't wait in line.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 text-[18px] text-[#6B7280] leading-relaxed max-w-[540px]">
            Our AI monitors every word for 200+ critical patterns. Chest pain with
            breathlessness. Sudden weakness on one side. Severe bleeding. The moment
            danger is detected, the queue stops and help arrives.
          </motion.p>

          <div className="mt-9 space-y-4">
            {ALERTS.map((a, i) => (
              <motion.div
                key={a.title}
                variants={fadeUp}
                className="flex items-start gap-4 p-5 rounded-xl border-l-4 border-danger-500 bg-[#FEE2E2]"
              >
                <div className="relative w-11 h-11 rounded-full bg-danger-500 flex items-center justify-center shrink-0">
                  <motion.span className="absolute inset-0 rounded-full bg-danger-400/50" animate={{ scale: [1, 1.6], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: i * 0.3 }} />
                  <a.icon className="w-5 h-5 text-white relative" />
                </div>
                <div>
                  <div className="font-semibold text-[#111827] text-[17px]">{a.title}</div>
                  <div className="text-[15px] text-[#6B7280] mt-0.5">{a.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p variants={fadeUp} className="mt-8 text-[16px] text-surface-500">
            False positive rate under 5%. Every alert is reviewed by a human.
          </motion.p>
        </div>

        {/* RIGHT — Guardian alert + notification */}
        <div className="relative flex justify-center">
          <div className="w-[300px] lg:w-[340px]">
            <Guardian state="alert" />
          </div>

          {/* floating priority token */}
          <motion.div
            className="absolute top-6 -left-2 lg:left-0 glass-card rounded-2xl px-4 py-3 shadow-xl"
            initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
            animate={{ y: [0, -6, 0] }}
          >
            <div className="text-[11px] font-bold text-danger-600 uppercase tracking-wide">Priority</div>
            <div className="text-2xl font-black text-[#111827]">P-001</div>
          </motion.div>

          {/* notification card slides in */}
          <motion.div
            className="absolute bottom-4 -right-2 lg:right-0 glass-card rounded-2xl p-4 shadow-xl flex items-start gap-3 max-w-[260px]"
            initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.7 }}
          >
            <span className="w-9 h-9 rounded-full bg-danger-500 flex items-center justify-center shrink-0"><Bell className="w-4 h-4 text-white" /></span>
            <div>
              <div className="text-[13px] font-semibold text-[#111827]">Emergency detected in Kiosk 4</div>
              <div className="text-[12px] text-[#6B7280]">Patient routed to Cardiac Bay.</div>
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
