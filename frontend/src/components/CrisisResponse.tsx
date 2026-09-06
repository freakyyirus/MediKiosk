import { useState } from 'react';
import { AlertTriangle, Phone, ArrowRight, HeartHandshake } from 'lucide-react';
import { CRISIS_RESOURCES } from '../lib/safety';

interface CrisisResponseProps {
  onContinue: () => void;
}

/**
 * Full-screen crisis interrupt shown when high-risk self-harm language is
 * detected. We do NOT diagnose, we do NOT continue the normal AI interview —
 * we direct the person to immediate professional/emergency help and flag the
 * case for urgent human clinical review.
 */
export default function CrisisResponse({ onContinue }: CrisisResponseProps) {
  const [showPhone, setShowPhone] = useState(false);

  if (showPhone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-danger-600 via-danger-500 to-coral-500 flex items-center justify-center px-6 py-8">
        <div className="max-w-lg w-full animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
            <Phone className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white text-center mb-6">Call now — someone is there for you</h2>
          <div className="space-y-4 mb-8">
            {CRISIS_RESOURCES.map((r) => (
              <div key={r.number} className="bg-white/15 backdrop-blur rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{r.label}</p>
                  <p className="text-white/80 text-sm">Free · 24×7</p>
                </div>
                <a
                  href={r.tel}
                  className="shrink-0 bg-white text-danger-600 text-3xl font-black rounded-2xl px-8 py-4 shadow-2xl hover:scale-105 transition-transform"
                  aria-label={`Call ${r.number}`}
                >
                  {r.number}
                </a>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowPhone(false)}
            className="touch-target w-full bg-white/20 hover:bg-white/30 text-white text-xl font-semibold rounded-2xl transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-danger-700 via-danger-600 to-coral-500 flex flex-col items-center justify-center px-8 py-10 relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] rounded-full border-4 border-white/20 animate-emergency" style={{ animationDelay: '0s' }} />
      <div className="absolute w-[380px] h-[380px] rounded-full border-4 border-white/15 animate-emergency" style={{ animationDelay: '0.5s' }} />
      <div className="absolute w-[260px] h-[260px] rounded-full border-4 border-white/10 animate-emergency" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 text-center w-full max-w-2xl animate-fade-in">
        <span className="inline-flex items-center gap-2 bg-white/20 text-white font-bold px-5 py-2 rounded-full text-lg mb-6">
          <AlertTriangle className="w-5 h-5" /> HIGH PRIORITY
        </span>

        <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-6">
          <HeartHandshake className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
          You are not alone
        </h1>

        <p className="text-white/95 text-xl md:text-2xl font-medium mb-6 max-w-xl mx-auto">
          It sounds like you may be thinking about harming yourself. How you feel matters,
          and help is available right now.
        </p>

        <div className="bg-white/15 backdrop-blur rounded-2xl p-5 mb-8 text-left max-w-xl mx-auto">
          <p className="text-lg font-semibold text-white mb-3">Please do right now:</p>
          <ul className="space-y-2 text-white/95 text-lg">
            <li>• Reach out to emergency services by calling one of the numbers below.</li>
            <li>• Stay with someone you trust and tell them how you are feeling.</li>
            <li>• Do not stay alone. You are important to people who care about you.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={() => setShowPhone(true)}
            className="touch-target-lg flex-[1.2] bg-white hover:bg-surface-50 text-danger-600 text-2xl font-bold rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
          >
            <Phone className="w-7 h-7" /> Call for help now
          </button>
        </div>

        <p className="text-white/85 text-lg mb-6 max-w-xl mx-auto">
          Our care team has been notified and will reach out to you. This has been flagged as
          a high-priority case so a clinician speaks with you as soon as possible.
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onContinue}
            className="touch-target border-4 border-white/70 text-white text-xl font-bold rounded-2xl px-8 py-3 flex items-center justify-center gap-2 transition-all hover:bg-white/10"
          >
            I understand — continue <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}