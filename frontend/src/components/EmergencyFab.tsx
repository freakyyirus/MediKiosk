import { AlertTriangle, X, Phone } from 'lucide-react';
import { useState } from 'react';

/**
 * Floating emergency help pill (bottom-right).
 * Also handles the 30-second inactivity countdown overlay.
 */
export default function EmergencyFab() {
  const [showHelp, setShowHelp] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const helpContacts = [
    { label: 'Hospital Emergency', value: '108' },
    { label: 'Ambulance', value: '102' },
    { label: 'Police', value: '112' },
  ];

  return (
    <>
      {/* Floating red pill */}
      <button
        className="emergency-fab focus-ring"
        onClick={() => setShowHelp(true)}
        aria-label="Emergency help"
      >
        <AlertTriangle className="w-5 h-5" />
        <span>Emergency</span>
      </button>

      {/* Emergency help sheet */}
      {showHelp && (
        <div className="timeout-overlay" onClick={() => setShowHelp(false)}>
          <div
            className="card p-8 max-w-md w-full mx-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-danger-50 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-danger-600" />
                </div>
                <h2 className="text-2xl font-bold text-surface-900">Emergency Help</h2>
              </div>
              <button onClick={() => setShowHelp(false)} className="touch-target" aria-label="Close">
                <X className="w-6 h-6 text-surface-500" />
              </button>
            </div>

            <p className="text-lg text-surface-600 mb-6">
              If you are in an emergency, please call the number below or ask a hospital staff member for help.
            </p>

            <div className="space-y-3">
              {helpContacts.map((c) => (
                <a
                  key={c.label}
                  href={`tel:${c.value}`}
                  className="touch-target-lg w-full card px-6 py-4 flex items-center justify-between hover:border-primary-300 transition-colors"
                >
                  <span className="font-medium text-lg text-surface-800">{c.label}</span>
                  <span className="text-2xl font-bold text-danger-600">{c.value}</span>
                </a>
              ))}
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="touch-target w-full mt-6 bg-primary-600 hover:bg-primary-700 text-white text-lg font-semibold rounded-2xl transition-colors"
            >
              I&apos;m okay, continue
            </button>
          </div>
        </div>
      )}
    </>
  );
}
