/**
 * Bhashini voice/translation client (frontend).
 *
 * Uses the DIRECT Dhruva compute flow that is verified working on the 2026
 * Bhashini platform (mirrors backend/app/ai/asr_client.py + tts_client.py).
 * The old ULCA "discover -> callback" pipeline (getModelsPipeline) 500s and is
 * intentionally NOT used here.
 *
 * Browsers can't hold client secrets safely, so `VITE_BHASHINI_API_KEY`
 * exposes the Bhashini *inference* key (same one the backend uses as the
 * `Authorization` header to Dhruva). Recommended for production: proxy these
 * calls through the backend instead — the key then stays server-side.
 *
 * Graceful degradation (never dead-ends the kiosk):
 *   * ASR  -> browser Web Speech when available, else a deterministic mock.
 *   * TTS  -> returns "" so callers fall back to speechSynthesis.
 *   * NMT  -> Gemini when a key is present, else passthrough of the source.
 */

type LangCode = string;

const COMPUTE_URL = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const ASR_SERVICE_IDS: Record<string, string> = {
  en: 'ai4bharat/whisper-medium-en--gpu--t4',
  hi: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  bn: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  gu: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  mr: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  or: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  pa: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  as: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4',
  ta: 'ai4bharat/conformer-multilingual-dravidian-gpu--t4',
  te: 'ai4bharat/conformer-multilingual-dravidian-gpu--t4',
  kn: 'ai4bharat/conformer-multilingual-dravidian-gpu--t4',
  ml: 'ai4bharat/conformer-multilingual-dravidian-gpu--t4',
};

const TTS_SERVICE_IDS: Record<string, string> = {
  hi: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4',
  gu: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4',
  bn: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4',
  mr: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4',
  pa: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4',
  or: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4',
  as: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4',
  ta: 'ai4bharat/indic-tts-coqui-dravidian-gpu--t4',
  te: 'ai4bharat/indic-tts-coqui-dravidian-gpu--t4',
  kn: 'ai4bharat/indic-tts-coqui-dravidian-gpu--t4',
  ml: 'ai4bharat/indic-tts-coqui-dravidian-gpu--t4',
  en: 'ai4bharat/indic-tts-coqui-misc-gpu--t4',
};

const INDIC_LANG_SET = new Set(Object.keys(ASR_SERVICE_IDS));

function bhashiniKey(): string {
  return import.meta.env.VITE_BHASHINI_API_KEY || '';
}

function geminiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

function resolveAsrServiceId(language: LangCode): string {
  return ASR_SERVICE_IDS[language] ?? 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4';
}

function resolveTtsServiceId(language: LangCode): string {
  return TTS_SERVICE_IDS[language] ?? 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function postCompute(
  payload: Record<string, unknown>,
  key: string,
  timeoutMs = 60000,
): Promise<Record<string, any>> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(COMPUTE_URL, {
      method: 'POST',
      headers: {
        Authorization: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Bhashini upstream ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function extractTranscript(data: Record<string, any>): string {
  const pipeline = data.pipelineResponse;
  if (Array.isArray(pipeline) && pipeline[0]?.output?.[0]?.source) {
    const src = pipeline[0].output[0].source;
    return Array.isArray(src) ? String(src[0] ?? '') : String(src ?? '');
  }
  const audio = data.audio;
  if (Array.isArray(audio) && audio[0]?.transcript) return String(audio[0].transcript);
  return '';
}

function extractAudio(data: Record<string, any>): string {
  const pipeline = data.pipelineResponse;
  if (Array.isArray(pipeline) && pipeline[0]?.audio?.[0]?.audioContent) {
    return String(pipeline[0].audio[0].audioContent);
  }
  return '';
}

// ---- Browser fallbacks -----------------------------------------------------

function browserTranscribe(blob: Blob, language: LangCode): Promise<{ transcript: string; confidence: number }> {
  return new Promise((resolve) => {
    const W = window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      // Deterministic mock so the demo never dead-ends (repo convention).
      resolve({ transcript: "This is a mock transcription of the patient's symptoms.", confidence: 0.9 });
      return;
    }
    const rec = new SR();
    rec.lang = `${language}-IN`;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      resolve({ transcript, confidence: 0.95 });
    };
    rec.onerror = () => {
      resolve({ transcript: "This is a mock transcription of the patient's symptoms.", confidence: 0.9 });
    };
    try {
      rec.start();
      setTimeout(() => {
        try {
          rec.stop();
        } catch {
          /* already stopped */
        }
      }, blob.size ? 9000 : 5000);
    } catch {
      resolve({ transcript: "This is a mock transcription of the patient's symptoms.", confidence: 0.9 });
    }
  });
}

// ---- Public API ------------------------------------------------------------

export async function speechToText(audioBlob: Blob, language: string): Promise<string> {
  const lang = INDIC_LANG_SET.has(language) ? language : 'hi';
  const key = bhashiniKey();

  if (!key) return (await browserTranscribe(audioBlob, lang)).transcript;

  try {
    const b64 = (await blobToBase64(audioBlob)).split(',')[1] ?? '';
    const data = await postCompute(
      {
        pipelineTasks: [
          {
            taskType: 'asr',
            config: {
              language: { sourceLanguage: lang },
              serviceId: resolveAsrServiceId(lang),
              audioFormat: audioBlob.type.includes('webm') ? 'webm' : 'wav',
              samplingRate: 16000,
            },
          },
        ],
        inputData: { audio: [{ audioContent: b64 }] },
      },
      key,
    );
    const transcript = extractTranscript(data);
    if (transcript) return transcript;
  } catch {
    /* fall through to browser fallback */
  }
  return (await browserTranscribe(audioBlob, lang)).transcript;
}

export async function translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const normalizedSource = INDIC_LANG_SET.has(sourceLang) ? sourceLang : 'hi';
  const normalizedTarget = INDIC_LANG_SET.has(targetLang) ? targetLang : 'en';
  if (normalizedSource === normalizedTarget) return text;

  const key = geminiKey();
  if (!key || !text.trim()) return text;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Translate the following text from ${normalizedSource} to ${normalizedTarget}. Keep the clinical meaning exact. Reply with ONLY the translation, no quotes.\n\n${text}`,
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    const out = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof out === 'string' && out.trim() ? out.trim() : text;
  } catch {
    return text;
  }
}

export async function textToSpeech(text: string, language: string): Promise<string> {
  const lang = INDIC_LANG_SET.has(language) ? language : 'hi';
  const key = bhashiniKey();
  if (!key) return '';

  try {
    const data = await postCompute(
      {
        pipelineTasks: [
          {
            taskType: 'tts',
            config: {
              language: { sourceLanguage: lang },
              serviceId: resolveTtsServiceId(lang),
              gender: 'female',
            },
          },
        ],
        inputData: { input: [{ source: text }] },
      },
      key,
      60000,
    );
    const content = extractAudio(data);
    return content ? `data:audio/wav;base64,${content}` : '';
  } catch {
    return '';
  }
}