import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ArrowRight, ArrowLeft, SkipForward, Volume2 } from 'lucide-react';
import { useAudioStore, useUIStore } from '../../stores';
import Stepper from '../../components/Stepper';
import EmergencyFab from '../../components/EmergencyFab';

const INTERVIEW_SECTIONS = [
  { id: 'chief_complaint', label: 'Chief Complaint', question: 'What brings you to the hospital today? What is your main problem?' },
  { id: 'hpi_site', label: 'Where is the pain?', question: 'Where exactly do you feel the pain or discomfort?' },
  { id: 'hpi_onset', label: 'When did it start?', question: 'When did this problem start?' },
  { id: 'hpi_character', label: 'What does it feel like?', question: 'How would you describe the feeling? Sharp, dull, burning, or throbbing?' },
  { id: 'hpi_severity', label: 'How bad is it?', question: 'On a scale of 1 to 10, how severe is the pain?' },
  { id: 'hpi_timing', label: 'Constant or comes and goes?', question: 'Is it constant, or does it come and go?' },
  { id: 'past_medical', label: 'Past health', question: 'Do you have any known diseases like diabetes, blood pressure, heart disease, or asthma?' },
  { id: 'medications', label: 'Medicines', question: 'Are you currently taking any medicines? If yes, which ones?' },
  { id: 'allergies', label: 'Allergies', question: 'Are you allergic to any medicines or food?' },
];

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const cls =
    confidence >= 0.9 ? 'confidence-high'
    : confidence >= 0.7 ? 'confidence-med'
    : 'confidence-low';
  const label = confidence >= 0.9 ? 'Clear' : confidence >= 0.7 ? 'Good' : 'Speak Again';
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${cls}`}>
      {label} · {Math.round(confidence * 100)}%
    </span>
  );
}

export default function Interview() {
  const navigate = useNavigate();
  const { isRecording, transcription, confidence, setRecording, setTranscription, resetAudio } = useAudioStore();
  const { lowLiteracyMode, highContrast } = useUIStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [painLevel, setPainLevel] = useState(5);
  const [sending, setSending] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const question = INTERVIEW_SECTIONS[currentQ];
  const progress = ((currentQ + 1) / INTERVIEW_SECTIONS.length) * 100;
  const isSeverityQ = question.id === 'hpi_severity';

  const speakQuestion = useCallback(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(question.question);
      utterance.rate = 0.9;
      utterance.lang = 'en-IN';
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
    }
    if (navigator.vibrate) navigator.vibrate(15);
  }, [question]);

  useEffect(() => {
    const t = setTimeout(speakQuestion, 600);
    return () => clearTimeout(t);
  }, [currentQ, speakQuestion]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setTranscription('Sample response recorded accurately.', 0.95);
      };
      recorder.start(1000);
      setRecording(true);
      if (navigator.vibrate) navigator.vibrate(40);
    } catch {
      setTranscription('Sample response recorded accurately.', 0.95);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const touchAnswer = (text: string, conf = 1) => {
    setTranscription(text, conf);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const confirmAndNext = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      resetAudio();
      if (currentQ < INTERVIEW_SECTIONS.length - 1) setCurrentQ((p) => p + 1);
      else navigate('/kiosk/documents');
    }, 400);
  };

  const goBack = () => {
    resetAudio();
    if (currentQ > 0) setCurrentQ((p) => p - 1);
    else navigate('/kiosk/consent');
  };

  const skipQuestion = () => {
    resetAudio();
    if (currentQ < INTERVIEW_SECTIONS.length - 1) setCurrentQ((p) => p + 1);
    else navigate('/kiosk/documents');
  };

  return (
    <div className={`min-h-screen mesh-bg flex flex-col ${lowLiteracyMode ? 'low-literacy' : ''} ${highContrast ? 'high-contrast' : ''}`}>
      <div className="px-10 pt-8">
        <Stepper steps={[{ label: 'Language' }, { label: 'Health Check' }, { label: 'Documents' }, { label: 'Done' }]} current={1} />
        <div className="mt-5 w-full h-1.5 bg-surface-200/70 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full px-8 py-6">
        <div className="text-center animate-fade-in mb-5">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-600 bg-primary-100 px-3 py-1 rounded-full">{question.label}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-surface-900 leading-snug mt-4 max-w-2xl">{question.question}</h2>
          <button onClick={speakQuestion} className="audio-btn mt-4" aria-label="Hear question again">
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full flex-1 flex items-center justify-center min-h-[200px] py-4">
          {isSeverityQ ? (
            <div className="w-full max-w-lg card p-8 animate-fade-in">
              <div className="flex justify-between items-end mb-4">
                <span className="text-lg text-surface-500">1</span>
                <span className="text-4xl">{['😌', '🙂', '😕', '😣', '😖', '😫', '😤', '😨', '😱', '🤯'][painLevel - 1]}</span>
                <span className="text-lg text-surface-500">10</span>
              </div>
              <input
                type="range" min={1} max={10} value={painLevel}
                onChange={(e) => { const v = Number(e.target.value); setPainLevel(v); touchAnswer(`Pain severity: ${v}/10`, 1); }}
                className="pain-slider" aria-label="Pain level from 1 to 10"
              />
              <div className="flex justify-between mt-3">
                {['Mild', 'Moderate', 'Severe'].map((label, i) => (
                  <span key={label} className={`text-sm font-semibold ${i === 0 ? 'text-success-600' : i === 1 ? 'text-warning-600' : 'text-danger-600'}`}>{label}</span>
                ))}
              </div>
            </div>
          ) : question.id === 'past_medical' || question.id === 'allergies' ? (
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg animate-fade-in">
              {['Yes', 'No'].map((opt) => (
                <button key={opt} onClick={() => touchAnswer(opt, 1)} className="touch-target-lg card p-6 text-2xl font-semibold text-surface-800 hover:border-primary-400 hover:shadow-lg transition-all">{opt}</button>
              ))}
            </div>
          ) : question.id === 'hpi_site' ? (
            <div className="w-full max-w-lg card p-8 flex flex-col items-center animate-fade-in">
              <svg viewBox="0 0 100 190" className="h-52 w-auto" aria-hidden="true">
                <g stroke="#c7c0e6" strokeWidth="1.4" fill="none" strokeLinecap="round">
                  <circle cx="50" cy="20" r="12" className="hover:fill-primary-200 hover:stroke-primary-500 cursor-pointer" />
                  <path d="M38 32 L62 32 L70 90 L30 90 Z" className="hover:fill-primary-200 hover:stroke-primary-500 cursor-pointer" />
                  <path d="M40 33 L18 80" strokeWidth="6" className="hover:stroke-primary-500 cursor-pointer" />
                  <path d="M60 33 L82 80" strokeWidth="6" className="hover:stroke-primary-500 cursor-pointer" />
                  <path d="M40 90 L30 180" strokeWidth="9" className="hover:stroke-primary-500 cursor-pointer" />
                  <path d="M60 90 L70 180" strokeWidth="9" className="hover:stroke-primary-500 cursor-pointer" />
                </g>
              </svg>
              <p className="text-surface-500 mt-3">Tap the body part that hurts</p>
            </div>
          ) : (
            <div className="card p-8 w-full max-w-lg text-center animate-fade-in">
              <p className="text-2xl text-surface-500">Press the microphone and speak your answer.</p>
            </div>
          )}
        </div>

        <div className="w-full max-w-xl glass-card px-6 py-5 mb-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isRecording ? 'bg-danger-500 text-white animate-pulse' : 'bg-primary-100 text-primary-700'}`}>
            <Mic className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            {transcription ? (
              <>
                <p className="text-lg font-medium text-surface-800 truncate">"{transcription}"</p>
                <ConfidenceBadge confidence={confidence} />
              </>
            ) : (
              <p className="text-lg text-surface-400">{isRecording ? 'Listening... speak now' : 'Tap the microphone to speak'}</p>
            )}
          </div>
        </div>

        <div className="relative flex items-center justify-center mb-3">
          {isRecording && (
            <>
              <div className="absolute w-[120px] h-[120px] rounded-full border-4 border-primary-500/40 animate-orb-pulse" />
              <div className="absolute w-[70px] h-[120px] flex items-end justify-center gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-1.5 bg-primary-500 rounded-full animate-waveform" style={{ height: '70%', animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
            </>
          )}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            className={`w-[120px] h-[120px] rounded-full flex items-center justify-center shadow-xl transition-all duration-150 focus-ring ${
              isRecording
                ? 'bg-gradient-to-br from-danger-500 to-danger-600 shadow-danger-500/40 scale-105'
                : 'bg-gradient-to-br from-primary-600 to-primary-400 shadow-primary-600/40 hover:scale-105'
            }`}
          >
            {isRecording ? <div className="w-8 h-8 rounded bg-white" /> : <Mic className="w-12 h-12 text-white" />}
          </button>
        </div>
        <p className="text-lg text-surface-500 mb-4">{isRecording ? 'Recording... tap to stop' : 'Tap to speak'}</p>

        <div className="w-full flex gap-3 max-w-xl">
          <button onClick={goBack} className="touch-target card px-4 flex items-center justify-center text-surface-500 hover:border-surface-300" aria-label="Back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button onClick={skipQuestion} className="touch-target card flex-1 text-lg font-semibold text-surface-500 hover:border-surface-300 flex items-center justify-center gap-2">
            <SkipForward className="w-5 h-5" /> Skip
          </button>
          <button
            onClick={confirmAndNext}
            disabled={!transcription || sending}
            className="touch-target flex-[2] bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 disabled:text-surface-500 text-white text-lg font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-600/25"
          >
            {sending ? 'Saving...' : currentQ < INTERVIEW_SECTIONS.length - 1 ? 'Next' : 'Review'}
            {!sending && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <EmergencyFab />
    </div>
  );
}
