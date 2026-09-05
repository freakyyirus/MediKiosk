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
  sub: 'AI that listens to patients in their mother tongue, digitizes years of paper records, and hands doctors a complete clinical summary before the first handshake.',
  seehow: 'See How It Works',
  demo: 'Watch 2-Min Demo',
  trusted: 'Trusted by 50+ public hospitals across 8 states',
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
  sub: 'AI जो मरीज़ों को उनकी मातृभाषा में सुनता है, वर्षों के कागज़ी रिकॉर्ड को डिजिटल बनाता है, और पहले हाथ मिलाने से पहले डॉक्टरों को पूरा क्लिनिकल सारांश सौंपता है।',
  seehow: 'यह कैसे काम करता है, देखें',
  demo: '2 मिनट की डेमो देखें',
  trusted: '8 राज्यों के 50+ सरकारी अस्पतालों का भरोसा',
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
  sub: 'நோயாளிகளை அவர்களின் தாய்மொழியில் கேட்கும் AI, பல ஆண்டு காகிதப் பதிவுகளை டிஜிட்டலாக்கி, முதல் கைகுலுக்கலுக்கு முன்பே மருத்துவர்களுக்கு முழுமையான மருத்துவச் சுருக்கத்தை வழங்குகிறது.',
  seehow: 'இது எப்படி வேலை செய்கிறது',
  demo: '2 நிமிட டெமோவைப் பார்க்கவும்',
  trusted: '8 மாநிலங்களில் 50+ அரசு மருத்துவமனைகளின் நம்பிக்கை',
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
  sub: 'AI যা রোগীদের মাতৃভাষায় শোনে, বছরের পর বছরের কাগজি রেকর্ড ডিজিটাল করে এবং প্রথম করমর্দনের আগেই ডাক্তারদের সম্পূর্ণ ক্লিনিকাল সারাংশ দেয়।',
  seehow: 'কীভাবে কাজ করে দেখুন',
  demo: '২ মিনিটের ডেমো দেখুন',
  trusted: '৮টি রাজ্যের ৫০+ সরকারি হাসপাতালের আস্থা',
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
  sub: 'एआय जे रुग्णांना त्यांच्या मातृभाषेत ऐकते, वर्षानुवर्षांचे कागदी रेकॉर्ड डिजिटल करते आणि पहिल्या हस्तांदोलनापूर्वी डॉक्टरांना संपूर्ण क्लिनिकल सारांश देते.',
  seehow: 'हे कसे कार्य करते ते पहा',
  demo: '२ मिनिटांचा डेमो पहा',
  trusted: '८ राज्यांतील ५०+ सरकारी रुग्णालयांचा विश्वास',
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