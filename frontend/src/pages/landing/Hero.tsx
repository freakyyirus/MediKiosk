import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import Guardian from './Guardian';
import { SectionLabel, fadeUp } from './motion';

function WaveformUnderline() {
  return (
    <span className="inline-flex items-end gap-[3px] h-[14px] ml-1 align-baseline relative top-[-2px]" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-[#FF8C69]"
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

const PARTNERS = ['AIIMS', 'DMH', 'ESI', 'NGH'];

function TrustRow() {
  return (
    <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-4">
      <div className="flex -space-x-2">
        {PARTNERS.map((p, i) => (
          <span
            key={p}
            className="w-9 h-9 rounded-full bg-surface-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-surface-400"
            style={{ zIndex: 4 - i }}
          >
            {p.slice(0, 3)}
          </span>
        ))}
      </div>
      <span className="text-[14px] text-[#6B7280] font-medium">
        Trusted by 50+ public hospitals across 8 states
      </span>
    </motion.div>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  const areaRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMouseMove = (e: React.MouseEvent) => {
    const r = areaRef.current?.getBoundingClientRect();
    if (!r) return;
    setTilt({
      x: ((e.clientX - r.left) / r.width - 0.5) * 12,
      y: ((e.clientY - r.top) / r.height - 0.5) * -12,
    });
  };

  return (
    <section id="top" className="relative min-h-screen flex items-center overflow-hidden bg-[#F8F7FF]">
      {/* animated gradient mesh */}
      <div className="absolute inset-0 hero-mesh" />
      {/* floating breath particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {Array.from({ length: 42 }).map((_, i) => (
          <span
            key={i}
            className="hero-breath"
            style={{
              left: `${(i * 9.7) % 100}%`,
              bottom: '-4%',
              width: `${5 + (i % 4) * 4}px`,
              height: `${5 + (i % 4) * 4}px`,
              background: i % 3 === 0 ? '#2DD4BF' : '#6B4EE6',
              opacity: 0.25 + (i % 5) * 0.06,
              animationDuration: `${9 + (i % 6) * 2}s`,
              animationDelay: `${(i % 7) * 1.3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto w-full px-4 sm:px-6 lg:px-10 pt-24 sm:pt-28 pb-12 sm:pb-16 grid md:grid-cols-[1.2fr_1fr] items-center gap-8 md:gap-12">
        {/* LEFT */}
        <motion.div initial="hidden" animate="show" exit="show" variants={{ show: { transition: { staggerChildren: 0.12 } } }} className="order-2 md:order-1 text-center md:text-left">
          <motion.h1
            variants={fadeUp}
            className="text-[clamp(32px,5vw,72px)] font-semibold text-[#1A1A2E] leading-[1.1] tracking-tight"
            style={{ fontFamily: 'Inter' }}
          >
            Your Health Story,
            <br />
            <span className="text-[#FF8C69] italic">
              Heard<WaveformUnderline />
            </span>{' '}
            in Every Language
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-4 sm:mt-6 text-base sm:text-lg md:text-[20px] text-[#6B7280] max-w-[560px] mx-auto md:mx-0 leading-relaxed"
          >
            AI that listens to patients in their mother tongue, digitizes years of
            paper records, and hands doctors a complete clinical summary before the
            first handshake.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-6 sm:mt-9 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 sm:gap-4">
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-[17px] transition-all hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5"
            >
              See How It Works <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#product"
              className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-semibold text-[17px] transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                <Play className="w-4 h-4 text-white" />
              </span>
              Watch 2-Min Demo
            </a>
          </motion.div>

          <TrustRow />
        </motion.div>

        {/* RIGHT — Guardian with mouse tilt */}
        <div
          ref={areaRef}
          onMouseMove={onMouseMove}
          className="order-1 md:order-2 flex justify-center perspective-[1200px]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{
              transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
              transformStyle: 'preserve-3d',
            }}
            className="w-[220px] sm:w-[280px] md:w-[320px] lg:w-[420px]"
          >
            <Guardian state="whole" orbitCards className="animate-float" />
          </motion.div>
        </div>
      </div>

      {/* scroll indicator */}
      <motion.div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        <span className="text-[12px] text-[#6B7280] font-medium">Scroll to explore</span>
        <span className="w-px h-10 relative bg-primary-200 overflow-hidden">
          <motion.span
            className="absolute top-0 left-0 w-px h-4 bg-primary-600"
            animate={{ y: ['-100%', '400%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
        <span className="w-2 h-2 rounded-full bg-primary-600 animate-bounce" />
      </motion.div>
    </section>
  );
}
