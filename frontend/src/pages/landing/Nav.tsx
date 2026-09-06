import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Menu, X } from 'lucide-react';
import Logo from '../../components/brand/Logo';
import { LANGS, useLangStore, useLandingT } from './i18n';
import { useAuthStore, getRoleRedirect } from '../../stores/authStore';
import { lockScroll, unlockScroll } from '../../lib/smoothScroll';

const LINKS = [
  { href: '#product', key: 'product' },
  { href: '#how', key: 'how' },
  { href: '#portals', key: 'portals' },
  { href: '#ayush', key: 'ayush' },
  { href: '#impact', key: 'impact' },
  { href: '#security', key: 'security' },
] as const;

const FOCUS = 'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:rounded-xl';

export default function Nav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const code = useLangStore((s) => s.code);
  const setCode = useLangStore((s) => s.setCode);
  const t = useLandingT();
  const currentLang = LANGS.find((l) => l.code === code) ?? LANGS[0];

  // Scroll-aware header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click / Escape; lock scroll + Lenis drawer open
  useEffect(() => {
    if (menuOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!langOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLangOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [langOpen]);

  const go = (href: string) => {
    setMenuOpen(false);
    document.querySelector<HTMLElement>(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-white/80 backdrop-blur-md'
        }`}
        style={{ height: 72 }}
      >
        <div className="h-full w-full mx-auto px-4 sm:px-6 flex items-center justify-between">
          <a href="#top" className="flex items-center" onClick={(e) => { e.preventDefault(); go('#top'); }}>
            <Logo size={34} variant="gradient" />
          </a>

          {/* Center pill nav (desktop) */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Primary">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => { e.preventDefault(); go(l.href); }}
                className={`px-4 py-2 rounded-xl text-[15px] font-medium text-[#6B7280] hover:text-indigo-600 hover:bg-indigo-50 transition-colors ${FOCUS}`}
              >
                {t[l.key]}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Language selector */}
            <div ref={langRef} className="relative hidden md:block">
              <button
                onClick={() => setLangOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-200 bg-white hover:border-primary-400 transition-colors text-[14px] font-medium text-[#374151] ${FOCUS}`}
              >
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center text-[10px] text-white font-bold">
                  {code.toUpperCase().slice(0, 2)}
                </span>
                {currentLang.nativeName}
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    role="listbox"
                    aria-label="Choose language"
                    className="absolute right-0 top-full mt-2 w-40 z-50 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-surface-100 overflow-hidden"
                  >
                    {LANGS.map((l) => (
                      <button
                        key={l.code}
                        role="option"
                        aria-selected={l.code === code}
                        onClick={() => { setCode(l.code); setLangOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[14px] hover:bg-indigo-50 transition-colors ${l.code === code ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-[#374151]'} ${FOCUS}`}
                      >
                        {l.nativeName}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Auth Buttons */}
            {!useAuthStore.getState().isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className={`hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-surface-200 bg-white hover:border-primary-400 text-[#374151] hover:text-indigo-600 font-semibold transition-colors text-[15px] ${FOCUS}`}
                >
                  {t.signin}
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className={`hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all text-[15px] hover:brightness-110 ${FOCUS}`}
                >
                  {t.signup}
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  const role = useAuthStore.getState().user?.role;
                  if (role) {
                    navigate(getRoleRedirect(role));
                  }
                }}
                className={`hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all text-[15px] hover:brightness-110 ${FOCUS}`}
              >
                Dashboard
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className={`lg:hidden w-10 h-10 rounded-xl flex items-center justify-center border border-surface-200 text-surface-800 ${FOCUS}`}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer (slide-in from right) */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-surface-900/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[min(86vw,340px)] bg-white shadow-2xl flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-6 h-16 border-b border-surface-100">
                <span className="text-[15px] font-semibold text-[#111827]">Menu</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border border-surface-200 text-surface-800 ${FOCUS}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-4 py-4 grid gap-1" aria-label="Mobile" data-lenis-prevent>
                {LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={(e) => { e.preventDefault(); go(l.href); }}
                    className={`px-4 py-3 rounded-xl text-[17px] font-medium text-[#374151] hover:bg-indigo-50 rounded-xl ${FOCUS}`}
                  >
                    {t[l.key]}
                  </a>
                ))}
              </nav>
              <div className="px-6 py-5 border-t border-surface-100 grid gap-2">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/register'); }}
                  className={`w-full py-4 rounded-2xl bg-primary-600 text-white font-semibold text-[17px] hover:brightness-110 ${FOCUS}`}
                >
                  {t.signup}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/login'); }}
                  className={`w-full py-4 rounded-2xl bg-white border-2 border-surface-200 text-[#374151] font-semibold text-[17px] ${FOCUS}`}
                >
                  {t.signin}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/kiosk/language'); }}
                  className={`w-full py-4 rounded-2xl bg-indigo-50 text-indigo-700 font-semibold text-[17px] flex items-center justify-center gap-2 ${FOCUS}`}
                >
                  <Sparkles className="w-5 h-5" /> {t.trykiosk}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}