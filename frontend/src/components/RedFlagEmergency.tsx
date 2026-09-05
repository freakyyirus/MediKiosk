import { useState } from 'react';
import { AlertTriangle, Phone, ArrowRight } from 'lucide-react';

interface RedFlagEmergencyProps {
  onHelp: () => void;
  onContinue: () => void;
  priorityToken: string;
  severity: string;
}

/**
 * Full-screen emergency interrupt.
 * Red gradient + pulsing animation + huge white text.
 */
export default function RedFlagEmergency({
  onHelp,
  onContinue,
  priorityToken,
  severity,
}: RedFlagEmergencyProps) {
  const [showPhone, setShowPhone] = useState(false);

  if (showPhone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-danger-600 via-danger-500 to-coral-500 flex items-center justify-center px-8">
        <div className="max-w-lg w-full text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
            <Phone className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Emergency Number</h2>
          <a
            href="tel:108"
            className="block bg-white text-danger-600 text-6xl font-black rounded-3xl py-8 mb-6 shadow-2xl hover:scale-105 transition-transform"
          >
            108
          </a>
          <p className="text-white/90 text-xl mb-8">Ambulance · Free nationwide</p>
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
    <div className="min-h-screen bg-gradient-to-br from-danger-600 via-danger-500 to-coral-500 flex flex-col items-center justify-center px-8 relative overflow-hidden">
      {/* Pulsing rings */}
      <div className="absolute w-[500px] h-[500px] rounded-full border-4 border-white/20 animate-emergency" style={{ animationDelay: '0s' }} />
      <div className="absolute w-[380px] h-[380px] rounded-full border-4 border-white/15 animate-emergency" style={{ animationDelay: '0.5s' }} />
      <div className="absolute w-[260px] h-[260px] rounded-full border-4 border-white/10 animate-emergency" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 text-center w-full max-w-2xl animate-fade-in">
        <span className="inline-flex items-center gap-2 bg-white/20 text-white font-bold px-5 py-2 rounded-full text-lg mb-6">
          <AlertTriangle className="w-5 h-5" /> URGENT
        </span>

        <h1 className="text-6xl md:text-7xl font-black text-white leading-tight mb-3 animate-emergency">
          Emergency
          <br />
          Detected
        </h1>

        <p className="text-white/95 text-2xl font-medium mb-8 max-w-xl mx-auto">
          Your symptoms may need immediate medical attention.
        </p>

        {/* Priority token badge */}
        <div className="inline-flex items-center gap-3 bg-white text-danger-600 font-black text-3xl px-8 py-4 rounded-2xl shadow-2xl mb-10">
          <span className="text-lg font-bold uppercase tracking-wider">Priority</span>
          <span className="text-4xl">{priorityToken}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setShowPhone(true)}
            className="touch-target-lg flex-[1.2] bg-white hover:bg-surface-50 text-danger-600 text-2xl font-bold rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
          >
            <Phone className="w-7 h-7" /> Get Help Now
          </button>
          <button
            onClick={onContinue}
            className="touch-target-lg flex-1 border-4 border-white/70 text-white text-2xl font-bold rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-white/10"
          >
            Continue <ArrowRight className="w-7 h-7" />
          </button>
        </div>

        <div className="mt-8 text-white/85 text-lg flex items-center justify-center gap-2 gap-y-1">
          <AlertTriangle className="w-5 h-5" /> {severity === 'critical' ? 'Critical' : 'High'} priority · Staff will be notified
        </div>
      </div>
    </div>
  );
}
