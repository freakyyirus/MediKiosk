import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

/** Respect prefers-reduced-motion globally (fade-only fallback). */
export function useSafeReducedMotion() {
  return useReducedMotion();
}

/* Standard section entrance: fade in + translateY(30px) with staggered siblings */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  },
};

export const staggerParent = (delay = 0.1): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
});

/** Small uppercase section label */
export function SectionLabel({ children, color = '#6B4EE6', className = '' }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`text-xs font-bold uppercase tracking-[0.2em] ${className}`}
      style={{ color }}
    >
      {children}
    </motion.div>
  );
}

/* Section wrapper that staggers its children */
export function Section({
  id,
  children,
  className = '',
  bg = '#ffffff',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  bg?: string;
}) {
  return (
    <motion.section
      id={id}
      variants={staggerParent(0.1)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      className={`relative ${className}`}
      style={{ background: bg }}
    >
      {children}
    </motion.section>
  );
}

/** motion element that fades up (used inside Section for staggering) */
export const M = motion;
