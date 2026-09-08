import React, { useState } from 'react';
import { useUIStore } from '../../stores';

export interface BodyPart {
  id: string;
  label: string;
  organs: string[];
  path: string;
}

const BODY_PARTS: BodyPart[] = [
  {
    id: 'head',
    label: 'Head & Face',
    organs: ['Headache', 'Eye', 'Ear', 'Nose', 'Throat', 'Dental'],
    path: 'M140,20 Q160,5 180,20 Q190,40 185,60 Q180,80 160,85 Q140,80 135,60 Q130,40 140,20',
  },
  {
    id: 'chest',
    label: 'Chest',
    organs: ['Heart', 'Lungs', 'Breast'],
    path: 'M110,90 Q160,80 210,90 L215,150 Q160,160 105,150 Z',
  },
  {
    id: 'abdomen',
    label: 'Abdomen',
    organs: ['Stomach', 'Liver', 'Kidney', 'Intestines'],
    path: 'M105,155 Q160,145 215,155 L210,220 Q160,230 110,220 Z',
  },
  {
    id: 'pelvis',
    label: 'Pelvis',
    organs: ['Urinary', 'Reproductive'],
    path: 'M110,225 Q160,215 210,225 L205,280 Q160,290 115,280 Z',
  },
  {
    id: 'back',
    label: 'Back & Spine',
    organs: ['Spine', 'Lower Back'],
    path: 'M230,90 Q250,120 245,200 Q240,250 235,280 L255,280 Q260,250 265,200 Q270,120 250,90 Z',
  },
  {
    id: 'arms',
    label: 'Arms & Hands',
    organs: ['Shoulder', 'Arm', 'Elbow', 'Wrist', 'Hand'],
    path: 'M80,95 Q60,120 55,180 Q50,220 45,250 L65,255 Q70,220 75,180 Q80,140 95,110 Z M235,95 Q255,120 260,180 Q265,220 270,250 L250,255 Q245,220 240,180 Q235,140 220,110 Z',
  },
  {
    id: 'legs',
    label: 'Legs & Feet',
    organs: ['Hip', 'Knee', 'Ankle', 'Foot'],
    path: 'M115,285 Q125,320 120,380 Q115,420 110,450 L140,455 Q145,420 150,380 Q155,320 150,285 Z M205,285 Q195,320 200,380 Q205,420 210,450 L180,455 Q175,420 170,380 Q165,320 170,285 Z',
  },
  {
    id: 'skin',
    label: 'Skin',
    organs: ['Rashes', 'Itching', 'Wounds'],
    path: 'M50,50 Q70,30 90,50 M220,50 Q240,30 260,50',
  },
  {
    id: 'general',
    label: 'General / Vitals',
    organs: ['Fever', 'BP', 'Diabetes', 'Weight', 'Weakness'],
    path: 'M50,300 Q40,320 50,340 M260,300 Q270,320 260,340',
  },
];

type LabelKey = 'title' | 'subtitle' | 'skip' | 'close' | 'dontknow' | 'confirm' | 'confirmBody' | 'yes' | 'no' | 'changeSelection';

const LABELS: Record<string, Record<LabelKey, string>> = {
  en: {
    title: 'Touch Where You Have a Problem',
    subtitle: 'Tap the body part where you feel pain or discomfort',
    skip: 'General Checkup',
    close: 'Close',
    dontknow: "Don't Know / General",
    confirm: 'Is this correct?',
    confirmBody: 'You have selected:',
    yes: 'Yes',
    no: 'No',
    changeSelection: 'Change Selection',
  },
  hi: {
    title: 'समस्या वाले हिस्से को छुएं',
    subtitle: 'शरीर के उस हिस्से पर टैप करें जहाँ दर्द या समस्या है',
    skip: 'सामान्य जांच',
    close: 'बंद करें',
    dontknow: 'पता नहीं / सामान्य',
    confirm: 'क्या यह सही है?',
    confirmBody: 'आपने चुना है:',
    yes: 'हाँ',
    no: 'नहीं',
    changeSelection: 'बदलें',
  },
  bn: {
    title: 'আপনার সমস্যা স্পর্শ করুন',
    subtitle: 'যে অংশে ব্যথা বা সমস্যা আছে সেখানে ট্যাপ করুন',
    skip: 'সাধারণ চেকআপ',
    close: 'বন্ধ করুন',
    dontknow: 'জানি না / সাধারণ',
    confirm: 'এটা কি সঠিক?',
    confirmBody: 'আপনি নির্বাচন করেছেন:',
    yes: 'হ্যাঁ',
    no: 'না',
    changeSelection: 'পরিবর্তন',
  },
  ta: {
    title: 'பிரச்சனை உள்ள இடத்தைத் தொடவும்',
    subtitle: 'வலி அல்லது அசௌகரியம் உள்ள உடல் பகுதியை அழுத்தவும்',
    skip: 'பொது பரிசோதனை',
    close: 'மூடு',
    dontknow: 'தெரியவில்லை / பொது',
    confirm: 'இது சரியா?',
    confirmBody: 'நீங்கள் தேர்ந்தெடுத்தது:',
    yes: 'ஆம்',
    no: 'இல்லை',
    changeSelection: 'மாற்று',
  },
  ur: {
    title: 'جہاں تکلیف ہے وہاں چھوئیں',
    subtitle: 'جس حصے میں درد یا تکلیف ہے اس پر ٹیپ کریں',
    skip: 'عمومی جانچ',
    close: 'بند کریں',
    dontknow: 'پتہ نہیں / عمومی',
    confirm: 'کیا یہ صحیح ہے؟',
    confirmBody: 'آپ نے منتخب کیا ہے:',
    yes: 'ہاں',
    no: 'نہیں',
    changeSelection: 'تبدیل کریں',
  },
  te: {
    title: 'సమస్య ఉన్న చోట తాకండి',
    subtitle: 'నొప్పి లేదా అసౌకర్యం ఉన్న శరీర భాగంపై నొక్కండి',
    skip: 'సాధారణ పరీక్ష',
    close: 'మూసివేయి',
    dontknow: 'తెలియదు / సాధారణ',
    confirm: 'ఇది సరైనదేనా?',
    confirmBody: 'మీరు ఎంచుకున్నది:',
    yes: 'అవును',
    no: 'కాదు',
    changeSelection: 'ఎంపిక మార్చండి',
  },
  mr: {
    title: 'समस्या असलेल्या जागी स्पर्श करा',
    subtitle: 'दुखणे किंवा अस्वस्थता असलेल्या शरीराच्या भागावर टॅप करा',
    skip: 'सामान्य तपासणी',
    close: 'बंद करा',
    dontknow: 'माहित नाही / सामान्य',
    confirm: 'हे बरोबर आहे का?',
    confirmBody: 'तुम्ही निवडले:',
    yes: 'होय',
    no: 'नाही',
    changeSelection: 'निवड बदला',
  },
  gu: {
    title: 'સમસ્યા હોય ત્યાં સ્પર્શ કરો',
    subtitle: 'દુખાવો અથવા તકલીફ હોય તે ભાગ પર ટેપ કરો',
    skip: 'સામાન્ય તપાસ',
    close: 'બંધ કરો',
    dontknow: 'ખબર નથી / સામાન્ય',
    confirm: 'શું આ સાચું છે?',
    confirmBody: 'તમે પસંદ કર્યું:',
    yes: 'હા',
    no: 'ના',
    changeSelection: 'પસંદગી બદલો',
  },
  kn: {
    title: 'ಸಮಸ್ಯೆ ಇರುವಲ್ಲಿ ಸ್ಪರ್ಶಿಸಿ',
    subtitle: 'ನೋವು ಅಥವಾ ಅಸ್ವಸ್ಥತೆ ಇರುವ ದೇಹದ ಭಾಗದ ಮೇಲೆ ಟ್ಯಾಪ್ ಮಾಡಿ',
    skip: 'ಸಾಮಾನ್ಯ ಪರೀಕ್ಷೆ',
    close: 'ಮುಚ್ಚಿಡಿ',
    dontknow: 'ಗೊತ್ತಿಲ್ಲ / ಸಾಮಾನ್ಯ',
    confirm: 'ಇದು ಸರಿಯೇ?',
    confirmBody: 'ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ್ದು:',
    yes: 'ಹೌದು',
    no: 'ಇಲ್ಲ',
    changeSelection: 'ಆಯ್ಕೆ ಬದಲಾಯಿಸಿ',
  },
  ml: {
    title: 'പ്രശ്നമുള്ളിടത്ത് സ്പർശിക്കുക',
    subtitle: 'വേദനയോ അസ്വസ്ഥതയോ ഉള്ള ശരീരഭാഗത്ത് ടാപ്പ് ചെയ്യുക',
    skip: 'പൊതു പരിശോധന',
    close: 'അടയ്ക്കുക',
    dontknow: 'അറിയില്ല / പൊതു',
    confirm: 'ഇത് ശരിയാണോ?',
    confirmBody: 'നിങ്ങൾ തിരഞ്ഞെടുത്തത്:',
    yes: 'അതെ',
    no: 'ഇല്ല',
    changeSelection: 'തിരഞ്ഞെടുപ്പ് മാറ്റുക',
  },
  pa: {
    title: 'ਜਿੱਥੇ ਸਮੱਸਿਆ ਹੋਵੇ ਉੱਥੇ ਛੋਹੋ',
    subtitle: 'ਦਰਦ ਜਾਂ ਤਕਲੀਫ਼ ਵਾਲੇ ਹਿੱਸੇ ’ਤੇ ਟੈਪ ਕਰੋ',
    skip: 'ਆਮ ਜਾਂਚ',
    close: 'ਬੰਦ ਕਰੋ',
    dontknow: 'ਪਤਾ ਨਹੀਂ / ਆਮ',
    confirm: 'ਕੀ ਇਹ ਸਹੀ ਹੈ?',
    confirmBody: 'ਤੁਸੀਂ ਚੁਣਿਆ:',
    yes: 'ਹਾਂ',
    no: 'ਨਹੀਂ',
    changeSelection: 'ਚੋਣ ਬਦਲੋ',
  },
  or: {
    title: 'ଯେଉଁଠାରେ ସମସ୍ୟା ଅଛି ସେଠାରେ ଛୁଅଁନ୍ତୁ',
    subtitle: 'ଯେଉଁ ଅଙ୍ଗରେ ଯନ୍ତ୍ରଣା ବା ଅସୁବିଧା ଅଛି ସେଠାରେ ଟ୍ୟାପ୍ କରନ୍ତୁ',
    skip: 'ସାଧାରଣ ଯାଞ୍ଚ',
    close: 'ବନ୍ଦ କରନ୍ତୁ',
    dontknow: 'ଜାଣି ନାହିଁ / ସାଧାରଣ',
    confirm: 'ଏହା ଠିକ୍ କି?',
    confirmBody: 'ଆପଣ ବାଛିଛନ୍ତି:',
    yes: 'ହଁ',
    no: 'ନାଁ',
    changeSelection: 'ବାଛିବା ବଦଳାନ୍ତୁ',
  },
  as: {
    title: 'য’ত সমস্যা আছে তাতে স্পৰ্শ কৰক',
    subtitle: 'যি অংশত বিষ বা অস্বস্তি আছে তাত টেপ কৰক',
    skip: 'সাধাৰণ পৰীক্ষা',
    close: 'বন্ধ কৰক',
    dontknow: 'নাজানো / সাধাৰণ',
    confirm: 'এয়া ঠিক নে?',
    confirmBody: 'আপুনি নিৰ্বাচন কৰিছে:',
    yes: 'হয়',
    no: 'নহয়',
    changeSelection: 'নিৰ্বাচন সলাওক',
  },
};

function getLabels(lang: string): Record<LabelKey, string> {
  return LABELS[lang] ?? LABELS.en;
}

interface AnatomyMapProps {
  onSelect: (bodyPart: BodyPart, organ: string | null) => void;
  language: string;
}

export const AnatomyMap: React.FC<AnatomyMapProps> = ({ onSelect, language }) => {
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null);
  const [showOrganModal, setShowOrganModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const highContrast = useUIStore((s) => s.highContrast);

  const labels = getLabels(language);

  const getLabel = (key: LabelKey): string => labels[key] ?? LABELS.en[key];

  const handlePartClick = (part: BodyPart) => {
    setSelectedPart(part);
    if (part.organs.length === 1) {
      setShowConfirm(true);
    } else {
      setShowOrganModal(true);
    }
  };

  const handleOrganSelect = (organ: string) => {
    setShowOrganModal(false);
    setShowConfirm(true);
  };

  const handleConfirmYes = () => {
    if (!selectedPart) return;
    const organ = selectedPart.organs.length === 1 ? selectedPart.organs[0] : null;
    onSelect(selectedPart, organ);
  };

  const handleConfirmNo = () => {
    setSelectedPart(null);
    setShowConfirm(false);
  };

  const anchorOf = (part: BodyPart, fallback: number): [number, number] => {
    switch (part.id) {
      case 'head': return [160, 55];
      case 'chest': return [160, 130];
      case 'abdomen': return [160, 195];
      case 'pelvis': return [160, 255];
      case 'back': return [250, 180];
      case 'arms': return [50, 180];
      case 'skin': return [115, 48];
      case 'general': return [155, 320];
      default: return [160, fallback];
    }
  };

  return (
    <div className={`min-h-screen p-6 flex flex-col items-center ${highContrast ? 'high-contrast' : 'bg-slate-50'}`}>
      <h1 className="text-3xl font-bold text-center mb-2 text-slate-900">{getLabel('title')}</h1>
      <p className="text-lg text-center mb-6 text-slate-600">{getLabel('subtitle')}</p>

      <div className="relative flex justify-center">
        <svg viewBox="0 0 320 500" className="w-full max-w-md h-auto">
          <ellipse cx="160" cy="50" rx="35" ry="40" fill="none" stroke="#94a3b8" strokeWidth="3" />
          <rect x="125" y="90" width="70" height="80" fill="none" stroke="#94a3b8" strokeWidth="3" rx="10" />
          <rect x="130" y="170" width="60" height="60" fill="none" stroke="#94a3b8" strokeWidth="3" rx="8" />
          <rect x="135" y="230" width="50" height="40" fill="none" stroke="#94a3b8" strokeWidth="3" rx="8" />

          {BODY_PARTS.map((part) => {
            const [tx, ty] = anchorOf(part, 180);
            const isActive = selectedPart?.id === part.id;
            return (
              <g key={part.id} className="cursor-pointer">
                <path
                  d={part.path}
                  fill={isActive ? '#ef4444' : 'transparent'}
                  fillOpacity={isActive ? 0.35 : 0}
                  stroke={isActive ? '#ef4444' : 'transparent'}
                  strokeWidth="3"
                  onClick={() => handlePartClick(part)}
                  className={`transition-all duration-200 ${isActive ? 'animate-pulse' : ''}`}
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  fill="#1e293b"
                  fontSize="12"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {part.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Organ selection modal */}
      {showOrganModal && selectedPart && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-5 text-slate-900">{selectedPart.label}</h2>
            <div className="flex flex-col gap-3">
              {selectedPart.organs.map((organ) => (
                <button
                  key={organ}
                  onClick={() => handleOrganSelect(organ)}
                  className="p-4 text-lg font-semibold bg-slate-100 hover:bg-blue-50 text-slate-900 rounded-xl border-2 border-blue-500 transition-colors"
                >
                  {organ}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowOrganModal(false);
                  setShowConfirm(true);
                }}
                className="p-4 text-base bg-transparent text-slate-600 rounded-xl border-2 border-slate-300 mt-2"
              >
                {getLabel('dontknow')}
              </button>
            </div>
            <button
              onClick={() => setShowOrganModal(false)}
              className="w-full mt-4 p-3 text-slate-500 hover:text-slate-900"
            >
              &times; {getLabel('close')}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {showConfirm && selectedPart && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="text-5xl mb-4">
              {selectedPart.id === 'head' && '🧠'}
              {selectedPart.id === 'chest' && '❤️'}
              {selectedPart.id === 'abdomen' && '🫁'}
              {selectedPart.id === 'pelvis' && '🦴'}
              {selectedPart.id === 'back' && '🔙'}
              {selectedPart.id === 'arms' && '💪'}
              {selectedPart.id === 'legs' && '🦵'}
              {selectedPart.id === 'skin' && '🖐️'}
              {selectedPart.id === 'general' && '🏥'}
            </div>
            <p className="text-lg text-slate-500 mb-2">{getLabel('confirmBody')}</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">{selectedPart.label}</h2>
            <p className="text-xl text-slate-600 mb-6">{getLabel('confirm')}</p>
            <div className="flex gap-4">
              <button
                onClick={handleConfirmNo}
                className="flex-1 p-4 text-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border-2 border-slate-300 transition-colors"
              >
                {getLabel('no')}
              </button>
              <button
                onClick={handleConfirmYes}
                className="flex-1 p-4 text-lg font-semibold bg-green-500 hover:bg-green-600 text-white rounded-xl border-2 border-green-600 transition-colors"
              >
                {getLabel('yes')}
              </button>
            </div>
            <button
              onClick={handleConfirmNo}
              className="w-full mt-4 p-3 text-sm text-slate-500 hover:text-slate-900"
            >
              {getLabel('changeSelection')}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => onSelect({ id: 'general', label: 'General', organs: ['General'], path: '' }, 'General')}
        className="mt-6 px-8 py-4 text-lg bg-transparent text-slate-700 border-2 border-slate-400 rounded-xl hover:bg-slate-100"
      >
        {getLabel('skip')}
      </button>
    </div>
  );
};

export default AnatomyMap;
