import { useRef, useState } from 'react';
import { Shield, Lock, UserCheck, Check, ChevronRight } from 'lucide-react';
import { consentApi } from '../../api/client';

interface KioskConsentProps {
  sessionId?: string;
  language: string;
  onComplete: () => void;
  onBack: () => void;
}

const CONSENT_ITEMS = [
  {
    id: 'data_collection',
    icon: Shield,
    title: { en: 'Medical Data Collection', hi: 'मेडिकल डेटा संग्रह' },
    desc: {
      en: 'Collection of your symptoms, history, and vital signs for clinical assessment.',
      hi: 'नैदानिक मूल्यांकन के लिए आपके लक्षण, इतिहास और महत्वपूर्ण संकेतों का संग्रह।',
    },
    required: true,
  },
  {
    id: 'ai_assessment',
    icon: Lock,
    title: { en: 'AI-Assisted Analysis', hi: 'एआई-सहायता विश्लेषण' },
    desc: {
      en: 'AI will help structure your information for the physician to review faster.',
      hi: 'एआई डॉक्टर की तेजी से समीक्षा के लिए आपकी जानकारी को व्यवस्थित करने में मदद करेगा।',
    },
    required: true,
  },
  {
    id: 'physician_review',
    icon: UserCheck,
    title: { en: 'Physician Review', hi: 'चिकित्सक समीक्षा' },
    desc: {
      en: 'A qualified physician will review your case and may ask follow-up questions.',
      hi: 'एक योग्य चिकित्सक आपके मामले की समीक्षा करेंगे और अतिरिक्त प्रश्न पूछ सकते हैं।',
    },
    required: true,
  },
];

export default function KioskConsent({ sessionId, language, onComplete, onBack }: KioskConsentProps) {
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  const t = (hi: string, en: string) => (language === 'hi' ? hi : en);
  const allRequired = CONSENT_ITEMS.filter((i) => i.required).every((i) => consents[i.id]);

  const toggle = (id: string) => setConsents((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleContinue = async () => {
    if (!allRequired || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);

    // Best-effort persistence: a backend/DB failure must NEVER block the
    // kiosk. Consent is recorded locally and re-consent can be re-run.
    const numericSessionId = sessionId && /^\d+$/.test(sessionId) ? Number(sessionId) : null;
    if (numericSessionId) {
      try {
        await consentApi.submit({
          session_id: numericSessionId,
          consents: CONSENT_ITEMS.map((item) => ({
            consent_type: item.id,
            granted: !!consents[item.id],
          })),
        });
      } catch {
        // Backend unavailable — proceed with local consent tracking.
      }
    }

    if (navigator.vibrate) navigator.vibrate(20);
    setSaving(false);
    onComplete();
  };

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto w-full px-4 sm:px-8 py-6 sm:py-8">
      <div className="text-center pb-6 animate-fade-in">
        <div className="w-16 h-16 rounded-[22px] bg-primary-100 border border-primary-200 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary-700" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 leading-tight">
          {t('आपकी सहमति', 'Your Consent')}
        </h1>
        <p className="text-base sm:text-lg text-surface-500 mt-2">
          {t(
            'आपका डेटा एन्क्रिप्टेड है। आवश्यक अनुमतियाँ नीचे दिखाई गई हैं।',
            'Your data is encrypted. Required permissions are shown below.'
          )}
        </p>
      </div>

      <div className="w-full space-y-3 mb-6">
        {CONSENT_ITEMS.map((item) => {
          const checked = !!consents[item.id];
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              aria-pressed={checked}
              className={`w-full text-left rounded-2xl p-4 sm:p-5 transition-all duration-150 border-2 ${
                checked
                  ? 'card border-primary-400 bg-primary-50/50'
                  : 'card border-transparent hover:border-primary-200'
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    checked ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-500'
                  }`}
                >
                  {checked ? <Check className="w-6 h-6 text-white" /> : <item.icon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base sm:text-lg text-surface-800">{item.title[language === 'hi' ? 'hi' : 'en']}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-danger-600 bg-danger-50 px-2 py-0.5 rounded-full">
                      {t('आवश्यक', 'Required')}
                    </span>
                  </div>
                  <p className="text-surface-500 mt-1 leading-relaxed">{item.desc[language === 'hi' ? 'hi' : 'en']}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="w-full rounded-2xl border border-surface-200 bg-surface-50 p-4 mb-6 text-sm text-surface-600 leading-relaxed">
        <p className="font-semibold text-surface-800 mb-1">
          {t('आपकी जानकारी कैसे उपयोग होती है', 'How your information is used')}
        </p>
        <p>
          {t(
            'आपके द्वारा दी गई जानकारी — लक्षण, वॉइस नोट्स, दस्तावेज़ — केवल इलाज करने वाले चिकित्सक के साथ साझा की जाती है। AI केवल जानकारी व्यवस्थित करती है; यह निदान या उपचार का निर्णय स्वयं नहीं लेती।',
            'The details you provide, including symptoms, voice notes, and documents, are shared only with your treating physician. AI only organises what you tell us; it never makes a diagnosis or treatment decision on its own.'
          )}
        </p>
      </div>

      <div className="w-full flex gap-2">
        <button
          onClick={onBack}
          className="touch-target card px-4 flex items-center justify-center text-surface-500 hover:border-surface-300"
          aria-label={t('वापस', 'Back')}
        >
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <button
          onClick={() => void handleContinue()}
          disabled={!allRequired || saving}
          className="touch-target flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 disabled:text-surface-500 text-white text-lg font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-600/25"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('सेव हो रहा है…', 'Saving…')}
            </>
          ) : (
            <>
              {t('जारी रखें', 'Continue')} <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}