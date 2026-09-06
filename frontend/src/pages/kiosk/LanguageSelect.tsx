import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { useUIStore } from '../../stores';
import type { Language } from '../../types';
import Stepper from '../../components/Stepper';
import EmergencyFab from '../../components/EmergencyFab';

const LANGUAGES: (Language & { flag?: string })[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', icon: '🇮🇳' },
  { code: 'en', name: 'English', nativeName: 'English', icon: '🇬🇧' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', icon: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', icon: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', icon: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', icon: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', icon: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', icon: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', icon: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', icon: '🇮🇳' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', icon: '🇮🇳' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', icon: '🇮🇳' },
];

const LANGUAGE_FLAGS: Record<string, string> = {
  hi: '🇮🇳', en: '🇬🇧', bn: '🇮🇳', ta: '🇮🇳', te: '🇮🇳', mr: '🇮🇳',
  gu: '🇮🇳', kn: '🇮🇳', ml: '🇮🇳', pa: '🇮🇳', or: '🇮🇳', as: '🇮🇳',
};

export default function LanguageSelect() {
  const navigate = useNavigate();
  const { language: selectedLang, setLanguage, lowLiteracyMode } = useUIStore();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    if (navigator.vibrate) navigator.vibrate(20);
    setTimeout(() => navigate('/kiosk/identify'), 150);
  };

  const speakLanguage = (lang: Language) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `${lang.nativeName}. ${lang.name}`
      );
      utterance.lang = lang.code === 'hi' ? 'hi-IN' : lang.code === 'en' ? 'en-IN' : `${lang.code}-IN`;
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      {/* Top bar */}
      <div className="px-4 sm:px-10 pt-5 sm:pt-10">
        <Stepper
          steps={[
            { label: 'Language' },
            { label: 'Health Check' },
            { label: 'Documents' },
            { label: 'Done' },
          ]}
          current={0}
        />
      </div>

      <div className="flex-1 flex flex-col items-center px-4 sm:px-10 py-6 sm:py-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10 animate-fade-in">
          <div className="inline-block w-16 sm:w-20 h-16 sm:h-20 rounded-[22px] bg-gradient-to-br from-primary-600 to-primary-400 mb-6 shadow-lg shadow-primary-600/25 flex items-center justify-center">
            <span className="text-3xl sm:text-4xl">🏥</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-surface-900 mb-3">
            Choose Your Language
          </h1>
          <p className="text-lg sm:text-xl text-surface-500">
            Tap your language. You can change it anytime.
          </p>
        </div>

        {/* Responsive grid of 12 languages */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full mb-8 sm:mb-10">
          {LANGUAGES.map((lang, i) => {
            const active = selectedLang.code === lang.code;
            return (
              <div
                key={lang.code}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(lang)}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(lang)}
                className={`touch-target-lg card p-4 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 cursor-pointer transition-all duration-150 animate-slide-up focus-ring ${
                  active
                    ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-600/30 border-transparent'
                    : 'hover:border-primary-300 hover:shadow-md'
                }`}
                style={{ animationDelay: `${i * 30}ms`, minHeight: '120px' }}
              >
                <span className="text-3xl sm:text-4xl" aria-hidden="true">{LANGUAGE_FLAGS[lang.code]}</span>
                <div className="text-center">
                  <div className={`text-xl sm:text-2xl font-bold ${active ? 'text-white' : 'text-surface-800'}`}>
                    {lang.nativeName}
                  </div>
                  <div className={`text-sm sm:text-base font-medium ${active ? 'text-primary-100' : 'text-surface-500'}`}>
                    {lang.name}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakLanguage(lang);
                  }}
                  aria-label={`Listen to ${lang.name}`}
                  className={`audio-btn ${active ? 'bg-white/20 text-white border-white/30' : ''}`}
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-surface-400 text-base sm:text-lg mb-4">
          {lowLiteracyMode ? 'Your language is selected. Press next.' : 'Audio will guide you through the health check.'}
        </p>
      </div>

      <EmergencyFab />
    </div>
  );
}
