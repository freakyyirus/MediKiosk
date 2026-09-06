/**
 * BhashiniService — singleton wrapper around the MediKiosk backend NLP surface
 * (/api/v1/voice, /api/v1/advanced/ocr) plus browser-native and local fallbacks.
 *
 * Decision (roadmap STEP 4): NO Bhashini keys live in the frontend. ASR/TTS/OCR
 * are proxied through the FastAPI backend (which holds the pipeline IDs + keys).
 * Every method has a deterministic local fallback so the UI is never hard-broken
 * when the backend is offline.
 */

type LangCode = 'en' | 'hi' | 'ta' | 'bn' | 'mr' | 'te' | 'kn' | 'ml' | 'gu' | 'pa';

export interface Transcription {
  transcript: string;
  confidence: number;
  red_flags: string[];
  source: 'backend' | 'browser' | 'fallback';
}

export interface TtsResult {
  audioUrl: string | null;
  supportsAudio: boolean;
  source: 'backend' | 'browser' | 'fallback';
  voices?: SpeechSynthesisVoice[];
}

export interface OcrResult {
  raw_text: string;
  confidence: number;
  engine: string;
  extracted_drugs?: string[];
  extracted_diagnoses?: string[];
  doctor_name?: string | null;
  hospital_name?: string | null;
  handwriting_detected?: boolean;
  validation_status?: string;
  source: 'backend' | 'fallback';
}

const DEFAULT_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');
const MIN_CALL_INTERVAL_MS = 350;
const RETRY_STATUSES = new Set([500, 502, 503, 504]);

class BhashiniService {
  private static _instance: BhashiniService | null = null;
  private lastCallAt = 0;
  private speechRecognition: { new (): unknown } | null = null;

  static get instance(): BhashiniService {
    if (!BhashiniService._instance) {
      BhashiniService._instance = new BhashiniService();
    }
    return BhashiniService._instance;
  }

  private constructor() {
    const w = window as unknown as { SpeechRecognition?: { new (): unknown }; webkitSpeechRecognition?: { new (): unknown } };
    this.speechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  /** Coarse in-browser rate limiter (keeps call volume to Bhashini-friendly levels). */
  private async throttle(): Promise<void> {
    const wait = MIN_CALL_INTERVAL_MS - (Date.now() - this.lastCallAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastCallAt = Date.now();
  }

  /** fetch with timeout + one retry on transient server errors. */
  private async request(
    path: string,
    init: RequestInit,
    timeoutMs = 20000
  ): Promise<Response> {
    const doFetch = async (): Promise<Response> => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        return await fetch(`${DEFAULT_BASE}${path}`, { ...init, signal: ctrl.signal });
      } finally {
        clearTimeout(t);
      }
    };

    const attempt = async (): Promise<Response> => {
      await this.throttle();
      const res = await doFetch();
      if (RETRY_STATUSES.has(res.status)) {
        await new Promise((r) => setTimeout(r, 800));
        return doFetch();
      }
      return res;
    };

    return attempt();
  }

  // ── Gated by backend /voice/transcribe ──────────────────────────
  async speechToText(audioBlob: Blob, language: string, sessionId?: number): Promise<Transcription> {
    if (!sessionId) {
      const browser = await this.browserSpeechToText(language);
      return browser;
    }
    try {
      const fd = new FormData();
      fd.append('session_id', String(sessionId));
      fd.append('language', language);
      fd.append('audio_file', audioBlob, 'recording.webm');
      const res = await this.request('/voice/transcribe', { method: 'POST', body: fd }, 30000);
      if (!res.ok) throw new Error(`backend ${res.status}`);
      const data = await res.json();
      return {
        transcript: data.transcript || '',
        confidence: data.confidence ?? 0,
        red_flags: Array.isArray(data.red_flags) ? data.red_flags : [],
        source: 'backend',
      };
    } catch {
      return this.browserSpeechToText(language);
    }
  }

  private browserSpeechToText(language: string): Promise<Transcription> {
    return new Promise((resolve) => {
      if (!this.speechRecognition) {
        resolve({ transcript: '', confidence: 0, red_flags: [], source: 'fallback' });
        return;
      }
      try {
        const SR = this.speechRecognition as unknown as new () => {
          lang: string;
          interimResults: boolean;
          maxAlternatives: number;
          onresult: ((e: { results: { [i: number]: { transcript: string; confidence?: number } }[] }) => void) | null;
          onerror: (() => void) | null;
          onend: (() => void) | null;
          start: () => void;
        };
        const rec = new SR();
        rec.lang = language === 'en' ? 'en-IN' : language;
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.onresult = (e) => {
          const text = e.results && e.results[0] ? e.results[0][0].transcript : '';
          resolve({ transcript: text, confidence: e.results[0][0].confidence || 0, red_flags: [], source: 'browser' });
        };
        rec.onerror = () => resolve({ transcript: '', confidence: 0, red_flags: [], source: 'fallback' });
        rec.onend = () => {};
        rec.start();
      } catch {
        resolve({ transcript: '', confidence: 0, red_flags: [], source: 'fallback' });
      }
    });
  }

  /** Dictation via the browser Web Speech API (no backend, no MediaRecorder). */
  async dictate(language: string): Promise<Transcription> {
    return this.browserSpeechToText(language);
  }

  // ── Gated by backend /voice/tts ─────────────────────────────────
  async textToSpeech(text: string, language: string, gender = 'female'): Promise<TtsResult> {
    try {
      const res = await this.request('/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, gender }),
      });
      if (!res.ok) throw new Error(`backend ${res.status}`);
      const data = await res.json();
      if (data.audio) {
        return { audioUrl: `data:audio/wav;base64,${data.audio}`, supportsAudio: true, source: 'backend' };
      }
      throw new Error('no audio');
    } catch {
      return this.browserTts(text, language);
    }
  }

  private browserTts(text: string, lang: string): TtsResult {
    if (!('speechSynthesis' in window)) {
      return { audioUrl: null, supportsAudio: false, source: 'fallback' };
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
      if (match) u.voice = match;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      return { audioUrl: null, supportsAudio: true, source: 'browser', voices };
    } catch {
      return { audioUrl: null, supportsAudio: false, source: 'fallback' };
    }
  }

  // ── Gated by backend /advanced/ocr/process ──────────────────────
  async extractTextFromImage(file: File): Promise<OcrResult> {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await this.request('/advanced/ocr/process', { method: 'POST', body: fd }, 30000);
      if (!res.ok) throw new Error(`backend ${res.status}`);
      const d = await res.json();
      return {
        raw_text: d.ocr_raw_text || '',
        confidence: d.ocr_confidence ?? 0,
        engine: d.ocr_engine || 'backend',
        extracted_drugs: d.extracted_drugs,
        extracted_diagnoses: d.extracted_diagnoses,
        doctor_name: d.doctor_name,
        hospital_name: d.hospital_name,
        handwriting_detected: d.handwriting_detected,
        validation_status: d.validation_status,
        source: 'backend',
      };
    } catch {
      return { raw_text: '', confidence: 0, engine: 'fallback', source: 'fallback' };
    }
  }

  // ── Local deterministic helpers (no network) ────────────────────

  /** Speak a phrase aloud — backend audio when available, browser synth otherwise. Returns whether audio started. */
  async speak(text: string, language: string): Promise<boolean> {
    const clean = String(text || '').trim();
    if (!clean) return false;
    const res = await this.textToSpeech(clean, language);
    if (res.audioUrl) {
      try {
        const audio = new Audio();
        audio.src = res.audioUrl;
        return await new Promise<boolean>((resolve) => {
          audio.onended = () => resolve(true);
          audio.onerror = () => resolve(false);
          audio.play().catch(() => resolve(false));
        });
      } catch {
        return false;
      }
    }
    return res.supportsAudio;
  }

  detectLanguage(text: string): LangCode {
    const s = text.trim();
    if (!s) return 'en';
    const scripts: [LangCode, RegExp][] = [
      ['ta', /[\u0B80-\u0BFF]/], // Tamil
      ['te', /[\u0C00-\u0C7F]/], // Telugu
      ['kn', /[\u0C80-\u0CFF]/], // Kannada
      ['ml', /[\u0D00-\u0D7F]/], // Malayalam
      ['bn', /[\u0980-\u09FF]/], // Bengali
      ['gu', /[\u0A80-\u0AFF]/], // Gujarati
      ['pa', /[\u0A00-\u0A7F]/], // Punjabi (Gurmukhi)
      ['mr', /\u0960|ॲ|ळ/], // Marathi markers within Devanagari
      ['hi', /[\u0900-\u097F]/], // Devanagari
    ];
    for (const [lang, re] of scripts) {
      if (re.test(s)) return lang;
    }
    return 'en';
  }

  async detectAudioLanguage(_audioBlob: Blob): Promise<LangCode> {
    return this.detectLanguage('');
  }

  /** Devanagari → Latin transliteration (common consonants/vowels). */
  transliterate(text: string, to: 'latin' | 'devanagari' = 'latin'): string {
    if (to === 'latin') {
      const map: Record<string, string> = {
        'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ए':'e','ऐ':'ai','ओ':'o','औ':'au',
        'क':'k','ख':'kh','ग':'g','घ':'gh','च':'ch','छ':'chh','ज':'j','झ':'jh','ट':'t','ठ':'th',
        'ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n','प':'p','फ':'f',
        'ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h',
        'क्ष':'ksh','त्र':'tr','ज्ञ':'gy','ं':'n','ः':'h','्':'','ा':'aa','ि':'i','ी':'ee','ु':'u',
        'ू':'oo','े':'e','ै':'ai','ो':'o','ौ':'au',
      };
      return text
        .split('')
        .map((ch) => map[ch] ?? ch)
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return text;
  }

  normalizeText(text: string): string {
    return text.normalize('NFKC').replace(/\s+/g, ' ').trim();
  }

  addPunctuation(text: string): string {
    let out = this.normalizeText(text);
    if (!out) return out;
    out = out.replace(/,(\S)/g, ', $1');
    if (!/[.!?\u0964\u0965]$/.test(out)) out += '.';
    return out;
  }

  /** Real-time-ish voice detection from a channel Float32Array (0=rms,1=peak). */
  detectVoiceActivity(channels: Float32Array, sampleRate = 16000): { active: boolean; peak: number; rms: number } {
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < channels.length; i++) {
      const v = Math.abs(channels[i]);
      if (v > peak) peak = v;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / Math.max(1, channels.length));
    return { active: peak > 0.12 && rms > 0.02, peak, rms };
  }

  filterProfanity(text: string): { filtered: string; hits: string[] } {
    const blocklist = ['bitch', 'bastard', 'shit', 'fuck', 'asshole', 'damn'];
    const hits: string[] = [];
    let filtered = text;
    blocklist.forEach((w) => {
      const re = new RegExp(`\\b${w}\\b`, 'gi');
      if (re.test(filtered)) {
        hits.push(w);
        filtered = filtered.replace(re, '***');
      }
    });
    return { filtered, hits };
  }

  /** Lightweight denoise: simple one-pole high-pass + peak normalization. */
  async denoiseAudio(audioBlob: Blob): Promise<Blob> {
    try {
      const arrayBuf = await audioBlob.arrayBuffer();
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return audioBlob;
      const ctx = new Ctx();
      const buf = await ctx.decodeAudioData(arrayBuf);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 120;
      const comp = ctx.createDynamicsCompressor();
      const dest = ctx.createMediaStreamDestination();
      src.connect(hp).connect(comp).connect(dest);
      src.start();
      const recorded = await new Promise<Blob | null>((resolve) => {
        const chunks: BlobPart[] = [];
        const rec = new MediaRecorder(dest.stream);
        rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        rec.onstop = () => resolve(new Blob(chunks, { type: audioBlob.type || 'audio/webm' }));
        rec.start();
        const stopAt = (buf.duration + 0.1) * 1000;
        setTimeout(() => {
          try { rec.stop(); } catch { resolve(null); }
        }, stopAt < 30000 ? stopAt : 30000);
      });
      await ctx.close();
      return recorded || audioBlob;
    } catch {
      return audioBlob;
    }
  }

  /** Regex-based entity extraction (phone, dates, vitals-ish, key symptoms). */
  extractEntities(text: string): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    const phone = text.match(/(\+?\d[\d\s-]{8,}\d)/g);
    if (phone) out.phone = phone.map((p) => p.trim());
    const date = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g);
    if (date) out.dates = date;
    const bp = text.match(/\b(\d{2,3}[\/]\d{2,3})\b/g);
    if (bp) out.bp = bp;
    const temp = text.match(/\b(\d{2}(?:\.\d)?)\s?(?:°C|°| C|degrees)\b/gi);
    if (temp) out.temperature = temp;
    const symptoms = ['fever', 'cough', 'headache', 'chest pain', 'breathlessness', 'nausea', 'vomiting', 'dizziness', 'rash', 'joint pain', 'stomach pain', 'weakness'];
    const found = symptoms.filter((s) => text.toLowerCase().includes(s));
    if (found.length) out.symptoms = found;
    return out;
  }

  /** Gender guess from Indian first-name suffix heuristics. */
  classifyGender(fullName: string): 'male' | 'female' | 'unknown' {
    const first = (fullName.trim().split(/\s+/)[0] || '').toLowerCase();
    if (!first) return 'unknown';
    if (/(a|i|e|u)$/.test(first) && /^(a|s|m|r|n|k|p|d|t|l|v|g|b|sh|pre|poo)/.test(first)) {
      const female = ['a', 'al', 'ani', 'ita', 'ini', 'i', 'ika', 'ima', 'ita', 'ee', 'usha', 'priya', 'pooja', 'sharma', 'singh'];
      if (female.some((f) => first.endsWith(f))) return 'female';
    }
    const maleMarkers = ['kumar', 'raj', 'sh', 'esh', 'an', 'ul', 'il', 'vir', 'dev', 'nas', 'pal'];
    if (maleMarkers.some((m) => first.endsWith(m))) return 'male';
    if (/^(dr|mr|mrs|ms)\.\s*/i.test(fullName)) {
      return /^(mr|dr)\./i.test(fullName) ? 'male' : 'female';
    }
    return 'unknown';
  }
}

export const bhashini = BhashiniService.instance;
export default bhashini;