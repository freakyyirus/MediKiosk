import { create } from 'zustand';
import type { Language } from '../../types';

export type LangCode = 'en' | 'hi' | 'ta' | 'bn' | 'mr';

export const LANGS: { code: LangCode; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

export type Dict = {
  product: string;
  how: string;
  portals: string;
  ayush: string;
  impact: string;
  security: string;
  signin: string;
  signup: string;
  trykiosk: string;
  h1a: string;
  h1b: string;
  h1c: string;
  sub: string;
  start: string;
  seehow: string;
  demo: string;
  trusted: string;
};

const EN: Dict = {
  product: 'Product',
  how: 'How It Works',
  portals: 'Portals',
  ayush: 'AYUSH',
  impact: 'Impact',
  security: 'Security',
  signin: 'Sign In',
  signup: 'Sign Up',
  trykiosk: 'Try Kiosk Demo',
  h1a: 'Your Health Story,',
  h1b: 'Heard',
  h1c: 'in Every Language',
  sub: 'An intelligent assistant that listens to patients in their native language, digitizes past records, and prepares a complete clinical summary for doctors instantly.',
  start: 'Begin Patient Check-in',
  seehow: 'See How It Works',
  demo: 'Watch 2-Min Demo',
  trusted: 'Built for hospital OPDs across India',
};

const HI: Dict = {
  product: 'उत्पाद',
  how: 'यह कैसे काम करता है',
  portals: 'पोर्टल',
  ayush: 'आयुष',
  impact: 'प्रभाव',
  security: 'सुरक्षा',
  signin: 'साइन इन',
  signup: 'साइन अप',
  trykiosk: 'कियोस्क डेमो आज़माएं',
  h1a: 'आपकी स्वास्थ्य कहानी,',
  h1b: 'सुनी जाती है',
  h1c: 'हर भाषा में',
  sub: 'एक स्मार्ट असिस्टेंट जो मरीजों को उनकी भाषा में सुनता है, पुराने रिकॉर्ड को डिजिटल करता है, और डॉक्टरों के लिए तुरंत एक स्पष्ट क्लिनिकल सारांश तैयार करता है।',
  start: 'मरीज चेक-इन शुरू करें',
  seehow: 'यह कैसे काम करता है, देखें',
  demo: '2 मिनट की डेमो देखें',
  trusted: 'भारतातील रुग्णालयांच्या OPD साठी बनवलेलं',
};

const TA: Dict = {
  product: 'தயாரிப்பு',
  how: 'இது எப்படி வேலை செய்கிறது',
  portals: 'போர்டல்கள்',
  ayush: 'ஆயுஷ்',
  impact: 'தாக்கம்',
  security: 'பாதுகாப்பு',
  signin: 'உள்நுழைய',
  signup: 'பதிவு செய்ய',
  trykiosk: 'கியோஸ்க் டெமோவை முயற்சிக்கவும்',
  h1a: 'உங்கள் உடல்நலக் கதை,',
  h1b: 'கேட்கப்படுகிறது',
  h1c: 'எல்லா மொழிகளிலும்',
  sub: 'நோயாளிகளை அவர்களின் தாய்மொழியில் கேட்கும், பழைய பதிவுகளை டிஜிட்டலாக்கும், மற்றும் மருத்துவர்களுக்கு உடனடியாக தெளிவான மருத்துவச் சுருக்கத்தை தயாரிக்கும் ஒரு ஸ்மார்ட் உதவியாளர்.',
  start: 'நோயாளி செக்-இன் தொடங்கவும்',
  seehow: 'இது எப்படி வேலை செய்கிறது',
  demo: '2 நிமிட டெமோவைப் பார்க்கவும்',
  trusted: 'இந்திய மருத்துவமனை OPD-களுக்காக உருவாக்கப்பட்டது',
};

const BN: Dict = {
  product: 'পণ্য',
  how: 'কীভাবে কাজ করে',
  portals: 'পোর্টাল',
  ayush: 'আয়ুষ',
  impact: 'প্রভাব',
  security: 'নিরাপত্তা',
  signin: 'সাইন ইন',
  signup: 'সাইন আপ',
  trykiosk: 'কিয়স্ক ডেমো দেখুন',
  h1a: 'আপনার স্বাস্থ্যগল্প,',
  h1b: 'শোনা হয়',
  h1c: 'প্রত্যেক ভাষায়',
  sub: 'একটি স্মার্ট অ্যাসিস্ট্যান্ট যা রোগীদের মাতৃভাষায় শোনে, পুরনো রেকর্ড ডিজিটাল করে এবং ডাক্তারদের জন্য তাৎক্ষণিকভাবে একটি স্পষ্ট ক্লিনিকাল সারাংশ তৈরি করে।',
  start: 'রোগীর চেক-ইন শুরু করুন',
  seehow: 'কীভাবে কাজ করে দেখুন',
  demo: '২ মিনিটের ডেমো দেখুন',
  trusted: 'ভারতীয় হাসপাতালের OPD-গুলির জন্য তৈরি',
};

const MR: Dict = {
  product: 'उत्पाद',
  how: 'हे कसे कार्य करते',
  portals: 'पोर्टल',
  ayush: 'आयुष',
  impact: 'प्रभाव',
  security: 'सुरक्षा',
  signin: 'साइन इन',
  signup: 'साइन अप',
  trykiosk: 'कियोस्क डेमो वापरून पहा',
  h1a: 'तुमची आरोग्यकथा,',
  h1b: 'ऐकली जाते',
  h1c: 'प्रत्येक भाषेत',
  sub: 'एक स्मार्ट असिस्टंट जे रुग्णांना त्यांच्या मातृभाषेत ऐकते, जुने रेकॉर्ड डिजिटल करते आणि डॉक्टरांसाठी त्वरित एक स्पष्ट क्लिनिकल सारांश तयार करते.',
  start: 'रुग्ण चेक-इन सुरू करा',
  seehow: 'हे कसे कार्य करते ते पहा',
  demo: '२ मिनिटांचा डेमो पहा',
  trusted: 'भारतीय रुग्णालय OPD साठी बनवलेले',
};

export const DICTS: Record<LangCode, Dict> = { en: EN, hi: HI, ta: TA, bn: BN, mr: MR };

const STORAGE_KEY = 'medikiosk_landing_lang';

/** Map a landing code to the shared UI Store Language object (keeps kiosk in sync). */
export function toUILanguage(code: LangCode): Language {
  const meta = LANGS.find((l) => l.code === code) ?? LANGS[0];
  return { code, name: meta.name, nativeName: meta.nativeName, icon: '🇮🇳' };
}

function readStored(): LangCode {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && v in DICTS) return v as LangCode;
  } catch {
    /* ignore storage errors */
  }
  return 'en';
}

interface LangStoreState {
  code: LangCode;
  setCode: (c: LangCode) => void;
}

/** Reactive landing language store (persisted + shared with the kiosk UI store). */
export const useLangStore = create<LangStoreState>((set) => ({
  code: typeof window !== 'undefined' ? readStored() : 'en',
  setCode: (c) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
    void import('../../stores').then(({ useUIStore }) => useUIStore.getState().setLanguage(toUILanguage(c)));
    set({ code: c });
  },
}));

/** Reactive translation dict for the current landing language. */
export function useLandingT(): Dict {
  const code = useLangStore((s) => s.code);
  return DICTS[code];
}