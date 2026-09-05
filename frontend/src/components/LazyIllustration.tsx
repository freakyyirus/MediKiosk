import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Lazy-mounts an <svg> below the fold. The illustration only renders once it
 * scrolls near the viewport (avoids parsing heavy graphics on initial load);
 * while deferred, an indigo shimmer placeholder keeps the layout height stable.
 */
export default function LazyIllustration({
  height,
  children,
  className = '',
  delay = 200,
}: {
  height: number | string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [inView, delay]);

  return (
    <div ref={ref} className={`relative ${className}`} style={{ minHeight: height }}>
      {show ? (
        children
      ) : (
        <div className="absolute inset-0 shimmer rounded-2xl" aria-hidden="true" />
      )}
    </div>
  );
}