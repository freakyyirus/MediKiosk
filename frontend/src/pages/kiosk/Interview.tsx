import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ArrowRight, ArrowLeft, Volume2, Send, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useAudioStore, useSessionStore, useUIStore } from '../../stores';
import { useAdvancedStore } from '../../stores/advancedFeaturesStore';
import Stepper from '../../components/Stepper';
import EmergencyFab from '../../components/EmergencyFab';
import CrisisResponse from '../../components/CrisisResponse';
import aiService from '../../services/AIService';
import { bhashini } from '../../services/BhashiniService';
import { detectSelfHarm } from '../../lib/safety';
import type { AIChatTurn } from '../../api/client';

interface ChatBubble {
  role: 'assistant' | 'user';
  content: string;
}

const QUICK_REPLIES = [
  { key: 'yes', hi: 'हाँ', en: 'Yes' },
  { key: 'no', hi: 'नहीं', en: 'No' },
  { key: 'dontknow', hi: 'पता नहीं', en: "Don't know" },
  { key: 'hard', hi: 'बहुत तकलीफ है', en: 'Very painful' },
  { key: 'cantExplain', hi: 'समझा नहीं पा रहा', en: "Can't explain" },
];

export default function Interview() {
  const navigate = useNavigate();
  const { language, lowLiteracyMode, highContrast } = useUIStore();
  const { session, setSession, addMessage, addRedFlag, conversationHistory } = useSessionStore();
  const { transcription, setTranscription, resetAudio } = useAudioStore();
  const lastBodyPart = useAdvancedStore((s) => s.bodyTaps[0]?.body_part ?? null);

  const [bubbles, setBubbles] = useState<ChatBubble[]>(() =>
    conversationHistory.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))
  );
  const [aiTurn, setAiTurn] = useState<AIChatTurn | null>(null);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [complete, setComplete] = useState(false);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [painLevel, setPainLevel] = useState(5);
  const [errorMsg, setErrorMsg] = useState('');
  const [crisis, setCrisis] = useState(false);

  const startedRef = useRef(false);
  const sessionIdRef = useRef<number | null>(session?.id ?? null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const lang = language.code || 'en';
  const t = (hi: string, en: string) => (lang === 'hi' ? hi : en);

  const appendBubble = useCallback((role: 'assistant' | 'user', content: string) => {
    setBubbles((prev) => [...prev, { role, content }]);
    addMessage(role, content);
  }, [addMessage]);

  const pushErrorToStore = (err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Could not connect to the AI. Please try again.';
    setErrorMsg(msg);
  };

  const respond = useCallback(async (patientText: string) => {
    setThinking(true);
    setErrorMsg('');

    // Self-harm / crisis triage: STOP the normal AI conversation immediately.
    // We never let the LLM respond as if nothing happened, never diagnose,
    // and flag the case as high priority for human clinical review.
    const crisisHits = detectSelfHarm(patientText);
    if (crisisHits.length > 0) {
      setThinking(false);
      setCrisis(true);
      addRedFlag({
        type: 'psychiatric',
        severity: 'critical',
        confidence: 1,
        triggered_by: crisisHits,
      });
      addMessage('system', 'HIGH PRIORITY: possible self-harm disclosure flagged for urgent clinical review.');
      return;
    }

    try {
      const turn = await aiService.respond(patientText, {
        sessionId: sessionIdRef.current,
        language: lang,
        bodyPart: lastBodyPart,
      });
      sessionIdRef.current = turn.session_id ?? sessionIdRef.current;
      if (turn.session_id && session) {
        setSession({ ...session, id: turn.session_id });
      }
      setAiTurn(turn);
      appendBubble('assistant', turn.speech);
      if (turn.red_flags?.length) {
        setRedFlags((prev) => Array.from(new Set([...prev, ...turn.red_flags])));
      }
      if (turn.interview_complete) {
        setComplete(true);
      } else {
        void aiService.speak(turn, lang);
      }
    } catch (err) {
      pushErrorToStore(err);
    } finally {
      setThinking(false);
    }
  }, [lang, lastBodyPart, session, setSession, appendBubble, addRedFlag, addMessage]);

  const startInterview = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setThinking(true);
    try {
      const turn = await aiService.start({
        sessionId: sessionIdRef.current,
        language: lang,
        bodyPart: lastBodyPart,
      });
      sessionIdRef.current = turn.session_id ?? sessionIdRef.current;
      setAiTurn(turn);
      appendBubble('assistant', turn.speech);
      if (turn.red_flags?.length) setRedFlags(turn.red_flags);
      void aiService.speak(turn, lang);
    } catch (err) {
      pushErrorToStore(err);
    } finally {
      setThinking(false);
    }
  }, [lang, lastBodyPart, appendBubble]);

  useEffect(() => {
    const t = setTimeout(startInterview, 500);
    return () => clearTimeout(t);
  }, [startInterview]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles, thinking]);

  // ---- Real mic capture → Bhashini ASR → Gemini → Bhashini TTS ----
  const startRecording = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setListening(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size === 0) {
          setErrorMsg(t('बोलने के लिए माइक दबाइए', 'Tap the mic and speak'));
          return;
        }
        let text = '';
        let conf = 0;
        try {
          resetAudio();
          setTranscription('', 0);
          const result = await bhashini.speechToText(blob, lang, sessionIdRef.current ?? undefined);
          text = result.transcript || '';
          conf = result.confidence || 0;
        } catch {
          text = '';
        }
        if (!text.trim()) {
          setErrorMsg(t('आपकी आवाज़ समझ नहीं आई, दोबारा कोशिश करें', "I didn't catch that. Please try again."));
          return;
        }
        setTranscription(text.trim(), conf > 0 ? conf : 1);
        appendBubble('user', text.trim());
        await respond(text.trim());
      };
      recorder.start(250);
      setListening(true);
      if (navigator.vibrate) navigator.vibrate(40);
    } catch {
      setErrorMsg(t('माइक उपलब्ध नहीं है — नीचे टाइप करें', 'Microphone unavailable — type your answer below'));
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      setListening(false);
    }
  };

  // ---- Touch fallback: quick replies, severity, typed text ----
  const sendQuickReply = (text: string) => {
    appendBubble('user', text);
    void respond(text);
  };

  const sendDraft = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft('');
    appendBubble('user', text);
    void respond(text);
  };

  const sendSeverity = () => {
    const text = lang === 'hi' ? `दर्द ${painLevel}/10 है` : `Pain severity is ${painLevel} out of 10`;
    sendQuickReply(text);
  };

  const endConversation = () => navigate('/kiosk/ayush');
  const goBack = () => {
    resetAudio();
    navigate('/kiosk/body-map');
  };

  const criticalFlag = redFlags.some((f) => /chest|breath|blood|weak|stroke|confus/i.test(f));

  if (crisis) {
    return <CrisisResponse onContinue={endConversation} />;
  }

  return (
    <div className={`min-h-screen mesh-bg flex flex-col ${lowLiteracyMode ? 'low-literacy' : ''} ${highContrast ? 'high-contrast' : ''}`}>
      <div className="px-4 sm:px-10 pt-5 sm:pt-8">
        <Stepper steps={[{ label: 'Language' }, { label: 'Health Check' }, { label: 'Documents' }, { label: 'Done' }]} current={1} />
        <div className="mt-5 w-full h-1.5 bg-surface-200/70 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300" style={{ width: `${aiTurn?.topic === 'complete' || complete ? 100 : 40}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full px-4 sm:px-8 py-5 sm:py-6">
        {/* AI speech banner */}
        <div className="w-full text-center animate-fade-in mb-4">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-600 bg-primary-100 px-3 py-1 rounded-full">
            {t('बात कर रही हूँ', 'AI Health Assistant')}
          </span>
          {aiTurn && !complete ? (
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-surface-900 leading-snug max-w-2xl">{aiTurn.speech}</h2>
              <button onClick={() => void aiService.speak(aiTurn, lang)} className="audio-btn shrink-0" aria-label="Hear again">
                <Volume2 className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-surface-500 leading-snug mt-4">
              {thinking ? t('सोच रही हूँ…', 'Thinking…') : t('माइक दबाइए और बोलिए', 'Tap the mic and speak')}
            </h2>
          )}
        </div>

        {redFlags.length > 0 && (
          <div className={`w-full max-w-xl rounded-2xl p-4 border flex items-start gap-3 animate-fade-in mb-3 ${
            criticalFlag ? 'bg-danger-50 border-danger-200' : 'bg-warning-50 border-warning-200'
          }`}>
            <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${criticalFlag ? 'text-danger-600' : 'text-warning-600'}`} />
            <div>
              <p className={`font-bold ${criticalFlag ? 'text-danger-700' : 'text-warning-700'}`}>{t('चेतावनी', 'Attention')}</p>
              <p className="text-surface-700">{redFlags.join(', ')}</p>
            </div>
          </div>
        )}

        {/* Conversation transcript */}
        <div ref={scrollRef} className="w-full flex-1 overflow-y-auto max-h-56 space-y-3 mb-4 px-1">
          {bubbles.map((b, i) => (
            <div key={i} className={`flex ${b.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-lg font-medium shadow-sm ${
                b.role === 'assistant'
                  ? 'bg-white text-surface-800 border border-surface-200'
                  : 'bg-primary-600 text-white'
              }`}>
                {b.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-white border border-surface-200 text-surface-500 flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> {t('सोच रही हूँ…', 'Thinking…')}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {errorMsg && <p className="text-danger-600 font-medium mb-3">{errorMsg}</p>}

        {/* Completion summary */}
        {complete && aiTurn?.clinical ? (
          <div className="w-full card p-6 animate-fade-in mb-4">
            <div className="flex items-center gap-2 text-success-700 font-bold text-xl mb-3">
              <Check className="w-6 h-6" /> {t('जानकारी पूरी हो गई', 'Interview complete')}
            </div>
            <dl className="space-y-2">
              {aiTurn.clinical.chief_complaint && (
                <div className="flex gap-2"><dt className="font-semibold text-surface-600">Chief complaint:</dt><dd>{aiTurn.clinical.chief_complaint}</dd></div>
              )}
              {aiTurn.clinical.past_medical_history && (aiTurn.clinical.past_medical_history as string[]).length > 0 && (
                <div className="flex gap-2"><dt className="font-semibold text-surface-600">Past history:</dt><dd>{(aiTurn.clinical.past_medical_history as string[]).join(', ')}</dd></div>
              )}
              {aiTurn.clinical.current_medications && (aiTurn.clinical.current_medications as string[]).length > 0 && (
                <div className="flex gap-2"><dt className="font-semibold text-surface-600">Medicines:</dt><dd>{(aiTurn.clinical.current_medications as string[]).join(', ')}</dd></div>
              )}
              {aiTurn.clinical.allergies && (aiTurn.clinical.allergies as string[]).length > 0 && (
                <div className="flex gap-2"><dt className="font-semibold text-surface-600">Allergies:</dt><dd>{(aiTurn.clinical.allergies as string[]).join(', ')}</dd></div>
              )}
            </dl>
            <button onClick={endConversation} className="touch-target mt-5 w-full bg-success-600 hover:bg-success-700 text-white text-lg font-semibold rounded-2xl flex items-center justify-center gap-2 py-4 shadow-lg shadow-success-600/25 transition-colors">
              {t('आगे बढ़ें', 'Continue')} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            {/* Mic */}
            <div className="relative flex items-center justify-center mb-4">
              {listening && (
                <>
                  <div className="absolute w-[110px] h-[110px] rounded-full border-4 border-primary-500/40 animate-orb-pulse" />
                  <div className="absolute w-[64px] h-[110px] flex items-end justify-center gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-1.5 bg-primary-500 rounded-full animate-waveform" style={{ height: '70%', animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </div>
                </>
              )}
              <button
                onClick={listening ? stopRecording : () => void startRecording()}
                disabled={thinking}
                aria-label={listening ? 'Stop recording' : 'Start recording'}
                className={`w-[110px] h-[110px] rounded-full flex items-center justify-center shadow-xl transition-all duration-150 focus-ring disabled:opacity-60 ${
                  listening
                    ? 'bg-gradient-to-br from-danger-500 to-danger-600 shadow-danger-500/40 scale-105'
                    : 'bg-gradient-to-br from-primary-600 to-primary-400 shadow-primary-600/40 hover:scale-105'
                }`}
              >
                {listening ? <div className="w-8 h-8 rounded bg-white" /> : <Mic className="w-12 h-12 text-white" />}
              </button>
            </div>
            <p className="text-lg text-surface-500 mb-3">{listening ? t('बोलिए…', 'Listening… tap to stop') : t('बोलने के लिए टैप करें', 'Tap the mic to speak')}</p>

            {/* Quick replies */}
            {transcription && (
              <p className="text-lg font-medium text-surface-700 mb-2">
                {t('आपने कहा:', 'You said:')} “{transcription}”
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {QUICK_REPLIES.map((qr) => (
                <button key={qr.key} onClick={() => sendQuickReply(qr[lang === 'hi' ? 'hi' : 'en'])} disabled={thinking} className="touch-target card px-4 py-2.5 text-base font-semibold text-surface-700 hover:border-primary-300 disabled:opacity-50">
                  {qr[lang === 'hi' ? 'hi' : 'en']}
                </button>
              ))}
            </div>

            {/* Severity slider */}
            {aiTurn?.topic === 'severity' && (
              <div className="w-full max-w-lg card p-5 mb-3 animate-fade-in">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-lg text-surface-500">1</span>
                  <span className="text-4xl">{['😌', '🙂', '😕', '😣', '😖', '😫', '😤', '😨', '😱', '🤯'][painLevel - 1]}</span>
                  <span className="text-lg text-surface-500">10</span>
                </div>
                <input type="range" min={1} max={10} value={painLevel} onChange={(e) => setPainLevel(Number(e.target.value))} className="pain-slider w-full" aria-label="Pain level 1 to 10" />
                <button onClick={sendSeverity} className="touch-target mt-3 w-full bg-primary-600 hover:bg-primary-700 text-white text-base font-semibold rounded-xl py-3">
                  {t('दर्द का स्तर भेजें', 'Send severity')} ({painLevel}/10)
                </button>
              </div>
            )}

            {/* Manual text input */}
            <form onSubmit={sendDraft} className="w-full max-w-xl flex gap-2 mb-5">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('यहाँ लिखें…', 'Type your answer…')}
                className="flex-1 bg-white border-2 border-surface-200 rounded-2xl px-5 py-3.5 text-lg font-medium focus:outline-none focus:border-primary-500 transition-colors text-surface-900"
              />
              <button type="submit" disabled={!draft.trim() || thinking} className="touch-target bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 disabled:text-surface-500 text-white rounded-2xl px-5 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        )}

        <div className="w-full flex gap-3 max-w-xl">
          <button onClick={goBack} className="touch-target card px-4 flex items-center justify-center text-surface-500 hover:border-surface-300" aria-label="Back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          {!complete && (
            <button onClick={endConversation} className="touch-target flex-1 card text-lg font-semibold text-surface-500 hover:border-surface-300">
              {t('जल्दी खत्म करें', 'Finish interview')}
            </button>
          )}
        </div>
      </div>

      <EmergencyFab />
    </div>
  );
}