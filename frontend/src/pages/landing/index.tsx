import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
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

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = reducedMotion ? 'auto' : 'smooth';
    return () => { document.documentElement.style.scrollBehavior = ''; };
  }, [reducedMotion]);

  // If reduced motion, skip the preloader delay
  useEffect(() => {
    if (reducedMotion) setLoading(false);
  }, [reducedMotion]);

  return (
    <>
      {loading && <Preloader onDone={() => setLoading(false)} />}
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
    </>
  );
}
