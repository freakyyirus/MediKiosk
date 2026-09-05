/**
 * Interactive Body Map — knowledge base.
 * Maps clickable body parts to departments, follow-up questions (EN + HI),
 * and red flags. Used by the kiosk symptom capture flow (Feature 1).
 */

export interface FollowUpOption {
  value: string;
  label_en: string;
  label_hi: string;
}

export interface FollowUpQuestion {
  id: string;
  question_en: string;
  question_hi: string;
  type: 'single' | 'multi_select' | 'duration' | 'body_sub_part';
  options: FollowUpOption[];
}

export interface RedFlagRule {
  symptom: string;
  severity: 'critical' | 'high' | 'medium';
  message_en: string;
  message_hi: string;
}

export interface BodyPartDefinition {
  id: string;
  label_en: string;
  label_hi: string;
  department: string;
  department_hindi: string;
  svgId: string;
  icon: string;
  sensitive?: boolean;
  questions: FollowUpQuestion[];
  red_flags: RedFlagRule[];
}

/**
 * Mapping of body part id -> related body regions for the SVG figure.
 * The SVG uses simple shapes; tapping the part is handled by region groups.
 */
export const BODY_PARTS: BodyPartDefinition[] = [
  {
    id: 'head',
    label_en: 'Head',
    label_hi: 'सिर',
    department: 'neurology',
    department_hindi: 'मस्तिष्क विभाग',
    svgId: 'head',
    icon: '🧠',
    questions: [
      {
        id: 'q_head_1',
        question_en: 'What kind of head problem are you having?',
        question_hi: 'आपको सिर में किस तरह की दिक्कत है?',
        type: 'multi_select',
        options: [
          { value: 'headache', label_en: 'Headache', label_hi: 'सिरदर्द' },
          { value: 'dizziness', label_en: 'Dizziness', label_hi: 'चक्कर' },
          { value: 'vision_blur', label_en: 'Blurred vision', label_hi: 'धुंधला दिखना' },
          { value: 'numbness', label_en: 'Numbness / tingling', label_hi: 'सुन्न होना' },
          { value: 'fainting', label_en: 'Fainting', label_hi: 'बेहोशी' },
        ],
      },
      {
        id: 'q_head_2',
        question_en: 'How long have you had this?',
        question_hi: 'ये समस्या कब से है?',
        type: 'duration',
        options: [
          { value: 'few_hours', label_en: 'Few hours', label_hi: 'कुछ घंटे' },
          { value: '1_day', label_en: '1 day', label_hi: '1 दिन' },
          { value: '2_3_days', label_en: '2-3 days', label_hi: '2-3 दिन' },
          { value: '1_week', label_en: 'More than a week', label_hi: 'एक हफ्ते से ज्यादा' },
          { value: 'long_time', label_en: 'Long time / chronic', label_hi: 'बहुत समय से / पुराना' },
        ],
      },
    ],
    red_flags: [
      {
        symptom: 'fainting',
        severity: 'critical',
        message_en: 'Fainting requires immediate attention',
        message_hi: 'बेहोशी होने पर तुरंत ध्यान देने की जरूरत है',
      },
      {
        symptom: 'numbness',
        severity: 'high',
        message_en: 'One-sided numbness may indicate a stroke',
        message_hi: 'एक तरफ सुन्न होना स्ट्रोक का संकेत हो सकता है',
      },
    ],
  },
  {
    id: 'eyes',
    label_en: 'Eyes',
    label_hi: 'आंखें',
    department: 'ophthalmology',
    department_hindi: 'नेत्र विभाग',
    svgId: 'eyes',
    icon: '👁️',
    questions: [
      {
        id: 'q_eyes_1',
        question_en: 'What is wrong with your eyes?',
        question_hi: 'आंखों में क्या समस्या है?',
        type: 'multi_select',
        options: [
          { value: 'vision_blur', label_en: 'Blurred vision', label_hi: 'धुंधला दिखना' },
          { value: 'pain', label_en: 'Eye pain', label_hi: 'आंख में दर्द' },
          { value: 'redness', label_en: 'Redness', label_hi: 'लालिमा' },
          { value: 'itching', label_en: 'Itching', label_hi: 'खुजली' },
          { value: 'discharge', label_en: 'Discharge / watering', label_hi: 'पानी आना' },
        ],
      },
      {
        id: 'q_eyes_2',
        question_en: 'When did it start?',
        question_hi: 'ये कब से है?',
        type: 'duration',
        options: [
          { value: 'few_hours', label_en: 'Few hours', label_hi: 'कुछ घंटे' },
          { value: '1_day', label_en: '1 day', label_hi: '1 दिन' },
          { value: '2_3_days', label_en: '2-3 days', label_hi: '2-3 दिन' },
          { value: '1_week', label_en: 'More than a week', label_hi: 'एक हफ्ते से ज्यादा' },
        ],
      },
    ],
    red_flags: [
      {
        symptom: 'sudden_vision_loss',
        severity: 'high',
        message_en: 'Sudden vision loss needs urgent attention',
        message_hi: 'अचानक दिखना बंद होना तुरंत ध्यान देने की जरूरत है',
      },
    ],
  },
  {
    id: 'ears',
    label_en: 'Ears',
    label_hi: 'कान',
    department: 'ent',
    department_hindi: 'कान-नाक-गला विभाग',
    svgId: 'ears',
    icon: '👂',
    questions: [
      {
        id: 'q_ears_1',
        question_en: 'What ear problem are you having?',
        question_hi: 'कान में क्या समस्या है?',
        type: 'multi_select',
        options: [
          { value: 'hearing_loss', label_en: 'Difficulty hearing', label_hi: 'सुनने में दिक्कत' },
          { value: 'ear_pain', label_en: 'Ear pain', label_hi: 'कान में दर्द' },
          { value: 'discharge', label_en: 'Discharge', label_hi: 'कान से पानी/मवाद' },
          { value: 'ringing', label_en: 'Ringing (tinnitus)', label_hi: 'कान में घंटी बजना' },
        ],
      },
      {
        id: 'q_ears_2',
        question_en: 'How long have you noticed this?',
        question_hi: 'ये कब से है?',
        type: 'duration',
        options: [
          { value: '1_day', label_en: '1 day', label_hi: '1 दिन' },
          { value: '2_3_days', label_en: '2-3 days', label_hi: '2-3 दिन' },
          { value: '1_week', label_en: 'More than a week', label_hi: 'एक हफ्ते से ज्यादा' },
          { value: 'long_time', label_en: 'Long time', label_hi: 'बहुत समय से' },
        ],
      },
    ],
    red_flags: [],
  },
  {
    id: 'nose_throat',
    label_en: 'Nose & Throat',
    label_hi: 'नाक और गला',
    department: 'ent',
    department_hindi: 'कान-नाक-गला विभाग',
    svgId: 'nose_throat',
    icon: '👃',
    questions: [
      {
        id: 'q_nose_1',
        question_en: 'What symptoms do you have?',
        question_hi: 'क्या लक्षण हैं?',
        type: 'multi_select',
        options: [
          { value: 'cold', label_en: 'Cold / runny nose', label_hi: 'जुकाम / नाक बहना' },
          { value: 'cough', label_en: 'Cough', label_hi: 'खांसी' },
          { value: 'breathless', label_en: 'Breathing difficulty', label_hi: 'सांस लेने में दिक्कत' },
          { value: 'sore_throat', label_en: 'Sore throat', label_hi: 'गले में दर्द' },
          { value: 'fever', label_en: 'Fever', label_hi: 'बुखार' },
        ],
      },
    ],
    red_flags: [
      {
        symptom: 'breathless',
        severity: 'critical',
        message_en: 'Difficulty breathing requires immediate attention',
        message_hi: 'सांस लेने में दिक्कत तुरंत ध्यान देने की जरूरत है',
      },
    ],
  },
  {
    id: 'chest',
    label_en: 'Chest',
    label_hi: 'छाती',
    department: 'cardiology',
    department_hindi: 'हृदय विभाग',
    svgId: 'chest',
    icon: '🫀',
    questions: [
      {
        id: 'q_chest_1',
        question_en: 'What chest symptom are you experiencing?',
        question_hi: 'छाती में क्या दिक्कत है?',
        type: 'multi_select',
        options: [
          { value: 'chest_pain', label_en: 'Chest pain', label_hi: 'सीने में दर्द' },
          { value: 'breathlessness', label_en: 'Breathlessness', label_hi: 'सांस फूलना' },
          { value: 'palpitations', label_en: 'Palpitations / racing heart', label_hi: 'दिल की धड़कन तेज' },
          { value: 'cough', label_en: 'Cough', label_hi: 'खांसी' },
          { value: 'sweating', label_en: 'Cold sweating', label_hi: 'ठंडा पसीना' },
        ],
      },
      {
        id: 'q_chest_2',
        question_en: 'Where is the pain located?',
        question_hi: 'दर्द कहाँ है?',
        type: 'body_sub_part',
        options: [
          { value: 'center', label_en: 'Center of chest', label_hi: 'छाती के बीच में' },
          { value: 'left', label_en: 'Left side', label_hi: 'बाईं ओर' },
          { value: 'right', label_en: 'Right side', label_hi: 'दाईं ओर' },
          { value: 'spreading_arm_jaw', label_en: 'Spreading to arm/jaw', label_hi: 'बांह/जबड़े में फैल रहा' },
        ],
      },
      {
        id: 'q_chest_3',
        question_en: 'How long does the pain last?',
        question_hi: 'दर्द कितनी देर रहता है?',
        type: 'duration',
        options: [
          { value: 'minutes', label_en: 'A few minutes', label_hi: 'कुछ मिनट' },
          { value: 'hours', label_en: 'A few hours', label_hi: 'कुछ घंटे' },
          { value: 'days', label_en: 'Days', label_hi: 'कई दिन' },
          { value: 'constant', label_en: 'Constant', label_hi: 'लगातार' },
        ],
      },
    ],
    red_flags: [
      {
        symptom: 'chest_pain',
        severity: 'critical',
        message_en: 'Chest pain with sweating needs immediate attention',
        message_hi: 'पसीने के साथ सीने में दर्द तुरंत ध्यान देने की जरूरत है',
      },
      {
        symptom: 'breathlessness',
        severity: 'high',
        message_en: 'Breathlessness may indicate a cardiac or respiratory problem',
        message_hi: 'सांस फूलना दिल या फेफड़ों की समस्या का संकेत हो सकता है',
      },
    ],
  },
  {
    id: 'stomach',
    label_en: 'Stomach',
    label_hi: 'पेट',
    department: 'gastroenterology',
    department_hindi: 'पेट रोग विभाग',
    svgId: 'stomach',
    icon: '🫁',
    questions: [
      {
        id: 'q_stomach_1',
        question_en: 'Where exactly is the pain in your stomach?',
        question_hi: 'आपके पेट में दर्द कहाँ है?',
        type: 'body_sub_part',
        options: [
          { value: 'upper', label_en: 'Upper stomach (above navel)', label_hi: 'ऊपरी पेट (नाभि के ऊपर)' },
          { value: 'middle', label_en: 'Around navel', label_hi: 'नाभि के आसपास' },
          { value: 'lower', label_en: 'Lower stomach (below navel)', label_hi: 'निचला पेट (नाभि के नीचे)' },
          { value: 'right_side', label_en: 'Right side', label_hi: 'दाईं ओर' },
          { value: 'left_side', label_en: 'Left side', label_hi: 'बाईं ओर' },
        ],
      },
      {
        id: 'q_stomach_2',
        question_en: 'How long have you had this stomach pain?',
        question_hi: 'ये पेट दर्द कब से है?',
        type: 'duration',
        options: [
          { value: 'few_hours', label_en: 'Few hours', label_hi: 'कुछ घंटे' },
          { value: '1_day', label_en: '1 day', label_hi: '1 दिन' },
          { value: '2_3_days', label_en: '2-3 days', label_hi: '2-3 दिन' },
          { value: '1_week', label_en: 'More than a week', label_hi: 'एक हफ्ते से ज्यादा' },
          { value: 'long_time', label_en: 'Long time/chronic', label_hi: 'बहुत समय से/पुराना' },
        ],
      },
      {
        id: 'q_stomach_3',
        question_en: 'What kind of pain is it?',
        question_hi: 'ये कैसा दर्द है?',
        type: 'single',
        options: [
          { value: 'cramping', label_en: 'Cramping / colicky', label_hi: 'मरोड़ वाला दर्द' },
          { value: 'burning', label_en: 'Burning', label_hi: 'जलन' },
          { value: 'sharp', label_en: 'Sharp / stabbing', label_hi: 'तीखा / चुभने वाला' },
          { value: 'dull', label_en: 'Dull / aching', label_hi: 'हल्का / दुखता हुआ' },
          { value: 'bloating', label_en: 'Bloating / fullness', label_hi: 'फूलना / भरा हुआ' },
        ],
      },
      {
        id: 'q_stomach_4',
        question_en: 'Any symptoms along with stomach pain?',
        question_hi: 'पेट दर्द के साथ ये लक्षण भी हैं?',
        type: 'multi_select',
        options: [
          { value: 'vomiting', label_en: 'Vomiting', label_hi: 'उल्टी' },
          { value: 'loose_motion', label_en: 'Loose motion / diarrhea', label_hi: 'दस्त' },
          { value: 'constipation', label_en: 'Constipation', label_hi: 'कब्ज़' },
          { value: 'acidity', label_en: 'Acidity / heartburn', label_hi: 'एसिडिटी' },
          { value: 'fever', label_en: 'Fever', label_hi: 'बुखार' },
          { value: 'blood_in_stool', label_en: 'Blood in stool', label_hi: 'मल में खून' },
        ],
      },
    ],
    red_flags: [
      {
        symptom: 'blood_in_stool',
        severity: 'high',
        message_en: 'Blood in stool requires immediate attention',
        message_hi: 'मल में खून होना तुरंत ध्यान देने की जरूरत है',
      },
      {
        symptom: 'vomiting',
        severity: 'medium',
        message_en: 'Persistent vomiting may cause dehydration',
        message_hi: 'लगातार उल्टी से पानी की कमी हो सकती है',
      },
    ],
  },
  {
    id: 'back',
    label_en: 'Back',
    label_hi: 'पीठ',
    department: 'orthopedics',
    department_hindi: 'हड्डी रोग विभाग',
    svgId: 'back',
    icon: '🦴',
    questions: [
      {
        id: 'q_back_1',
        question_en: 'What back problem are you having?',
        question_hi: 'पीठ में क्या समस्या है?',
        type: 'multi_select',
        options: [
          { value: 'pain', label_en: 'Pain', label_hi: 'दर्द' },
          { value: 'stiffness', label_en: 'Stiffness', label_hi: 'जकड़न' },
          { value: 'injury', label_en: 'Injury / fall', label_hi: 'चोट / गिरना' },
          { value: 'numbness', label_en: 'Numbness / tingling', label_hi: 'सुन्न होना' },
        ],
      },
      {
        id: 'q_back_2',
        question_en: 'How long has this lasted?',
        question_hi: 'ये कब से है?',
        type: 'duration',
        options: [
          { value: '1_day', label_en: '1 day', label_hi: '1 दिन' },
          { value: '2_3_days', label_en: '2-3 days', label_hi: '2-3 दिन' },
          { value: '1_week', label_en: 'More than a week', label_hi: 'एक हफ्ते से ज्यादा' },
          { value: 'long_time', label_en: 'Long time / chronic', label_hi: 'बहुत समय से / पुराना' },
        ],
      },
    ],
    red_flags: [],
  },
  {
    id: 'arms_hands',
    label_en: 'Arms & Hands',
    label_hi: 'बांह और हाथ',
    department: 'orthopedics',
    department_hindi: 'हड्डी रोग विभाग',
    svgId: 'arms_hands',
    icon: '💪',
    questions: [
      {
        id: 'q_arms_1',
        question_en: 'What arm/hand problem do you have?',
        question_hi: 'बांह/हाथ में क्या समस्या है?',
        type: 'multi_select',
        options: [
          { value: 'pain', label_en: 'Pain', label_hi: 'दर्द' },
          { value: 'swelling', label_en: 'Swelling', label_hi: 'सूजन' },
          { value: 'rash', label_en: 'Rash', label_hi: 'चकत्ते' },
          { value: 'weakness', label_en: 'Weakness', label_hi: 'कमजोरी' },
          { value: 'injury', label_en: 'Injury / fracture', label_hi: 'चोट / फ्रैक्चर' },
        ],
      },
    ],
    red_flags: [
      {
        symptom: 'weakness',
        severity: 'high',
        message_en: 'Sudden one-sided weakness may indicate a stroke',
        message_hi: 'एक तरफ अचानक कमजोरी स्ट्रोक का संकेत हो सकती है',
      },
    ],
  },
  {
    id: 'legs_feet',
    label_en: 'Legs & Feet',
    label_hi: 'पैर और पैर',
    department: 'orthopedics',
    department_hindi: 'हड्डी रोग विभाग',
    svgId: 'legs_feet',
    icon: '🦵',
    questions: [
      {
        id: 'q_legs_1',
        question_en: 'What leg/foot problem do you have?',
        question_hi: 'पैर में क्या समस्या है?',
        type: 'multi_select',
        options: [
          { value: 'pain', label_en: 'Pain', label_hi: 'दर्द' },
          { value: 'swelling', label_en: 'Swelling', label_hi: 'सूजन' },
          { value: 'varicose', label_en: 'Varicose veins', label_hi: 'वैरिकोज़ वेन्स' },
          { value: 'numbness', label_en: 'Numbness / tingling', label_hi: 'सुन्न होना' },
          { value: 'injury', label_en: 'Injury / fracture', label_hi: 'चोट / फ्रैक्चर' },
        ],
      },
    ],
    red_flags: [],
  },
  {
    id: 'skin',
    label_en: 'Skin',
    label_hi: 'त्वचा',
    department: 'dermatology',
    department_hindi: 'त्वचा विभाग',
    svgId: 'skin',
    icon: '🩹',
    questions: [
      {
        id: 'q_skin_1',
        question_en: 'What skin problem do you have?',
        question_hi: 'त्वचा में क्या समस्या है?',
        type: 'multi_select',
        options: [
          { value: 'rash', label_en: 'Rash', label_hi: 'चकत्ते' },
          { value: 'itching', label_en: 'Itching', label_hi: 'खुजली' },
          { value: 'discoloration', label_en: 'Discoloration', label_hi: 'रंग बदलना' },
          { value: 'swelling', label_en: 'Swelling / hives', label_hi: 'सूजन / छाले' },
          { value: 'wound', label_en: 'Wound / infection', label_hi: 'घाव / इन्फेक्शन' },
        ],
      },
    ],
    red_flags: [
      {
        symptom: 'swelling',
        severity: 'high',
        message_en: 'Sudden swelling with breathing difficulty may be anaphylaxis',
        message_hi: 'सांस की दिक्कत के साथ अचानक सूजन एनाफिलैक्सिस हो सकती है',
      },
    ],
  },
  {
    id: 'joints',
    label_en: 'Joints',
    label_hi: 'जोड़',
    department: 'rheumatology',
    department_hindi: 'रुमेटोलॉजी विभाग',
    svgId: 'joints',
    icon: '🦿',
    questions: [
      {
        id: 'q_joints_1',
        question_en: 'Which joints are affected?',
        question_hi: 'कौन सा जोड़ प्रभावित है?',
        type: 'multi_select',
        options: [
          { value: 'knee', label_en: 'Knee', label_hi: 'घुटना' },
          { value: 'elbow', label_en: 'Elbow', label_hi: 'कोहनी' },
          { value: 'shoulder', label_en: 'Shoulder', label_hi: 'कंधा' },
          { value: 'wrist', label_en: 'Wrist', label_hi: 'कलाई' },
          { value: 'multiple', label_en: 'Multiple joints', label_hi: 'कई जोड़' },
        ],
      },
      {
        id: 'q_joints_2',
        question_en: 'When is the pain worse?',
        question_hi: 'दर्द कब ज्यादा होता है?',
        type: 'single',
        options: [
          { value: 'morning', label_en: 'Morning (stiffness)', label_hi: 'सुबह (जकड़न)' },
          { value: 'evening', label_en: 'Evening / after work', label_hi: 'शाम / काम के बाद' },
          { value: 'constant', label_en: 'Constant', label_hi: 'हमेशा' },
        ],
      },
    ],
    red_flags: [],
  },
  {
    id: 'private',
    label_en: 'Private / Reproductive',
    label_hi: 'निजी / प्रजनन',
    department: 'gynecology',
    department_hindi: 'स्त्री रोग विभाग',
    svgId: 'private',
    icon: '🚺',
    sensitive: true,
    questions: [
      {
        id: 'q_private_1',
        question_en: 'This is a sensitive area. Would you like to discuss it with the doctor privately?',
        question_hi: 'यह एक निजी क्षेत्र है। क्या आप इसे डॉक्टर से निजी तौर पर चर्चा करना चाहेंगे?',
        type: 'single',
        options: [
          { value: 'yes_private', label_en: 'Yes, I will tell the doctor in person', label_hi: 'हां, मैं डॉक्टर को बताऊंगा/बताऊंगी' },
          { value: 'discomfort_urinary', label_en: 'Urinary discomfort', label_hi: 'पेशाब में जलन' },
          { value: 'pain_lower', label_en: 'Lower abdominal pain', label_hi: 'पेट के निचले हिस्से में दर्द' },
        ],
      },
    ],
    red_flags: [],
  },
];

export const bodyPartById = (id: string): BodyPartDefinition | undefined =>
  BODY_PARTS.find((b) => b.id === id);

/** Flat list of all unique red flags usable by the emergency engine. */
export const ALL_BODY_RED_FLAGS = BODY_PARTS.flatMap((b) => b.red_flags);

/** Detect red flags from selected body part + symptoms. */
export function detectRedFlagsForBodyPart(part: BodyPartDefinition, symptoms: string[]) {
  return part.red_flags.filter((r) => symptoms.includes(r.symptom));
}