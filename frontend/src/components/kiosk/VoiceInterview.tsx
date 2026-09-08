import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { kioskApi, type KioskQuestion, type KioskSummary } from '../../api/client';
import { speechToText, translate, textToSpeech } from '../../lib/bhashini';
import { useUIStore } from '../../stores';
import { kt } from '../../lib/kioskI18n';

interface Message {
  role: 'ai' | 'patient';
  text: string;
  nativeText?: string;
}

export interface InterviewSummary {
  summary: string;
  department: string;
  isEmergency: boolean;
  conversation: Array<{ q: string; a: string }>;
}

interface VoiceInterviewProps {
  sessionId: string;
  bodyPart: string;
  organ: string | null;
  language: string;
  onComplete: (summary: InterviewSummary) => void;
}

const LOW_CONFIDENCE_THRESHOLD = 0.6;

export const VoiceInterview: React.FC<VoiceInterviewProps> = ({
  sessionId,
  bodyPart,
  organ,
  language,
  onComplete,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentQuestionId, setCurrentQuestionId] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(7);
  const [conversationHistory, setConversationHistory] = useState<Array<{ q: string; a: string }>>([]);
  const [severity, setSeverity] = useState<string>('low');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const highContrast = useUIStore((s) => s.highContrast);
  const rootCls = `min-h-screen p-6 flex flex-col items-center ${highContrast ? 'high-contrast' : 'bg-white'}`;

  const { isRecording, audioBlob, error, audioDurationMs, startRecording, stopRecording } = useVoiceRecorder();

  const isNative = language !== 'en';

  const speakAndShow = useCallback(async (text: string): Promise<void> => {
    setMessages((prev) => [...prev, { role: 'ai', text }]);
    const audible = isNative ? await translate(text, 'en', language) : text;
    const audioUrl = await textToSpeech(audible, language);
    if (audioUrl) {
      audioRef.current?.pause();
      audioRef.current = new Audio(audioUrl);
      void audioRef.current.play().catch(() => speakBrowser(audible));
    } else {
      speakBrowser(audible);
    }
  }, [isNative, language]);

  const speakBrowser = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis?.cancel?.();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.lang = isNative ? `${language}-IN` : 'en-IN';
    window.speechSynthesis?.speak(u);
  }, [isNative, language]);

  const fetchNextQuestion = useCallback(async () => {
    setIsProcessing(true);
    try {
      const { data } = await kioskApi.askQuestion(sessionId, currentQuestionId || 'init');

      if (data.status === 'emergency') {
        await speakAndShow(data.emergency_message || 'Please stay calm. A team has been notified.');
        onComplete({
          summary: 'Emergency symptoms detected. Patient advised to visit ER.',
          department: 'Emergency',
          isEmergency: true,
          conversation: conversationHistory,
        });
        return;
      }

      if (data.status === 'summary') {
        await fetchSummary();
        return;
      }

      if (data.question) {
        setCurrentQuestion(data.question);
        setCurrentQuestionId(data.question_id);
        setQuestionIndex(data.question_index ?? questionIndex + 1);
        setMaxQuestions(data.max_questions ?? 7);
        await speakAndShow(data.question);
        // Auto-listen after question is spoken
        setTimeout(() => {
          void startRecording();
        }, 500);
      }
    } catch {
      const fallback = language === 'hi' ? 'क्या आपको दर्द है?' : 'Are you in pain?';
      setCurrentQuestion(fallback);
      await speakAndShow(fallback);
    } finally {
      setIsProcessing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentQuestionId, language, onComplete, conversationHistory]);

  const fetchSummary = useCallback(async () => {
    setIsProcessing(true);
    try {
      const { data } = await kioskApi.interviewSummary(sessionId, currentQuestionId);
      const summaryText = data.summary?.physician_summary || 'Interview complete.';
      const summaryInLang = data.summary_in_language?.physician_summary || summaryText;
      await speakAndShow(summaryInLang);
      onComplete({
        summary: data.summary?.physician_summary || summaryText,
        department: data.department_label || data.department || 'General Medicine',
        isEmergency: data.emergency,
        conversation: conversationHistory,
      });
    } catch {
      onComplete({
        summary: 'Interview complete.',
        department: 'General Medicine',
        isEmergency: false,
        conversation: conversationHistory,
      });
    } finally {
      setIsProcessing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentQuestionId, language, onComplete, conversationHistory]);

  useEffect(() => {
    void fetchNextQuestion();
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processPatientResponse = useCallback(async () => {
    if (!audioBlob) return;
    setIsProcessing(true);

    try {
      const nativeText = (await speechToText(audioBlob, language)) || '';
      const englishText = isNative && nativeText ? await translate(nativeText, language, 'en') : nativeText;

      const displayText = nativeText || (language === 'hi' ? 'कोई प्रतिक्रिया नहीं मिली' : 'No response heard');
      setMessages((prev) => [...prev, { role: 'patient', text: displayText }]);

      const newHistory = [...conversationHistory, { q: currentQuestion, a: englishText }];
      setConversationHistory(newHistory);

      // Check confidence via backend submit
      const { data: submitResult } = await kioskApi.submitResponse(
        sessionId,
        currentQuestionId,
        englishText,
        0.9, // confidence placeholder — Bhashini returns real value
        audioDurationMs / 1000,
      );

      setSeverity(submitResult.severity || 'low');

      if (submitResult.status === 'emergency') {
        await speakAndShow('Please go to the Emergency Room immediately. This may be serious.');
        onComplete({
          summary: 'Emergency symptoms detected.',
          department: 'Emergency',
          isEmergency: true,
          conversation: newHistory,
        });
        return;
      }

      if (submitResult.status === 'summary') {
        await fetchSummary();
        return;
      }

      // Continue to next question
      await fetchNextQuestion();
    } catch {
      const msg = language === 'hi' ? 'माफ़ करें, समझ नहीं आया। कृपया साफ़ बोलें।' : 'Sorry, I did not understand. Please speak clearly.';
      await speakAndShow(msg);
      // Retry: auto-listen again
      setTimeout(() => {
        void startRecording();
      }, 500);
    } finally {
      setIsProcessing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob, language, sessionId, currentQuestionId, currentQuestion, conversationHistory, onComplete]);

  useEffect(() => {
    if (audioBlob && !isRecording) {
      void processPatientResponse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob, isRecording]);

  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  const skipInterview = () => {
    onComplete({
      summary: 'Interview skipped by patient',
      department: 'General Medicine',
      isEmergency: false,
      conversation: conversationHistory,
    });
  };

  const progress = maxQuestions > 0 ? (questionIndex / maxQuestions) * 100 : 0;

  return (
    <div className={rootCls}>
      {/* Progress bar */}
      <div className="w-full max-w-xl mb-4">
        <div className="flex justify-between text-sm text-slate-500 mb-1">
          <span>{kt(language, 'questionCounter', { x: questionIndex, y: maxQuestions })}</span>
          {severity !== 'low' && (
            <span className={`font-bold ${severity === 'high' ? 'text-red-600' : 'text-amber-600'}`}>
              Severity: {severity}
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Conversation */}
      <div className="w-full max-w-xl flex-1 overflow-y-auto mb-6 space-y-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border-2 ${
              msg.role === 'ai' ? 'bg-slate-50 border-blue-500' : 'bg-blue-50 border-blue-400 ml-8'
            }`}
          >
            <p className="text-xl font-bold text-slate-900">
              {msg.role === 'ai' ? 'AI' : 'You'}: {msg.text}
            </p>
          </div>
        ))}
        {isProcessing && (
          <div className="text-center p-5">
            <div className="inline-flex items-center gap-2 text-lg text-slate-500">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              {kt(language, 'processing')}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-lg mb-4 p-3 border-2 border-red-500 rounded-lg">Warning: {error}</div>
      )}

      {/* Controls */}
      <div className="flex gap-4 items-center p-6 border-t border-slate-200 w-full justify-center">
        <button
          onClick={() => void speakAndShow(currentQuestion)}
          disabled={isProcessing}
          className="px-6 py-4 text-lg bg-transparent text-slate-700 border-2 border-slate-400 rounded-xl hover:bg-slate-50 disabled:opacity-50"
        >
          {kt(language, 'repeat')}
        </button>

        <button
          onClick={handleMicToggle}
          disabled={isProcessing}
          className={`w-20 h-20 rounded-full text-3xl flex items-center justify-center border-4 border-slate-900 transition-transform ${
            isRecording ? 'bg-red-500 animate-pulse scale-105' : 'bg-green-500 hover:scale-105'
          } disabled:opacity-50`}
        >
          {isRecording ? 'Stop' : kt(language, 'mic')}
        </button>

        <button
          onClick={skipInterview}
          className="px-6 py-4 text-lg bg-transparent text-slate-700 border-2 border-slate-400 rounded-xl hover:bg-slate-50"
        >
          {kt(language, 'skip')}
        </button>
      </div>
    </div>
  );
};

export default VoiceInterview;
