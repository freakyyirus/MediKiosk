/**
 * Smooth-scroll singleton (Lenis) wired into GSAP's ticker so both the scroll
 * engine and any ScrollTrigger animations share one clock. Respects
 * prefers-reduced-motion and degrades back to native scrolling.
 */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let tickCleanup: (() => void) | null = null;

export const isSmoothScrollActive = (): boolean => lenis !== null;

/** Start Lenis. Returns a disposer that stops and tears everything down. */
export const initSmoothScroll = (): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  if (lenis) return () => {};

  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
  });

  lenis.on('scroll', ScrollTrigger.update);

  const raf = (time: number) => {
    lenis?.raf(time);
  };
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // Lenis drives the wheel; stop CSS smooth-behavior from fighting it.
  document.documentElement.style.scrollBehavior = 'auto';

  tickCleanup = () => {
    gsap.ticker.remove(raf);
    gsap.ticker.lagSmoothing(500);
    lenis?.destroy();
    lenis = null;
    document.documentElement.style.scrollBehavior = '';
  };

  return tickCleanup;
};

/** Freeze body + Lenis (modal/drawer open). */
export const lockScroll = (): void => {
  document.body.style.overflow = 'hidden';
  lenis?.stop();
};

/** Restore body + Lenis (modal/drawer closed). */
export const unlockScroll = (): void => {
  document.body.style.overflow = '';
  lenis?.start();
};

/** Re-enable Lenis after a bfcache restore. */
export const resumeSmoothScroll = (): void => {
  lenis?.start();
};

/** Scroll to the top, optionally instantly. */
export const scrollToTop = (immediate = false): void => {
  if (lenis) {
    lenis.scrollTo(0, { immediate });
  } else {
    window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
  }
};