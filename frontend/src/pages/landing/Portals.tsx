import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Stethoscope, Building2, ArrowRight, QrCode, ScanText, Activity, ShieldCheck, CalendarPlus, HeartPulse, Trash2, ClipboardList, Users } from 'lucide-react';
import { Section, SectionLabel, fadeUp } from './motion';

interface PortalCard {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  accent: string;
  role: string;
  features: { icon: React.ComponentType<{ className?: string }>; label: string }[];
}

const PORTALS: PortalCard[] = [
  {
    key: 'patient',
    title: 'Patient Portal',
    subtitle: 'Own your health records, book OPD, track visits & documents.',
    icon: User,
    gradient: 'linear-gradient(135deg,#6B4EE6,#9B87F5)',
    accent: '#6B4EE6',
    role: 'patient',
    features: [
      { icon: CalendarPlus, label: 'Book OPD appointments' },
      { icon: HeartPulse, label: 'Health timeline & records' },
      { icon: ShieldCheck, label: 'Documents vault & QR slips' },
    ],
  },
  {
    key: 'hospital',
    title: 'Hospital Portal',
    subtitle: 'Run the OPD — triage, queue, departments, doctors & live vitals.',
    icon: Building2,
    gradient: 'linear-gradient(135deg,#FF8C69,#FFB4A2)',
    accent: '#FF8C69',
    role: 'hospital_admin',
    features: [
      { icon: ClipboardList, label: "Today's OPD & triage desk" },
      { icon: Activity, label: 'Vitals + early-warning alarm' },
      { icon: Trash2, label: 'Data retention manager (DPDPA)' },
    ],
  },
  {
    key: 'doctor',
    title: 'Doctor Portal',
    subtitle: 'Clinical workflow — patient queue, QR scan, OCR, scheduling.',
    icon: Stethoscope,
    gradient: 'linear-gradient(135deg,#2DD4BF,#5EEAD4)',
    accent: '#2DD4BF',
    role: 'doctor',
    features: [
      { icon: Users, label: 'Patient queue & cards' },
      { icon: QrCode, label: 'Scan smart QR slips' },
      { icon: ScanText, label: 'Handwritten prescription OCR' },
    ],
  },
];

export default function Portals() {
  const navigate = useNavigate();

  return (
    <Section id="portals" bg="#F8F7FF" className="py-[110px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4" color="#4F46E5">3 Portals · 1 Platform</SectionLabel>
          <motion.h2
            variants={fadeUp}
            className="text-[clamp(28px,4vw,40px)] leading-tight font-semibold text-[#111827] max-w-[680px] mx-auto"
            style={{ fontFamily: 'Inter' }}
          >
            Built for patients, doctors & hospitals.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-[#6B7280] max-w-[620px] mx-auto">
            Create a free account for your role and sign in to your portal — all six advanced features are one click away.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PORTALS.map((p) => (
            <motion.div
              key={p.key}
              variants={fadeUp}
              whileHover={{ translateY: -6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="bg-white rounded-2xl shadow-lg shadow-surface-900/5 hover:shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="h-28 flex items-center justify-center" style={{ background: p.gradient }}>
                <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center">
                  <p.icon className="w-7 h-7 text-white" />
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: 'Inter' }}>{p.title}</h3>
                <p className="text-[15px] text-[#6B7280] leading-relaxed mt-2 mb-5">{p.subtitle}</p>

                <ul className="space-y-3 mb-6">
                  {p.features.map((f) => (
                    <li key={f.label} className="flex items-center gap-3 text-[14px] font-medium text-surface-700">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${p.accent}18`, color: p.accent }}>
                        <f.icon className="w-4 h-4" />
                      </span>
                      {f.label}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col gap-2">
                  <button
                    onClick={() => navigate(`/register?role=${p.role}`)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition-all hover:-translate-y-0.5 hover:shadow-xl"
                    style={{ background: p.accent }}
                  >
                    Sign Up as {p.title.split(' ')[0]} <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/login?role=${p.role}`)}
                    className="w-full py-2.5 rounded-xl border-2 font-semibold text-surface-700 hover:bg-surface-50 transition-colors"
                    style={{ borderColor: `${p.accent}40`, color: p.accent }}
                  >
                    I already have an account
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}