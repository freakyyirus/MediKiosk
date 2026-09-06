import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import HeroIllustration from './HeroIllustration';
import { useLandingT } from './i18n';
import { motion, useReducedMotion } from 'framer-motion';

function WaveformUnderline() {
  return (
    <span className="inline-flex items-end gap-[3px] h-[14px] ml-1 align-baseline relative top-[-2px]" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-[#F97316]"
          style={{
            height: `${8 + (i % 4) * 4}px`,
            animation: `waveform 0.9s ease-in-out infinite`,
            animationDelay: `${i * 0.09}s`,
          }}
        />
      ))}
    </span>
  );
}

const PARTNERS: { sigil: string; name: string }[] = [
  { sigil: 'AIIMS', name: 'All India Institute of Medical Sciences' },
  { sigil: 'DMH', name: 'District Mental Hospital' },
  { sigil: 'ESI', name: 'Employees State Insurance' },
  { sigil: 'NGH', name: 'Nagpur Government Hospital' },
];

function TrustRow({ trusted }: { trusted: string }) {
  return (
    <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14 } } }} className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-5" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.6 }}>
      <div className="flex flex-wrap items-center gap-4">
        {PARTNERS.map((p) => (
          <span
            key={p.sigil}
            title={p.name}
            tabIndex={0}
            className="group/link inline-flex items-center justify-center h-11 min-w-[56px] px-3 rounded-full border border-indigo-100 bg-white text-indigo-700 text-[13px] font-bold tracking-wide shadow-sm grayscale hover:grayscale-0 transition-all duration-200 cursor-default focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none relative"
            aria-label={`${p.name} (${p.sigil})`}
          >
            {p.sigil}
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/link:block group-focus-visible/link:block whitespace-nowrap rounded-md bg-surface-800 text-white text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
              {p.name}
            </span>
          </span>
        ))}
      </div>
      <span className="text-[14px] text-[#6B7280] font-medium ml-auto md:ml-0">{trusted}</span>
    </motion.div>
  );
}

function FocusableAnchor({ href, onDone, children, className, ariaHidden }: {
  href: string;
  onDone?: () => void;
  children?: React.ReactNode;
  className?: string;
  ariaHidden?: boolean;
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        if (onDone) {
          e.preventDefault();
          onDone();
        }
      }}
      aria-hidden={ariaHidden}
      tabIndex={ariaHidden ? -1 : undefined}
      className={`focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none rounded-3xl ${className ?? ''}`}
    >
      {children}
    </a>
  );
}

function HeroSection() {
  const t = useLandingT();
  const reduced = useReducedMotion();

  return (
    <section id="top" className="relative min-h-screen flex items-center overflow-hidden bg-[#F8F7FF]">
      {/* animated gradient mesh */}
      <div className="absolute inset-0 hero-mesh" aria-hidden="true" />
      {/* floating breath particles (kept light — compositor-friendly props only) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="hero-breath"
            style={{
              left: `${(i * 19.7) % 100}%`,
              bottom: '-4%',
              width: `${6 + (i % 3) * 4}px`,
              height: `${6 + (i % 3) * 4}px`,
              background: i % 3 === 0 ? '#14B8A6' : '#4F46E5',
              opacity: 0.18 + (i % 4) * 0.06,
              animationDuration: `${12 + (i % 5) * 2}s`,
              animationDelay: `${(i % 6) * 1.6}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full mx-auto px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-12 sm:pb-16 grid md:grid-cols-[1.2fr_1fr] items-center gap-8 md:gap-12">
        {/* LEFT */}
        <div className="order-2 md:order-1 text-center md:text-left">
          <motion.h1
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(32px,5vw,72px)] font-semibold text-[#111827] leading-[1.1] tracking-tight"
            style={{ fontFamily: 'Inter' }}
          >
            {t.h1a}
            <br />
            <span className="text-[#F97316] italic">
              {t.h1b}<WaveformUnderline />
            </span>{' '}
            {t.h1c}
          </motion.h1>

          <motion.p
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 sm:mt-6 text-base sm:text-lg md:text-[20px] text-[#6B7280] max-w-[560px] mx-auto md:mx-0 leading-relaxed"
          >
            {t.sub}
          </motion.p>

          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 sm:mt-9 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 sm:gap-4"
          >
            <Link
              to="/kiosk/home"
              className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-[18px] transition-all hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5"
            >
              {t.start}
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <FocusableAnchor
              href="#how"
              className="hidden sm:inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold text-[17px] transition-colors"
            >
              <span className="relative w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <span aria-hidden className="absolute inset-0 rounded-full bg-indigo-600/40" style={{ animation: 'pulse-ring 1.8s ease-out infinite' }} />
                <Play className="relative w-4 h-4 text-white fill-white" />
              </span>
              {t.demo}
            </FocusableAnchor>
            <a href="#how" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-4 sm:hidden" tabIndex={0}>
              {t.seehow}
            </a>
          </motion.div>

          <TrustRow trusted={t.trusted} />
        </div>

        {/* RIGHT — editorial patient+doctor illustration, preloaded */}
        <div className="order-1 md:order-2 flex justify-center">
          <div className="w-[280px] sm:w-[360px] md:w-[400px] lg:w-[460px]">
            <HeroIllustration className="animate-float" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Hero() {
  return <HeroSection />;
}