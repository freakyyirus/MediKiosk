/**
 * AIService — client for the Gemini talking-AI (proxied through the backend
 * /api/v1/ai/chat endpoint). Wraps the axios api with a deterministic local
 * interview fallback so the kiosk never dead-ends when the backend is offline.
 */

import { aiApi, type AIChatTurn } from '../api/client';
import { bhashini } from './BhashiniService';

export interface ConversationMessage {
  role: 'assistant' | 'user';
  content: string;
}

const FALLBACK_TOPICS = [
  'chief_complaint',
  'onset',
  'site',
  'character',
  'severity',
  'timing',
  'past_medical_history',
  'medications',
  'allergies',
  'review_of_systems',
];

const FALLBACK_QUESTIONS: Record<string, { hi: string; en: string }> = {
  chief_complaint: {
    hi: 'आप अस्पताल आज किस समस्या के साथ आए हैं? मुझे बताइए।',
    en: 'What brings you to the hospital today? Tell me about your main problem.',
  },
  onset: {
    hi: 'यह समस्या कब शुरू हुई थी?',
    en: 'When did this problem start?',
  },
  site: {
    hi: 'दर्द या परेशानी कहाँ महसूस हो रही है?',
    en: 'Where exactly do you feel the pain or discomfort?',
  },
  character: {
    hi: 'यह कैसा लगता है? जैसे तेज, जलन, भारी या धड़कता हुआ?',
    en: 'How would you describe the feeling? Sharp, dull, burning, or throbbing?',
  },
  severity: {
    hi: 'दर्द कितना गंभीर है? 1 से 10 में कितना बताइए।',
    en: 'How severe is the pain on a scale of 1 to 10?',
  },
  timing: {
    hi: 'दर्द हमेशा रहता है या आता-जाता रहता है?',
    en: 'Is the pain constant, or does it come and go?',
  },
  past_medical_history: {
    hi: 'क्या आपको कोई पुरानी बीमारी है, जैसे मधुमेह, बीपी, दिल की बीमारी या अस्थमा?',
    en: 'Do you have any known diseases like diabetes, high blood pressure, heart disease, or asthma?',
  },
  medications: {
    hi: 'क्या आप फिलहाल कोई दवाई ले रहे हैं? हाँ तो कौन-कौन सी?',
    en: 'Are you currently taking any medicines? If yes, which ones?',
  },
  allergies: {
    hi: 'क्या आपको किसी दवाई या खाने से एलर्जी है?',
    en: 'Are you allergic to any medicines or food?',
  },
  review_of_systems: {
    hi: 'क्या आपको साँस लेने में तकलीफ, बुखार, चक्कर या उल्टी जैसी कोई और परेशानी है?',
    en: 'Do you also have breathlessness, fever, dizziness, or vomiting?',
  },
};

class AIService {
  private static _instance: AIService | null = null;

  static get instance(): AIService {
    if (!AIService._instance) AIService._instance = new AIService();
    return AIService._instance;
  }

  /** Start a new interview: returns the model's opening question. */
  async start(opts: { sessionId?: number | null; patientId?: number | null; language: string; bodyPart?: string | null }) {
    this._resetHistory(opts.language);
    return this.turn(opts, '');
  }

  /** Send the patient's latest message; returns the AI's next utterance. */
  async respond(
    message: string,
    opts: { sessionId?: number | null; patientId?: number | null; language: string; bodyPart?: string | null }
  ): Promise<AIChatTurn> {
    const clean = String(message || '').trim();
    if (!clean) {
      return this._localTurn(opts, clean);
    }
    return this.turn(opts, clean);
  }

  private _historyKey(language: string): string {
    return `ai-conversation-${language}`;
  }

  private _readHistory(language: string): ConversationMessage[] {
    try {
      const raw = sessionStorage.getItem(this._historyKey(language));
      if (raw) return JSON.parse(raw) as ConversationMessage[];
    } catch {
      /* ignore corrupt history */
    }
    return [];
  }

  private _writeHistory(language: string, history: ConversationMessage[]): void {
    sessionStorage.setItem(this._historyKey(language), JSON.stringify(history.slice(-40)));
  }

  private _resetHistory(language: string): void {
    sessionStorage.removeItem(this._historyKey(language));
  }

  private async turn(
    opts: { sessionId?: number | null; patientId?: number | null; language: string; bodyPart?: string | null },
    message: string
  ): Promise<AIChatTurn> {
    const language = opts.language;
    const history = this._readHistory(language);

    let turn: AIChatTurn;
    try {
      const { data } = await aiApi.chat({
        session_id: opts.sessionId,
        patient_id: opts.patientId,
        language,
        patient_message: message || undefined,
        touched_body_part: opts.bodyPart,
        history,
      });
      turn = {
        ...data,
        speech: (data.speech || '').trim() || 'Please tell me more about that.',
        provider: 'gemini',
      };
    } catch {
      turn = this._localTurn(opts, message);
    }

    const updated = [...history];
    if ((message || '').trim() && message.trim() !== '__START__') {
      updated.push({ role: 'user', content: message.trim() });
    }
    updated.push({ role: 'assistant', content: turn.speech });
    this._writeHistory(language, updated);

    return turn;
  }

  /** Deterministic interview used when the backend is unreachable. */
  private _localTurn(
    opts: { language: string; bodyPart?: string | null },
    message: string
  ): AIChatTurn {
    const lang = opts.language === 'hi' ? 'hi' : 'en';
    const history = this._readHistory(opts.language);
    const patientAnswers = history.filter((m) => m.role === 'user').length + (message.trim() && message !== '__START__' ? 1 : 0);

    if (message.trim()) history.push({ role: 'user', content: message.trim() });

    const done = patientAnswers >= FALLBACK_TOPICS.length && message.trim().length > 0;
    let turn: AIChatTurn;
    if (done && message.trim()) {
      turn = {
        speech: lang === 'hi'
          ? 'धन्यवाद! आपकी जानकारी पूरी हो गई है। डॉक्टर आपसे जल्द मिलेंगे।'
          : 'Thank you! That is everything I need. The doctor will see you shortly.',
        transcribed: message.trim(),
        interview_complete: true,
        topic: 'complete',
        red_flags: [],
        clinical: {
          chief_complaint: history.find((m) => m.role === 'user')?.content || '',
          hpi: {},
          past_medical_history: [],
          current_medications: [],
          allergies: [],
          review_of_systems: {},
        },
        session_id: null,
        provider: 'fallback',
      };
    } else {
      const idx = Math.min(patientAnswers, FALLBACK_TOPICS.length - 1);
      const q = FALLBACK_QUESTIONS[FALLBACK_TOPICS[idx]];
      turn = {
        speech: q ? q[lang] : 'Please tell me more about your problem.',
        transcribed: message.trim(),
        interview_complete: false,
        topic: FALLBACK_TOPICS[idx],
        red_flags: [],
        clinical: null,
        session_id: null,
        provider: 'fallback',
      };
    }

    history.push({ role: 'assistant', content: turn.speech });
    this._writeHistory(opts.language, history);
    return turn;
  }

  /** Speak a turn using Bhashini TTS (with browser fallback). */
  async speak(turn: { speech: string }, language: string): Promise<boolean> {
    return bhashini.speak(turn.speech, language);
  }
}

export const aiService = AIService.instance;
export default aiService;