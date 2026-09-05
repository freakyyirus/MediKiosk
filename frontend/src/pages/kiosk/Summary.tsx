import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Printer, QrCode, Loader2, ArrowRight, Volume2, Stethoscope, Pill, AlertTriangle, X } from 'lucide-react';
import { useSessionStore } from '../../stores';
import { summaryApi } from '../../api/client';
import EmergencyFab from '../../components/EmergencyFab';
import QRCodeSlip from '../../components/advanced/QRCodeSlip';

export default function Summary() {
  const navigate = useNavigate();
  const { session, resetSession } = useSessionStore();
  const [generating, setGenerating] = useState(true);
  const [tokenNumber, setTokenNumber] = useState('A-42');
  const [summaryText, setSummaryText] = useState('');
  const [playingSection, setPlayingSection] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    const generate = async () => {
      if (session?.id) {
        try {
          const res = await summaryApi.generate(session.id);
          setSummaryText(res.data.summary_text || 'Summary generated from your interview and documents.');
        } catch {
          setSummaryText('Summary generated from your interview and documents.');
        }
      } else {
        setSummaryText('Summary generated from your interview and documents.');
      }
      setTokenNumber(`A-${Math.floor(Math.random() * 90) + 1}`);
      setGenerating(false);
    };

    const timer = setTimeout(generate, 2200);
    return () => clearTimeout(timer);
  }, [session]);

  const speakSection = (id: string, text: string) => {
    if (playingSection === id) {
      speechSynthesis.cancel();
      setPlayingSection(null);
      return;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.volume = 1;
      u.lang = 'en-IN';
      speechSynthesis.speak(u);
      u.onend = () => setPlayingSection(null);
      setPlayingSection(id);
    }
  };

  const clinicalSections = [
    {
      id: 'complaint',
      icon: Stethoscope,
      title: 'Chief Complaint',
      value: session?.chief_complaint || 'Recorded via voice interview',
    },
    {
      id: 'medications',
      icon: Pill,
      title: 'Current Medications',
      value: (session?.drug_history as { medications?: string[] } | null)?.medications?.join(', ') || 'Recorded during interview',
    },
  ];

  const handleFinish = () => {
    speechSynthesis.cancel();
    resetSession();
    navigate('/');
  };

  if (generating) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col items-center justify-center px-6">
        <div className="text-center animate-fade-in">
          <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center mx-auto mb-6 shimmer">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </div>
          <h1 className="text-4xl font-bold text-surface-900 mb-4">Preparing Your Summary</h1>
          <p className="text-xl text-surface-500 max-w-sm mx-auto">
            Analyzing your responses and documents to create a clinical summary for your doctor.
          </p>
          <div className="mt-8 w-64 mx-auto">
            <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-r from-primary-600 to-primary-400 rounded-full shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col text-surface-900">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success-100 mx-auto mb-6">
            <svg viewBox="0 0 52 52" className="w-12 h-12">
              <path
                className="draw-check"
                fill="none"
                stroke="#16a34a"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27l8 8 16-17"
              />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-success-700 mb-3">Your Health Check is Complete</h1>
          <p className="text-xl text-surface-500 max-w-lg mx-auto">
            Your history is saved securely and ready for your physician.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 w-full">
          {/* Left: token & actions */}
          <div className="flex-1 flex flex-col gap-5 animate-slide-up">
            <div className="card p-8 text-center">
              <p className="text-surface-500 text-lg mb-2 uppercase tracking-wider font-semibold">Your OPD Token</p>
              <div className="text-[96px] leading-none font-black text-primary-700 mb-3 tracking-tight">
                {tokenNumber}
              </div>
              <p className="text-lg text-surface-600 font-medium">Estimated wait: ~15 minutes</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-700 bg-primary-50 px-3 py-1 rounded-full font-medium">
                <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" /> Ready for Review
              </div>
            </div>

            <div className="card p-5 flex flex-col gap-3">
              <button className="touch-target w-full bg-surface-50 hover:bg-surface-100 text-primary-700 font-semibold rounded-2xl flex items-center justify-center gap-3 transition-colors border border-surface-200">
                <Printer className="w-6 h-6" /> Print Token
              </button>
              <button
                onClick={() => setQrOpen(true)}
                className="touch-target w-full bg-surface-50 hover:bg-surface-100 text-primary-700 font-semibold rounded-2xl flex items-center justify-center gap-3 transition-colors border border-surface-200"
              >
                <QrCode className="w-6 h-6" /> Show QR (For Doctor)
              </button>
            </div>
          </div>

          {/* Right: clinical summary cards */}
          <div className="flex-[1.4] card p-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h3 className="text-2xl font-bold text-surface-900 mb-6 border-b border-surface-100 pb-4">
              Medical Summary
            </h3>

            <div className="space-y-4 mb-6">
              {clinicalSections.map((s) => (
                <div key={s.id} className="bg-surface-50 rounded-2xl p-4 border border-surface-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center shrink-0 mt-1">
                      <s.icon className="w-5 h-5 text-primary-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-surface-400 uppercase tracking-wider mb-1">{s.title}</p>
                      <p className="text-lg font-medium text-surface-800 leading-snug">{s.value}</p>
                    </div>
                    <button
                      onClick={() => speakSection(s.id, s.value)}
                      className={`audio-btn shrink-0 ${playingSection === s.id ? 'bg-primary-600 text-white' : ''}`}
                      aria-label={`Play ${s.title}`}
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {summaryText && (
                <div className="bg-primary-50 rounded-2xl p-4 border border-primary-100">
                  <p className="text-sm font-bold text-primary-400 uppercase tracking-wider mb-1">AI Summary</p>
                  <p className="text-surface-700 leading-relaxed text-lg">{summaryText}</p>
                </div>
              )}
            </div>

            <div className="bg-warning-50 rounded-2xl p-4 border border-warning-100 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0 mt-1" />
              <p className="text-surface-600">
                <span className="font-bold">Next:</span> Go to the waiting area. Your doctor will have this summary on their screen.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full mt-10 text-center flex flex-col items-center">
          <p className="text-surface-500 text-lg font-medium mb-8 max-w-2xl">
            <span className="font-bold">Disclaimer:</span> This is preliminary guidance to assist your physician and does not replace a doctor's diagnosis.
          </p>
          <button
            onClick={handleFinish}
            className="touch-target-lg w-full max-w-md bg-primary-600 hover:bg-primary-700 text-white text-xl font-bold rounded-2xl transition-colors shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2"
          >
            Finish & Return Home <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {qrOpen && (
        <div className="fixed inset-0 z-50 bg-surface-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setQrOpen(false)}>
          <div className="relative animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setQrOpen(false)}
              className="absolute -top-3 -right-3 w-11 h-11 rounded-full bg-white shadow-lg border border-surface-200 flex items-center justify-center text-surface-600 hover:text-surface-900 z-10"
              aria-label="Close QR"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="card p-6">
              <h3 className="text-xl font-bold text-surface-900 mb-1 text-center">Show this to your doctor</h3>
              <p className="text-surface-500 mb-4 text-center text-sm">The doctor scans it to open your visit summary instantly.</p>
              <QRCodeSlip
                data={{
                  tokenNumber,
                  patientName: 'Demo Patient',
                  department: session?.department || 'General Medicine',
                  chiefComplaint: session?.chief_complaint || 'Recorded via voice interview',
                  priority: 3,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <EmergencyFab />
    </div>
  );
}
