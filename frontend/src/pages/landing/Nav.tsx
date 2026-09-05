import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Menu, X } from 'lucide-react';

const LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how', label: 'How It Works' },
  { href: '#portals', label: 'Portals' },
  { href: '#ayush', label: 'AYUSH' },
  { href: '#impact', label: 'Impact' },
  { href: '#security', label: 'Security' },
];

const LANGUAGES = ['English', 'हिन्दी', 'தமிழ்', 'বাংলা', 'मराठी'];

export default function Nav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState('English');
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md transition-shadow duration-300 ${
          scrolled ? 'shadow-lg shadow-surface-900/5' : ''
        }`}
        style={{ height: 72 }}
      >
        <div className="h-full max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          {/* Wordmark */}
          <a href="#top" className="flex items-center gap-2 font-bold text-[22px] text-[#1A1A2E] tracking-tight" style={{ fontFamily: 'Inter' }}>
            MediKiosk
            <span className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
          </a>

          {/* Center pill nav (desktop) */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-4 py-2 rounded-xl text-[15px] font-medium text-surface-600 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Language selector */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-200 bg-white hover:border-primary-400 transition-colors text-[14px] font-medium text-surface-700"
              >
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center text-[10px] text-white font-bold">
                  EN
                </span>
                {lang}
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-surface-100 overflow-hidden"
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLang(l); setLangOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[14px] hover:bg-primary-50 transition-colors ${l === lang ? 'text-primary-600 font-semibold bg-primary-50' : 'text-surface-700'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sign In */}
            <button
              onClick={() => navigate('/login')}
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-surface-200 bg-white hover:border-primary-400 text-surface-700 hover:text-primary-600 font-semibold transition-colors text-[15px]"
            >
              Sign In
            </button>

            {/* Sign Up */}
            <button
              onClick={() => navigate('/register')}
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-colors text-[15px]"
            >
              Sign Up
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center border border-surface-200 text-surface-800"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile bottom sheet menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl p-6 pb-10 shadow-2xl"
            >
              <div className="w-10 h-1.5 rounded-full bg-surface-200 mx-auto mb-5" />
              <div className="grid gap-1">
                {LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-[17px] font-medium text-surface-700 hover:bg-primary-50"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
              <div className="grid gap-2 mt-2">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/register'); }}
                  className="w-full py-4 rounded-2xl bg-primary-600 text-white font-semibold text-[17px] flex items-center justify-center gap-2"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/login'); }}
                  className="w-full py-4 rounded-2xl bg-white border-2 border-surface-200 text-surface-800 font-semibold text-[17px] flex items-center justify-center gap-2"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/kiosk/language'); }}
                  className="w-full py-4 rounded-2xl bg-surface-100 text-surface-700 font-semibold text-[17px] flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" /> Try Kiosk Demo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
