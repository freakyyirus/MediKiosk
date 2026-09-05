import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, FileText, Check } from 'lucide-react';
import Guardian from './Guardian';

export default function FinalCta() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <section id="cta" className="relative py-20 sm:py-28 md:py-[140px] overflow-hidden cta-gradient">
      <div className="relative max-w-[820px] mx-auto px-6 text-center text-white">
        <motion.h2
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-[clamp(28px,5vw,48px)] leading-tight font-semibold"
          style={{ fontFamily: 'Inter' }}
        >
          Transform OPD care in your hospital.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="text-[20px] text-white/80 mt-4"
        >
          Join 50+ public hospitals already saving time and saving lives.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
          className="mt-9 flex flex-col sm:flex-row justify-center gap-4"
        >
          <a href="#top" className="px-8 py-4 rounded-xl bg-white text-primary-700 font-semibold text-[17px] hover:-translate-y-0.5 transition-transform hover:shadow-2xl">
            Request a Pilot
          </a>
          <a href="#top" className="px-8 py-4 rounded-xl border-2 border-white/70 text-white font-semibold text-[17px] hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-2">
            <FileText className="w-5 h-5" /> Download Whitepaper
          </a>
        </motion.div>

        {/* email capture */}
        <motion.form
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
          onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          className="mt-8 flex flex-col sm:flex-row gap-3 max-w-[460px] mx-auto"
        >
          <input
            type="email" required placeholder="Work email address"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-14 px-5 rounded-xl bg-white text-[#111827] placeholder-surface-400 outline-none"
          />
          <button type="submit"
            className="h-14 px-6 rounded-xl bg-primary-800 text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-900 transition-colors">
            {sent ? <><Check className="w-5 h-5" /> Subscribed</> : <><Send className="w-5 h-5" /> Get Updates</>}
          </button>
        </motion.form>
      </div>

      {/* guardian centered below */}
      <div className="relative max-w-[340px] mx-auto mt-14">
        <Guardian state="success" className="nod-animation" />
      </div>
    </section>
  );
}
