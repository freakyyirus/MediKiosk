import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Check, ArrowRight, ArrowLeft, UserCheck } from 'lucide-react';
import { useSessionStore } from '../../stores';
import { consentApi } from '../../api/client';
import Stepper from '../../components/Stepper';
import EmergencyFab from '../../components/EmergencyFab';

const CONSENT_ITEMS = [
  {
    id: 'data_collection',
    icon: Shield,
    title: 'Medical Data Collection',
    desc: 'Collection of your symptoms, history, and vital signs for clinical assessment.',
    required: true,
  },
  {
    id: 'ai_assessment',
    icon: Lock,
    title: 'AI-Assisted Analysis',
    desc: 'AI will help structure your information for the physician to review faster.',
    required: true,
  },
  {
    id: 'physician_review',
    icon: UserCheck,
    title: 'Physician Review',
    desc: 'A qualified physician will review your case and may ask follow-up questions.',
    required: true,
  },
];

export default function Consent() {
  const navigate = useNavigate();
  const { session, setConsentGiven } = useSessionStore();
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  const allRequired = CONSENT_ITEMS.filter((i) => i.required).every((i) => consents[i.id]);

  const toggle = (id: string) => {
    setConsents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNext = async () => {
    if (!allRequired || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);

    // Try persisting consent to the backend, but never block the kiosk
    // flow on a backend/DB failure — consent is recorded in the session
    // store either way and can be synced later.
    if (session?.id) {
      try {
        await consentApi.submit({
          session_id: session.id,
          patient_id: session.patient_id ?? undefined,
          consents: CONSENT_ITEMS.map((item) => ({
            consent_type: item.id,
            granted: !!consents[item.id],
          })),
        });
      } catch {
        // Backend unavailable — proceed anyway; consent is tracked locally.
        console.warn('Consent API unavailable, proceeding with local consent');
      }
    }

    setConsentGiven(true);
    if (navigator.vibrate) navigator.vibrate(20);
    navigate('/kiosk/interview');
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <div className="px-4 sm:px-10 pt-5 sm:pt-10">
        <Stepper steps={[{ label: 'Language' }, { label: 'Health Check' }, { label: 'Documents' }, { label: 'Done' }]} current={1} />
      </div>

      <div className="flex-1 flex flex-col items-center max-w-lg mx-auto w-full px-4 sm:px-8 py-6 sm:py-8">
        <div className="text-center pb-6 animate-fade-in">
          <div className="w-16 h-16 rounded-[22px] bg-primary-100 border border-primary-200 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-700" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 leading-tight">Your Consent</h1>
          <p className="text-base sm:text-lg text-surface-500 mt-2">
            Your data is encrypted. Required permissions are shown below.
          </p>
        </div>

        <div className="w-full space-y-3 mb-6">
          {CONSENT_ITEMS.map((item) => {
            const checked = !!consents[item.id];
            return (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                aria-pressed={checked}
                className={`w-full text-left rounded-2xl p-4 sm:p-5 transition-all duration-150 border-2 ${
                  checked
                    ? 'card border-primary-400 bg-primary-50/50'
                    : 'card border-transparent hover:border-primary-200'
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    checked ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-500'
                  }`}>
                    {checked ? <Check className="w-6 h-6 text-white" /> : <item.icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base sm:text-lg text-surface-800">{item.title}</span>
                      {item.required && (
                        <span className="text-xs font-bold uppercase tracking-wider text-danger-600 bg-danger-50 px-2 py-0.5 rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-surface-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Plain-language data disclosure */}
        <div className="w-full rounded-2xl border border-surface-200 bg-surface-50 p-4 mb-6 text-sm text-surface-600 leading-relaxed">
          <p className="font-semibold text-surface-800 mb-1">How your information is used</p>
          <p>
            The details you provide — including your symptoms, voice notes, uploaded documents and
            measurements — are shared only with the treating physician and stored securely to
            complete this check-in. AI is used only to organise the information you give; it never
            decides a diagnosis or treatment on its own. Nothing is sold to third parties.
          </p>
        </div>

        <div className="w-full flex gap-2">
          <button
            onClick={() => navigate('/kiosk/identify')}
            className="touch-target card px-4 flex items-center justify-center text-surface-500 hover:border-surface-300"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            disabled={!allRequired || saving}
            className="touch-target flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 disabled:text-surface-500 text-white text-lg font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-600/25"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving consent…
              </>
            ) : (
              <>Continue <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </div>

      <EmergencyFab />
    </div>
  );
}
