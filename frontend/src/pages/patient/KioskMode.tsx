import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, CalendarPlus, ClipboardList, FileText, Heart, Accessibility, Sparkles } from 'lucide-react';
import { useUIStore } from '../../stores';
import { useAuthStore } from '../../stores/authStore';
import { APP_LANGS, useT } from '../../lib/i18n';
import { bhashini } from '../../services/BhashiniService';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useToastStore } from '../../components/shared/Toast';
import KioskLayout from '../../components/kiosk/KioskLayout';

const ACTIONS = [
  { key: 'bookOpd', keyDesc: 'bookOpdDesc', path: '/patient/book-opd', icon: <CalendarPlus size={34} /> },
  { key: 'myVisits', keyDesc: 'myVisitsDesc', path: '/patient/visits', icon: <ClipboardList size={34} /> },
  { key: 'myDocuments', keyDesc: 'myDocumentsDesc', path: '/patient/documents', icon: <FileText size={34} /> },
  { key: 'healthTimeline', keyDesc: 'healthTimelineDesc', path: '/patient/health-timeline', icon: <Heart size={34} /> },
] as const;

export default function KioskMode() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { highContrast, lowLiteracyMode, toggleHighContrast, toggleLowLiteracyMode, language, setLanguage } = useUIStore();
  const t = useT();
  const addToast = useToastStore(s => s.addToast);
  const [listening, setListening] = useState(false);
  const [lastUtterance, setLastUtterance] = useState('');
  const voice = useVoiceInput({ language: () => language.code });

  useEffect(() => () => voice.cleanup(), [voice.cleanup]);

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const handleUtterance = async (raw: string) => {
    const clean = raw.trim();
    if (!clean) {
      setLastUtterance('');
      addToast('info', t('didntCatch'));
      return;
    }
    setLastUtterance(clean);
    void bhashini.speak(clean, language.code);
  };

  const toggleMic = async () => {
    if (voice.recording || listening) {
      setListening(false);
      await handleUtterance(await voice.stop());
      return;
    }
    const started = await voice.begin();
    setListening(true);
    if (!started) {
      const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
      const hasSR = !!(w.SpeechRecognition || w.webkitSpeechRecognition);
      if (!voice.micAvailable && !hasSR) {
        setListening(false);
        addToast('error', t('micUnavailable'));
        return;
      }
      await handleUtterance(await voice.dictate());
      setListening(false);
    }
  };

  return (
    <KioskLayout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight">
              {t('helloWithName', { name: firstName })} 👋
            </h1>
            <p className="text-xl text-surface-600 mt-2">{t('howCanWeHelp')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleLowLiteracyMode()}
              className={`touch-target flex items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold text-base transition-colors ${
                lowLiteracyMode ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-surface-300 text-surface-700'
              }`}
            >
              <Accessibility size={20} /> {t('easyRead')}
            </button>
            <button
              onClick={() => toggleHighContrast()}
              className={`touch-target flex items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold text-base transition-colors ${
                highContrast ? 'border-accent-400 bg-accent-50 text-accent-700' : 'border-surface-300 text-surface-700'
              }`}
            >
              <Sparkles size={20} /> {t('highContrast')}
            </button>
          </div>
        </div>

        {/* Voice-first: big, high-contrast mic */}
        <button
          onClick={toggleMic}
          aria-pressed={listening}
          aria-label={listening ? t('listening') : t('tapToSpeak')}
          className={`touch-target-lg w-full flex flex-col items-center justify-center gap-4 rounded-3xl py-12 transition-all focus-visible:ring-4 focus-visible:ring-primary-500 focus-visible:ring-offset-4 ${
            listening
              ? 'bg-primary-600 text-white animate-pulse shadow-2xl shadow-primary-600/40'
              : 'bg-primary-50 text-primary-700 border-2 border-primary-300 hover:bg-primary-100'
          }`}
        >
          <span className={`flex items-center justify-center rounded-full bg-white shadow-xl p-6 ${listening ? 'animate-pulse' : ''}`}>
            {listening ? <Mic size={48} className="text-primary-700" /> : <MicOff size={48} className="text-primary-700" />}
          </span>
          <span className="text-3xl font-black">
            {listening ? t('listening') : t('tapToSpeak')}
          </span>
          <span className={`text-lg font-medium ${listening ? 'text-white/90' : 'text-surface-600'}`}>
            {t('speechHint')}
          </span>
        </button>

        {lastUtterance && (
          <div className="rounded-2xl border-2 border-primary-200 bg-white p-5 text-center">
            <p className="text-sm font-bold text-surface-600">{t('youSaid')}</p>
            <p className="text-2xl font-black text-primary-700 mt-1">{lastUtterance}</p>
          </div>
        )}

        {/* Quick language */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold text-surface-700 mr-2">{t('languageQuick')}</span>
          {APP_LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage({ code: l.code, name: l.nativeName, nativeName: l.nativeName, icon: '' })}
              className={`touch-target rounded-2xl border-2 px-5 py-2 text-lg font-bold transition-colors ${
                language.code === l.code
                  ? 'border-primary-500 bg-primary-600 text-white'
                  : 'border-surface-200 bg-white text-surface-700 hover:border-primary-300'
              }`}
            >
              {t(`lang${l.code[0].toUpperCase()}${l.code.slice(1)}` as never)}
            </button>
          ))}
        </div>

        {/* Big action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ACTIONS.map((a) => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="touch-target-lg flex items-center gap-5 rounded-2xl border-2 border-surface-200 bg-white p-6 text-left transition-all hover:border-primary-400 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 text-primary-700 shrink-0">{a.icon}</span>
              <span>
                <span className="block text-2xl font-black text-surface-900">{t(a.key)}</span>
                <span className="block text-base text-surface-600 mt-1">{t(a.keyDesc)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </KioskLayout>
  );
}