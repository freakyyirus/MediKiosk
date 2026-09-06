import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, UserPlus, ArrowLeft, AlertCircle } from 'lucide-react';
import { useSessionStore } from '../../stores';
import { patientApi, sessionApi } from '../../api/client';
import { useUIStore } from '../../stores';
import Stepper from '../../components/Stepper';
import EmergencyFab from '../../components/EmergencyFab';

const ABHA_REGEX = /^\d{10}$/;
const PHONE_REGEX = /^\d{10}$/;

export default function Identification() {
  const navigate = useNavigate();
  const { setSession } = useSessionStore();
  const { language } = useUIStore();
  const [mode, setMode] = useState<'abha' | 'walkin' | null>(null);
  const [abhaId, setAbhaId] = useState('');
  const [walkInData, setWalkInData] = useState({ name: '', age: '', gender: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  const validateAbha = (): string => {
    const value = abhaId.trim();
    if (!value) return 'Please enter your ABHA ID.';
    if (!ABHA_REGEX.test(value)) return 'ABHA ID must be a 10-digit number.';
    return '';
  };

  const validateWalkIn = (): string => {
    if (!walkInData.name.trim()) return 'Full name is required.';
    if (walkInData.phone.trim() && !PHONE_REGEX.test(walkInData.phone.trim())) return 'Phone number must be a 10-digit number.';
    if (walkInData.age.trim()) {
      const age = Number(walkInData.age);
      if (Number.isNaN(age) || age < 0 || age > 120) return 'Age must be between 0 and 120.';
    }
    if (!walkInData.gender) return 'Please select a gender.';
    return '';
  };

  const handleAbhaSubmit = async () => {
    if (submittingRef.current) return;
    const validationError = validateAbha();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    submittingRef.current = true;
    setLoading(true);
    try {
      const { data: patients } = await patientApi.search({ abha_id: abhaId });
      let patientId: number;

      if (patients.length > 0) {
        patientId = patients[0].id;
      } else {
        const { data: newPatient } = await patientApi.create({
          abha_id: abhaId,
          language_preference: language.code,
        });
        patientId = newPatient.id;
      }

      const { data: session } = await sessionApi.create({
        language: language.code,
        department: 'allopathy',
        patient_id: patientId,
      });
      setSession(session);
      navigate('/kiosk/consent');
    } catch (err) {
      // Fallback: create a local mock session so the kiosk flow works without the backend
      console.warn('Backend unreachable — using local session fallback.');
      const mockSession = {
        id: Date.now(),
        patient_id: null,
        kiosk_id: null,
        department: 'allopathy' as const,
        language: language.code,
        status: 'in_progress' as const,
        chief_complaint: null,
        history_hpi: null,
        past_medical_history: null,
        past_surgical_history: null,
        drug_history: null,
        allergy_history: null,
        family_history: null,
        personal_history: null,
        review_of_systems: null,
        ayush_assessment: null,
        asr_confidence: null,
        confidence_score: null,
        red_flags: null,
        started_at: new Date().toISOString(),
        completed_at: null,
        duration_seconds: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSession(mockSession);
      navigate('/kiosk/consent');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleWalkInSubmit = async () => {
    if (submittingRef.current) return;
    const validationError = validateWalkIn();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    submittingRef.current = true;
    setLoading(true);
    try {
      const { data: patient } = await patientApi.create({
        name: walkInData.name,
        gender: walkInData.gender || undefined,
        phone: walkInData.phone || undefined,
        language_preference: language.code,
      });

      const { data: session } = await sessionApi.create({
        language: language.code,
        department: 'allopathy',
        patient_id: patient.id,
      });
      setSession(session);
      navigate('/kiosk/consent');
    } catch (err) {
      // Fallback: create a local mock session so the kiosk flow works without the backend
      console.warn('Backend unreachable — using local session fallback.');
      const mockSession = {
        id: Date.now(),
        patient_id: null,
        kiosk_id: null,
        department: 'allopathy' as const,
        language: language.code,
        status: 'in_progress' as const,
        chief_complaint: null,
        history_hpi: null,
        past_medical_history: null,
        past_surgical_history: null,
        drug_history: null,
        allergy_history: null,
        family_history: null,
        personal_history: null,
        review_of_systems: null,
        ayush_assessment: null,
        asr_confidence: null,
        confidence_score: null,
        red_flags: null,
        started_at: new Date().toISOString(),
        completed_at: null,
        duration_seconds: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSession(mockSession);
      navigate('/kiosk/consent');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col text-surface-900 font-sans">
      <div className="px-10 pt-10">
        <Stepper steps={[{ label: 'Language' }, { label: 'Health Check' }, { label: 'Documents' }, { label: 'Done' }]} current={0} />
      </div>
      <div className="flex-1 flex flex-col items-center px-6 py-8 max-w-4xl mx-auto w-full">
        
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-surface-900 mb-4">
            Let's Get You Started
          </h1>
          <p className="text-surface-500 text-xl">
            How would you like to register for your visit?
          </p>
        </div>

        {/* Options */}
        {!mode && (
          <div className="flex flex-col sm:flex-row gap-6 w-full max-w-3xl animate-slide-up mb-8">
            <button
              onClick={() => setMode('abha')}
              className="touch-target-lg flex-1 card p-10 flex flex-col items-center gap-6 hover:shadow-lg transition-all duration-150 border-2 border-transparent hover:border-primary-300"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                <QrCode className="w-10 h-10 text-primary-600" />
              </div>
              <div className="text-center">
                <div className="font-bold text-2xl text-surface-900 mb-2">Use ABHA ID</div>
                <div className="text-lg text-surface-500">Scan QR or enter manually</div>
              </div>
            </button>

            <button
              onClick={() => setMode('walkin')}
              className="touch-target-lg flex-1 card p-10 flex flex-col items-center gap-6 hover:shadow-lg transition-all duration-150 border-2 border-transparent hover:border-primary-300"
            >
              <div className="w-20 h-20 rounded-2xl bg-surface-100 flex items-center justify-center transition-colors">
                <UserPlus className="w-10 h-10 text-primary-600" />
              </div>
              <div className="text-center">
                <div className="font-bold text-2xl text-surface-900 mb-2">Continue as Guest</div>
                <div className="text-lg text-surface-500">Quick and simple registration</div>
              </div>
            </button>
          </div>
        )}

        {/* ABHA Input */}
        {mode === 'abha' && (
          <div className="card p-10 w-full max-w-2xl animate-slide-up mb-8">
            <h2 className="text-2xl font-bold text-surface-900 mb-8 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-primary-600" />
              </div>
              Enter Your ABHA ID
            </h2>
            <div className="space-y-6">
              <input
                type="text"
                value={abhaId}
                onChange={(e) => setAbhaId(e.target.value)}
                placeholder="XX-XXXX-XXXX-XXXX"
                className="w-full bg-surface-50 border-2 border-surface-200 rounded-2xl px-6 py-5 text-xl font-medium focus:outline-none focus:border-primary-500 transition-colors placeholder:text-surface-400 text-surface-900"
                autoFocus
              />
              {error && (
                <p className="flex items-center gap-2 text-danger-600 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </p>
              )}
            </div>
            {loading && (
              <p className="flex items-center gap-2 text-surface-500 text-sm mt-4">
                <svg className="animate-spin h-4 w-4 text-primary-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying your ABHA ID…
              </p>
            )}
            <div className="flex gap-4 mt-10">
              <button
                onClick={() => setMode(null)}
                className="flex-1 touch-target bg-white border border-surface-300 rounded-2xl px-6 py-5 text-lg font-semibold text-surface-700 hover:bg-surface-100 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleAbhaSubmit}
                disabled={loading}
                className="flex-[2] touch-target bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 disabled:text-surface-500 text-white text-lg font-bold rounded-2xl px-6 py-5 transition-colors shadow-lg shadow-primary-600/25"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </div>
            <p className="text-center text-sm text-surface-400 mt-4">
              Processing your information… This usually takes a few seconds.
            </p>
          </div>
        )}

        {/* Guest Input */}
        {mode === 'walkin' && (
          <div className="card p-10 w-full max-w-2xl animate-slide-up mb-8">
            <h2 className="text-2xl font-bold text-surface-900 mb-8 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-primary-600" />
              </div>
              Guest Registration
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-surface-600 mb-2 ml-1">Full Name *</label>
                <input
                  type="text"
                  value={walkInData.name}
                  onChange={(e) => setWalkInData({ ...walkInData, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full bg-surface-50 border-2 border-surface-200 rounded-2xl px-6 py-5 text-lg font-medium focus:outline-none focus:border-primary-500 transition-colors placeholder:text-surface-400 text-surface-900"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-surface-600 mb-2 ml-1">Age</label>
                  <input
                    type="number"
                    value={walkInData.age}
                    onChange={(e) => setWalkInData({ ...walkInData, age: e.target.value })}
                    placeholder="e.g. 45"
                    className="w-full bg-surface-50 border-2 border-surface-200 rounded-2xl px-6 py-5 text-lg font-medium focus:outline-none focus:border-primary-500 transition-colors placeholder:text-surface-400 text-surface-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-surface-600 mb-2 ml-1">Gender</label>
                  <select
                    value={walkInData.gender}
                    onChange={(e) => setWalkInData({ ...walkInData, gender: e.target.value })}
                    className="w-full bg-surface-50 border-2 border-surface-200 rounded-2xl px-6 py-5 text-lg font-medium focus:outline-none focus:border-primary-500 transition-colors text-surface-900 appearance-none"
                  >
                    <option value="" disabled>Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-surface-600 mb-2 ml-1">Phone Number</label>
                <input
                  type="tel"
                  value={walkInData.phone}
                  onChange={(e) => setWalkInData({ ...walkInData, phone: e.target.value })}
                  placeholder="Enter 10-digit number"
                  className="w-full bg-surface-50 border-2 border-surface-200 rounded-2xl px-6 py-5 text-lg font-medium focus:outline-none focus:border-primary-500 transition-colors placeholder:text-surface-400 text-surface-900"
                />
              </div>
            </div>
            {error && (
              <p className="flex items-center gap-2 text-danger-600 text-sm font-medium mt-4">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}
            {loading && (
              <p className="flex items-center gap-2 text-surface-500 text-sm mt-4">
                <svg className="animate-spin h-4 w-4 text-primary-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Registering your visit…
              </p>
            )}
            <div className="flex gap-4 mt-10">
              <button
                onClick={() => setMode(null)}
                className="flex-1 touch-target bg-white border border-surface-300 rounded-2xl px-6 py-5 text-lg font-semibold text-surface-700 hover:bg-surface-100 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleWalkInSubmit}
                disabled={loading}
                className="flex-[2] touch-target bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 disabled:text-surface-500 text-white text-lg font-bold rounded-2xl px-6 py-5 transition-colors shadow-lg shadow-primary-600/25"
              >
                {loading ? 'Registering...' : 'Continue'}
              </button>
            </div>
            <p className="text-center text-sm text-surface-400 mt-4">
              Processing your information… This usually takes a few seconds.
            </p>
          </div>
        )}

      </div>
      <EmergencyFab />
    </div>
  );
}
