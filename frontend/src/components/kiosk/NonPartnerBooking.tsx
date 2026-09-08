import React, { useState } from 'react';
import { useUIStore } from '../../stores';
import { kt } from '../../lib/kioskI18n';

interface NonPartnerBookingProps {
  patientId: string;
  interviewId?: string | null;
  department: string;
  complaint: string;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  hospital: {
    name: string;
    address?: string;
    phone?: string | null;
    place_id?: string;
  };
  language: string;
  onBack: () => void;
}

const DEFAULT_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');

export const NonPartnerBooking: React.FC<NonPartnerBookingProps> = ({
  patientId,
  interviewId,
  department,
  complaint,
  patientName,
  patientPhone,
  patientAge,
  hospital,
  language,
  onBack,
}) => {
  const highContrast = useUIStore((s) => s.highContrast);
  const rootCls = `min-h-screen p-6 ${highContrast ? 'high-contrast' : 'bg-white'}`;
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);

  const handleSubmit = async () => {
    if (!date || !time || !consent) return;
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
          ? window.localStorage.getItem('clerk-token')
          : null;
      const res = await fetch(`${DEFAULT_BASE}/outreach/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          patient_id: patientId,
          interview_id: interviewId ?? null,
          hospital_name: hospital.name,
          hospital_address: hospital.address,
          hospital_phone: hospital.phone,
          place_id: hospital.place_id,
          department,
          preferred_date: date,
          preferred_time: time,
          chief_complaint: complaint,
          patient_name: patientName,
          patient_phone: patientPhone,
          patient_age: patientAge,
          consent_given: true,
        }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || `Request failed (${res.status})`);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`${rootCls} p-10 text-center flex flex-col items-center justify-center`}>
        <h1 className="text-4xl font-bold mb-6 text-slate-900">{t('Request Sent!', 'अनुरोध भेजा गया!')}</h1>
        <p className="text-xl mb-4 text-slate-700">
          {hospital.name} {t('will contact you shortly.', 'आपसे शीघ्र संपर्क करेगा।')}
        </p>
        {hospital.phone && (
          <a href={`tel:${hospital.phone}`} className="text-3xl text-blue-600 underline mb-6">
            {hospital.phone}
          </a>
        )}
        <p className="text-lg text-slate-500">
          {t('Expected response: within 30 minutes', 'अनुमानित प्रतिक्रिया: 30 मिनट के भीतर')}
        </p>
      </div>
    );
  }

  return (
    <div className={rootCls}>
      <h1 className="text-3xl font-bold mb-2 text-slate-900">{t('Request Appointment', 'अपॉइंटमेंट अनुरोध')}</h1>
      <p className="text-lg mb-6 text-slate-600">{hospital.name}</p>

      <div className="flex flex-col gap-5 max-w-lg">
        <div>
          <label className="block text-lg font-medium mb-2 text-slate-700">
            {t('Department', 'विभाग')}
          </label>
          <input
            value={department}
            disabled
            className="w-full p-4 text-lg bg-slate-100 border-2 border-blue-500 rounded-lg text-slate-900"
          />
        </div>

        <div>
          <label className="block text-lg font-medium mb-2 text-slate-700">
            {t('Preferred Date', 'पसंदीदा तिथि')}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-4 text-lg border-2 border-blue-500 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-lg font-medium mb-2 text-slate-700">
            {t('Preferred Time', 'पसंदीदा समय')}
          </label>
          <input
            type="text"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder={t('e.g., 2PM-5PM or 10:00 AM', 'जैसे, दोपहर 2-5 बजे')}
            className="w-full p-4 text-lg border-2 border-blue-500 rounded-lg"
          />
        </div>

        <div className="p-4 border-2 border-red-400 rounded-lg bg-red-50">
          <p className="text-base mb-3 text-red-800">
            {t(
              'This hospital is not yet partnered with MediKiosk. We will email them your request.',
              'यह अस्पताल अभी MediKiosk से जुड़ा नहीं है। हम उन्हें आपका अनुरोध भेजेंगे।',
            )}
          </p>
          <label className="flex items-center gap-3 text-lg cursor-pointer text-slate-900">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="w-6 h-6"
            />
            {t('I consent to sharing my details with', 'मैं अपनी जानकारी साझा करने की सहमति देता हूं')} {hospital.name}
          </label>
        </div>

        {error && (
          <div className="text-red-600 text-base p-3 border-2 border-red-500 rounded-lg">{error}</div>
        )}

        <button
          onClick={() => void handleSubmit()}
          disabled={!date || !time || !consent || loading}
          className={`p-5 text-2xl font-bold rounded-xl border-2 border-slate-900 ${
            consent ? 'bg-yellow-400 hover:bg-yellow-300 cursor-pointer' : 'bg-slate-400 cursor-not-allowed'
          }`}
        >
          {loading ? t('Sending...', 'भेजा जा रहा है...') : t('Send Request', 'अनुरोध भेजें')}
        </button>

        <button
          onClick={onBack}
          className="p-4 text-lg bg-transparent text-slate-700 border-2 border-slate-400 rounded-xl hover:bg-slate-50"
        >
          {t('Back to Hospitals', 'वापस अस्पतालों पर')}
        </button>
      </div>
    </div>
  );
};

export default NonPartnerBooking;