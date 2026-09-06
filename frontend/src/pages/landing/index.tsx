import { useEffect, useState } from 'react';
import { motion, MotionConfig, useReducedMotion } from 'framer-motion';
import Preloader from './Preloader';
import Nav from './Nav';
import Hero from './Hero';
import Problem from './Problem';
import Solution from './Solution';
import HowItWorks from './HowItWorks';
import Portals from './Portals';
import RedFlag from './RedFlag';
import Ayush from './Ayush';
import Security from './Security';
import Impact from './Impact';
import Testimonials from './Testimonials';
import Partners from './Partners';
import Faq from './Faq';
import FinalCta from './FinalCta';
import Footer from './Footer';
import StickyMobileCta from '../../components/shared/StickyMobileCta';
import { peekReplayLoader, clearReplayLoader, saveLoaderPageScroll, restoreLoaderPageScroll } from '../../lib/navigationController';
import { initSmoothScroll } from '../../lib/smoothScroll';

export default function LandingPage() {
  const [loading, setLoading] = useState(() => {
    // Back-button re-entry restores instantly (no loader); only a first-ever
    // visit shows the quick splash.
    const replay = peekReplayLoader();
    return !replay && !sessionStorage.getItem('hasSeenPreloader');
  });
  const reducedMotion = useReducedMotion();

  // Consume the armed replay flag (do not clear inside the state initializer —
  // React StrictMode may evaluate it twice). Back-button entries skip the
  // loader and restore the saved scroll position immediately.
  useEffect(() => {
    const replay = peekReplayLoader();
    clearReplayLoader();
    if (replay) {
      restoreLoaderPageScroll();
    }
  }, []);

  // Lenis smooth scrolling for the marketing page (skips with reduced motion).
  useEffect(() => {
    const dispose = initSmoothScroll();
    return () => dispose();
  }, []);

  // Remember where the user was so Back restores their place after the loader.
  useEffect(() => {
    return () => {
      saveLoaderPageScroll();
    };
  }, []);

  // If reduced motion, skip the preloader delay
  useEffect(() => {
    if (reducedMotion) setLoading(false);
  }, [reducedMotion]);

  const handlePreloaderDone = () => {
    sessionStorage.setItem('hasSeenPreloader', 'true');
    setLoading(false);
    // Restore the scroll position saved when the user left the landing page.
    restoreLoaderPageScroll();
  };

  return (
    <MotionConfig reducedMotion="user">
      {loading && <Preloader onDone={handlePreloaderDone} />}
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <HowItWorks />
        <Portals />
        <RedFlag />
        <Ayush />
        <Security />
        <Impact />
        <Testimonials />
        <Partners />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <StickyMobileCta label="Start Patient Assessment →" onClick={() => document.getElementById('kiosk')?.scrollIntoView() || window.location.assign('/kiosk/home')} dismissible />
    </MotionConfig>
  );
}
