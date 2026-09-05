import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, LogOut } from 'lucide-react';
import Logo from '../brand/Logo';
import { useUIStore } from '../../stores';
import { useT } from '../../lib/i18n';

const AUTO_EXIT_MS = 2 * 60 * 1000;
const TICK_MS = 1000;

function formatCountdown(msLeft: number) {
  const total = Math.ceil(msLeft / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { highContrast, lowLiteracyMode } = useUIStore();
  const t = useT();
  const [countdown, setCountdown] = useState(AUTO_EXIT_MS);
  const remainingRef = useRef(AUTO_EXIT_MS);

  const resetTimer = useCallback(() => {
    remainingRef.current = AUTO_EXIT_MS;
    setCountdown(AUTO_EXIT_MS);
  }, []);

  useEffect(() => {
    const onActivity = () => resetTimer();
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    const interval = window.setInterval(() => {
      remainingRef.current -= TICK_MS;
      if (remainingRef.current <= 0) {
        navigate('/patient/dashboard', { replace: true });
        return;
      }
      setCountdown(remainingRef.current);
    }, TICK_MS);

    return () => {
      window.clearInterval(interval);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
    };
  }, [resetTimer, navigate]);

  const urgent = countdown <= 30_000;

  return (
    <div className={`min-h-screen bg-white text-surface-900 flex flex-col ${highContrast ? 'high-contrast' : ''} ${lowLiteracyMode ? 'low-literacy' : ''}`}>
      <header className="w-full flex items-center justify-between px-6 sm:px-10 py-5 border-b border-surface-200 bg-surface-50">
        <div className="flex items-center gap-3">
          <Logo size={44} variant="gradient" showWordmark={false} />
          <div>
            <p className="text-lg sm:text-xl font-bold leading-tight">{t('kioskMode')}</p>
            <p className="text-sm text-surface-600 flex items-center gap-1">
              <Monitor size={14} /> {t('kioskSub')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`hidden sm:flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
              urgent ? 'bg-danger-100 text-danger-700' : 'bg-surface-100 text-surface-600'
            }`}
            aria-live="polite"
          >
            <span role="img" aria-hidden="true">⏱</span>
            {t('autoExitIn')} {formatCountdown(countdown)}
          </div>
          <button
            onClick={() => navigate('/patient/dashboard', { replace: true })}
            className="touch-target-lg flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base px-6 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <LogOut size={20} /> {t('exitKiosk')}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 sm:px-10 py-8">{children}</main>

      <footer className="w-full px-6 sm:px-10 pb-6 text-center text-surface-500 text-sm">
        {t('footerAutoExit')}
      </footer>
    </div>
  );
}