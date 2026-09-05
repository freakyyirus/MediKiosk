import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HeartPulse } from 'lucide-react';

const PHRASES = [
  'Initializing compassion...',
  'Loading 12 languages...',
  'Preparing your care...',
];

export default function Preloader({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);

  // typewriter effect, cycling through phrases
  useEffect(() => {
    const full = PHRASES[phraseIdx];
    let i = 0;
    setText('');
    const iv = setInterval(() => {
      i++;
      setText(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(iv);
        setTimeout(() => {
          setPhraseIdx((p) => (p + 1) % PHRASES.length);
        }, 700);
      }
    }, 45);
    return () => clearInterval(iv);
  }, [phraseIdx]);

  // total 2.5s then fade out
  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (leaving) {
      const t = setTimeout(onDone, 600);
      return () => clearTimeout(t);
    }
  }, [leaving, onDone]);

  return (
    <AnimatePresence>
      {!leaving ? (
        <motion.div
          className="fixed inset-0 z-[999] bg-[#F8F7FF] flex flex-col items-center justify-center"
          exit={{ opacity: 0, filter: 'blur(12px)', scale: 1.05 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* pulsing heart */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <motion.span
              className="absolute inset-0 rounded-full bg-primary-500/20"
              animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="absolute inset-0 rounded-full bg-primary-400/20" />
            <div className="w-16 h-16 rounded-2xl bg-white shadow-xl shadow-primary-600/20 flex items-center justify-center relative z-10">
              <HeartPulse className="w-9 h-9 text-primary-600" />
            </div>
          </div>

          {/* typewriter text */}
          <div className="mt-8 h-7 flex items-center justify-center text-lg font-medium text-surface-600">
            {text}
            <span className="w-0.5 h-6 ml-1 bg-primary-600 animate-pulse" />
          </div>

          {/* progress bar */}
          <div className="mt-6 w-56 h-0.5 rounded-full bg-surface-200 overflow-hidden">
            <motion.div
              className="h-full bg-primary-600"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.4, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
