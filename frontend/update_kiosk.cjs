const fs = require('fs');
const file = 'src/lib/kioskI18n.ts';
let content = fs.readFileSync(file, 'utf8');

// Update KioskKey
content = content.replace(
  /\| 'stepperLanguage' \| 'stepperHealthCheck' \| 'stepperDocuments' \| 'stepperDone'/,
  "| 'stepperLanguage' | 'stepperBasicDetails' | 'stepperHealthCheck' | 'stepperDocuments' | 'stepperDone'"
);

// Map of translations
const translations = {
  en: 'Basic Details',
  hi: 'मूल विवरण',
  bn: 'মৌলিক বিবরণ',
  te: 'ప్రాథమిక వివరాలు',
  mr: 'मूलभूत तपशील',
  ta: 'அடிப்படை விவரங்கள்',
  gu: 'મૂળભૂત વિગતો',
  kn: 'ಮೂಲ ವಿವರಗಳು',
  ml: 'അടിസ്ഥാന വിവരങ്ങൾ',
  pa: 'ਮੂਲ ਵੇਰਵੇ',
  or: 'ମୌଳିକ ବିବରଣୀ',
  as: 'মৌলিক বিৱৰণ',
  ur: 'بنیادی تفصیلات'
};

for (const [lang, trans] of Object.entries(translations)) {
  const regex = new RegExp(`(const ${lang}: Record<KioskKey, string> = {[\\s\\S]*?)(  stepperHealthCheck:)`);
  content = content.replace(regex, `$1  stepperBasicDetails: '${trans}',\n$2`);
}

fs.writeFileSync(file, content);
console.log('Updated kioskI18n.ts');
