import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores';
import AnatomyMap, { type BodyPart } from '../../components/kiosk/AnatomyMap';
import VoiceInterview, { type InterviewSummary } from '../../components/kiosk/VoiceInterview';
import KioskDocuments from '../../components/kiosk/KioskDocuments';
import Stepper from '../../components/Stepper';
import { kioskApi, type KioskHospital } from '../../api/client';
import { kt } from '../../lib/kioskI18n';

type Step =
  | 'details'
  | 'anatomy'
  | 'interview'
  | 'summary'
  | 'emergency'
  | 'hospitals'
  | 'documents'
  | 'done';

const BANGALORE_DEMO_HOSPITALS: KioskHospital[] = [
  { id: 'H001', name: 'City Heart Hospital', address: '100 Feet Rd, Koramangala, Bengaluru 560034', lat: 12.925, lon: 77.625, rating: 4.5, user_ratings_total: 1210, phone: '+91 80 2550 1001', departments_available: ['cardiology', 'general_medicine'], is_partner: true, distance_km: 3.1 },
  { id: 'H002', name: 'NeuroCare Neurology', address: '100 Ft Road, Halasuru, Indiranagar, Bengaluru 560008', lat: 12.978, lon: 77.64, rating: 4.6, user_ratings_total: 870, phone: '+91 80 2550 1002', departments_available: ['neurology', 'general_medicine'], is_partner: true, distance_km: 4.4 },
  { id: 'H003', name: 'Bone & Joint Institute', address: 'Jayanagar 4th Block, Bengaluru 560011', lat: 12.925, lon: 77.583, rating: 4.3, user_ratings_total: 654, phone: '+91 80 2550 1003', departments_available: ['orthopedics', 'general_medicine'], is_partner: true, distance_km: 5.2 },
  { id: 'H004', name: 'DigestiveCare Clinic', address: 'Whitefield Main Rd, Bengaluru 560066', lat: 12.969, lon: 77.75, rating: 4.2, user_ratings_total: 431, phone: '+91 80 2550 1004', departments_available: ['gastroenterology', 'general_medicine'], is_partner: true, distance_km: 11.7 },
  { id: 'H005', name: "Sunrise Children's Hospital", address: 'Sampige Rd, Malleshwaram, Bengaluru 560003', lat: 13.007, lon: 77.566, rating: 4.4, user_ratings_total: 1022, phone: '+91 80 2550 1005', departments_available: ['pediatrics', 'general_medicine'], is_partner: true, distance_km: 6.8 },
  { id: 'NP-APOLLO', name: 'Apollo Hospitals Sheshadripuram', address: 'Bannerghatta Rd, Bengaluru 560076', lat: 12.894, lon: 77.601, rating: 4.4, user_ratings_total: 8710, phone: '+91 80 2620 4000', is_partner: false, distance_km: 2.4 },
  { id: 'NP-FORTIS', name: 'Fortis Hospital Bannerghatta Road', address: '154/9, Bannerghatta Road, Bengaluru 560076', lat: 12.925, lon: 77.601, rating: 4.3, user_ratings_total: 6320, phone: '+91 80 6621 4444', is_partner: false, distance_km: 4.8 },
  { id: 'NP-MANIPAL', name: 'Manipal Hospital Old Airport Road', address: '98, HAL Old Airport Rd, Kodihalli, Bengaluru 560017', lat: 12.966, lon: 77.656, rating: 4.4, user_ratings_total: 7900, phone: '+91 80 2502 3600', is_partner: false, distance_km: 3.6 },
];

const TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00'];

const LEGACY_TEL = 'tel:108'; // National Emergency Number
const ALTERNATE_TEL = 'tel:112'; // Pan-India Emergency Number

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)) * 10) / 10;
}

export default function AnatomyFlow() {
  const navigate = useNavigate();
  const { language, highContrast, toggleHighContrast } = useUIStore();
  const langCode = language.code;

  const [step, setStep] = useState<Step>('details');
  const [sessionId, setSessionId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [organ, setOrgan] = useState<string | null>(null);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const [hospitals, setHospitals] = useState<KioskHospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<KioskHospital | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [bookingResult, setBookingResult] = useState<{ id: string; message: string } | null>(null);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [showEmergencyHospitals, setShowEmergencyHospitals] = useState(false);

  const rootCls = `min-h-screen ${highContrast ? 'high-contrast' : 'bg-slate-50'}`;

  // Load session ID from sessionStorage
  useEffect(() => {
    const sid = sessionStorage.getItem('kiosk_session_id');
    if (sid) setSessionId(sid);
  }, []);

  const handleDetailsSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;

    if (sessionId) {
      try {
        await kioskApi.patientDetails(sessionId, {
          name: name.trim(),
          age: age ? Number(age) : 0,
          gender: gender || 'other',
          phone: phone.trim(),
        });
      } catch {
        // Backend offline — continue with local state
      }
    }
    setStep('anatomy');
  };

  const handleAnatomySelect = async (part: BodyPart, organSel: string | null) => {
    setBodyPart(part.id);
    setOrgan(organSel);

    if (sessionId) {
      try {
        await kioskApi.selectBodyPart(sessionId, part.id, organSel);
      } catch {
        // Backend offline
      }
    }
    setStep('interview');
  };

  const handleInterviewComplete = useCallback((s: InterviewSummary) => {
    setSummary(s);
    setStep(s.isEmergency ? 'emergency' : 'summary');
  }, []);

  const loadNearby = async (department?: string): Promise<KioskHospital[]> => {
    const bangaloreLat = 12.9716;
    const bangaloreLon = 77.5946;
    try {
      const { data } = await kioskApi.nearbyHospitals(bangaloreLat, bangaloreLon, department);
      return [...data.partners, ...data.non_partners];
    } catch {
      let filtered = BANGALORE_DEMO_HOSPITALS;
      if (department) {
        const dept = department.toLowerCase();
        const matching = filtered.filter((h) =>
          h.departments_available?.some((d) => d.includes(dept) || dept.includes(d))
        );
        if (matching.length > 0) filtered = matching;
      }
      return filtered;
    }
  };

  const proceedToHospitals = async () => {
    setStep('hospitals');
    setLoadingHospitals(true);
    try {
      setHospitals(await loadNearby(summary?.department));
    } finally {
      setLoadingHospitals(false);
    }
  };

  const showEmergencyER = async () => {
    setEmergencyLoading(true);
    setShowEmergencyHospitals(true);
    try {
      const all = await loadNearby();
      const origin = { lat: 12.9716, lon: 77.5946 };
      const sorted = all
        .map((h) => ({
          ...h,
          distance_km: h.distance_km ?? distanceKm(origin, h),
        }))
        .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
        .slice(0, 5);
      setHospitals(sorted);
    } finally {
      setEmergencyLoading(false);
    }
  };

  const handleBookPartner = async (hospital: KioskHospital) => {
    if (!selectedDate || !selectedSlot) return;
    if (sessionId) {
      try {
        const { data } = await kioskApi.bookOpd(
          sessionId,
          hospital.id,
          summary?.department || 'General Medicine',
          selectedDate,
          selectedSlot,
          true,
        );
        setBookingResult({ id: data.booking_id, message: data.message });
        setStep('documents');
        return;
      } catch {
        // Fallback below
      }
    }
    setBookingResult({ id: `OPD-${Date.now()}`, message: 'Booking confirmed (demo mode).' });
    setStep('documents');
  };

  const handleNonPartnerRequest = async (hospital: KioskHospital) => {
    if (!selectedDate || !selectedSlot) return;
    if (sessionId) {
      try {
        const { data } = await kioskApi.externalBookingRequest(
          sessionId,
          hospital.id,
          hospital.name,
          summary?.department || 'General Medicine',
          selectedDate,
          selectedSlot,
          true,
        );
        setBookingResult({ id: data.request_id, message: data.message });
        setStep('documents');
        return;
      } catch {
        // Fallback below
      }
    }
    setBookingResult({ id: `REQ-${Date.now()}`, message: 'Request sent (demo mode).' });
    setStep('documents');
  };

  const hcClass = highContrast ? 'high-contrast' : '';

  const sharedInput =
    'p-4 text-lg border-2 border-blue-500 rounded-xl rounded-xl bg-transparent';

  const renderStep = () => {
    switch (step) {
      case 'details':
        return (
          <div className={`${rootCls} p-6 flex flex-col items-center ${hcClass}`}>
            <h1 className="text-3xl font-bold mb-6 text-slate-900">{kt(langCode, 'tellUsAboutYou')}</h1>
            <div className="flex flex-col gap-4 max-w-sm w-full">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={kt(langCode, 'fullName')}
                className={sharedInput}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={kt(langCode, 'mobileNumber')}
                type="tel"
                className={sharedInput}
              />
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={kt(langCode, 'ageOptional')}
                type="number"
                inputMode="numeric"
                className={sharedInput}
              />
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={sharedInput}
              >
                <option value="">{kt(langCode, 'selectGender')}</option>
                <option value="male">{kt(langCode, 'male')}</option>
                <option value="female">{kt(langCode, 'female')}</option>
                <option value="other">{kt(langCode, 'other')}</option>
              </select>
              <button
                disabled={!name.trim() || !phone.trim()}
                onClick={() => void handleDetailsSubmit()}
                className={`p-5 text-2xl font-bold rounded-xl border-2 border-slate-900 ${
                  name.trim() && phone.trim() ? 'bg-yellow-400 hover:bg-yellow-300 cursor-pointer' : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {kt(langCode, 'continueBtn')}
              </button>
              <button onClick={() => navigate('/kiosk/home')} className="p-3 bg-transparent text-slate-600">
                {kt(langCode, 'backToHome')}
              </button>
            </div>
          </div>
        );

      case 'anatomy':
        return <AnatomyMap onSelect={handleAnatomySelect} language={langCode} />;

      case 'interview':
        return sessionId ? (
          <VoiceInterview
            sessionId={sessionId}
            bodyPart={bodyPart}
            organ={organ}
            language={langCode}
            onComplete={handleInterviewComplete}
          />
        ) : (
          <div className={`${rootCls} flex items-center justify-center ${hcClass}`}>
            <button
              onClick={() => handleInterviewComplete({ summary: 'Demo interview', department: 'General Medicine', isEmergency: false, conversation: [] })}
              className="p-6 text-2xl bg-blue-500 text-white rounded-xl"
            >
              {kt(langCode, 'skipInterviewDemo')}
            </button>
          </div>
        );

      case 'emergency':
        return (
          <div className={`${rootCls} p-6 flex flex-col items-center ${hcClass}`}>
            <div className="max-w-2xl w-full">
              <div className="border-4 border-red-600 rounded-2xl p-8 mb-6 text-center">
                <div className="text-6xl mb-4">🚨</div>
                <h1 className="text-4xl font-bold mb-3 text-red-700">
                  {kt(langCode, 'alertEmergency')}
                </h1>
                <p className="text-2xl text-slate-800">{kt(langCode, 'emergencyVisit')}</p>
                <p className="text-xl mt-3 text-slate-600">{kt(langCode, 'emergencySuggestion')}</p>
              </div>

              <div className="flex flex-col gap-4 mb-6">
                <a
                  href={LEGACY_TEL}
                  className="p-6 text-2xl font-bold rounded-2xl border-4 border-red-600 bg-red-600 hover:bg-red-700 text-white text-center"
                >
                  📞 {kt(langCode, 'callAmbulance')}
                </a>
                <a
                  href={ALTERNATE_TEL}
                  className="p-4 text-xl font-bold rounded-2xl border-4 border-red-600 text-red-700 hover:bg-red-50 text-center"
                >
                  📞 Emergency (112)
                </a>
              </div>

              <button
                onClick={() => void showEmergencyER()}
                className="w-full p-5 text-2xl font-bold rounded-2xl border-4 border-red-600 bg-yellow-400 hover:bg-yellow-300"
              >
                {kt(langCode, 'findNearestER')}
              </button>

              {showEmergencyHospitals && (
                <div className="mt-6">
                  <h2 className="text-2xl font-bold mb-3">{kt(langCode, 'erNote')}</h2>
                  {emergencyLoading ? (
                    <p className="text-lg">{kt(langCode, 'findingHospitals')}</p>
                  ) : hospitals.length === 0 ? (
                    <p className="text-lg">{kt(langCode, 'noEmergHospitals')}</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {hospitals.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between gap-4 p-5 border-4 border-red-600 rounded-2xl"
                        >
                          <div>
                            <div className="text-xl font-bold">{h.name}</div>
                            <div className="text-sm mt-1">
                              {h.distance_km != null && `${h.distance_km} km`}
                              {h.distance_km != null && h.address ? ' · ' : ''}
                              {h.address}
                            </div>
                          </div>
                          {h.phone && (
                            <a
                              href={`tel:${h.phone.replace(/[^+\d]/g, '')}`}
                              className="shrink-0 p-4 text-lg font-bold rounded-xl border-2 border-slate-900 bg-yellow-400 hover:bg-yellow-300"
                            >
                              {kt(langCode, 'callHospital')}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => navigate('/kiosk/home')} className="mt-6 p-3 text-lg bg-transparent text-slate-600">
                {kt(langCode, 'startNewSession')}
              </button>
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className={`${rootCls} p-6 flex flex-col items-center ${hcClass}`}>
            <div className="max-w-xl w-full">
              <h1 className="text-3xl font-bold mb-4 text-slate-900">{kt(langCode, 'yourHealthSummary')}</h1>

              <div className={`p-6 mb-4 rounded-xl border-2 ${hcClass ? 'border-slate-300' : 'bg-slate-50 border-slate-200'}`}>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{kt(langCode, 'departmentLabel')}</h2>
                <p className="text-lg text-blue-600 font-semibold">{summary?.department || 'General Medicine'}</p>
              </div>

              <div className={`p-6 mb-6 rounded-xl border-2 ${hcClass ? 'border-slate-300' : 'bg-slate-50 border-slate-200'}`}>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{kt(langCode, 'summaryLabel')}</h2>
                <p className="text-lg text-slate-700">{summary?.summary || 'No summary available.'}</p>
              </div>

              {summary?.conversation && summary.conversation.length > 0 && (
                <div className={`p-6 mb-6 rounded-xl border-2 ${hcClass ? 'border-slate-300' : 'bg-slate-50 border-slate-200'}`}>
                  <h2 className="text-xl font-bold text-slate-900 mb-3">{kt(langCode, 'conversationLabel')}</h2>
                  <div className="space-y-2">
                    {summary.conversation.map((item, i) => (
                      <div key={i} className="text-sm">
                        <p className="text-blue-600 font-semibold">Q: {item.q}</p>
                        <p className="text-slate-700">A: {item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => void proceedToHospitals()}
                className="w-full p-5 text-2xl font-bold rounded-xl border-2 border-slate-900 bg-yellow-400 hover:bg-yellow-300"
              >
                {kt(langCode, 'findNearbyHospitals')}
              </button>
            </div>
          </div>
        );

      case 'hospitals':
        return (
          <div className={`${rootCls} p-6 ${hcClass}`}>
            <h1 className="text-3xl font-bold mb-2 text-slate-900">{kt(langCode, 'chooseHospital')}</h1>
            <p className="text-lg mb-4 text-slate-500">
              {kt(langCode, 'suggestedDept')}: {summary?.department || 'General Medicine'}
            </p>

            {loadingHospitals ? (
              <div className="text-center py-8">
                <p className="text-lg text-slate-500">{kt(langCode, 'findingHospitals')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-w-xl">
                {hospitals.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHospital(h)}
                    className={`text-left p-5 border-2 rounded-xl transition-colors ${
                      selectedHospital?.id === h.id
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-slate-50 hover:bg-blue-50 border-slate-300 hover:border-blue-500'
                    }`}
                  >
                    <div className="text-xl font-bold text-slate-900">{h.name}</div>
                    <div className="text-sm text-slate-600">{h.address}</div>
                    <div className="flex items-center gap-3 mt-2">
                      {h.rating && <span className="text-sm text-amber-600 font-semibold">★ {h.rating}</span>}
                      <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                        h.is_partner ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {h.is_partner ? kt(langCode, 'partner') : kt(langCode, 'nonPartner')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedHospital && (
              <div className={`mt-6 max-w-xl ${hcClass ? '' : 'bg-white'} border-2 border-blue-500 rounded-xl p-6`}>
                <h2 className="text-xl font-bold text-slate-900 mb-4">{kt(langCode, 'selectDateAndTime')}</h2>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-4 text-lg border-2 border-blue-500 rounded-xl mb-4 bg-transparent"
                />
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 text-lg font-semibold rounded-xl border-2 transition-colors ${
                        selectedSlot === slot
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-transparent text-slate-700 border-slate-300 hover:border-blue-500'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                <button
                  disabled={!selectedDate || !selectedSlot}
                  onClick={() =>
                    selectedHospital.is_partner
                      ? void handleBookPartner(selectedHospital)
                      : void handleNonPartnerRequest(selectedHospital)
                  }
                  className={`w-full p-5 text-xl font-bold rounded-xl border-2 border-slate-900 ${
                    selectedDate && selectedSlot ? 'bg-yellow-400 hover:bg-yellow-300 cursor-pointer' : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  {selectedHospital.is_partner ? kt(langCode, 'bookAppointment') : kt(langCode, 'sendRequest')}
                </button>
              </div>
            )}

            <button onClick={() => setStep('summary')} className="mt-4 p-3 text-lg bg-transparent text-slate-600">
              {kt(langCode, 'backToSummary')}
            </button>
          </div>
        );

      case 'documents':
        return (
          <KioskDocuments
            language={langCode}
            sessionId={sessionId}
            onBack={() => setStep('hospitals')}
            onDone={() => setStep('done')}
          />
        );

      case 'done':
        return (
          <div className={`${rootCls} flex items-center justify-center p-10 ${hcClass}`}>
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">✅</div>
              <h1 className="text-4xl font-bold mb-4 text-slate-900">{kt(langCode, 'allDone')}</h1>
              {bookingResult && (
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 mb-6">
                  <p className="text-lg font-bold text-green-700 mb-2">{bookingResult.id}</p>
                  <p className="text-lg text-slate-700">{bookingResult.message}</p>
                </div>
              )}
              <p className="text-xl text-slate-500 mb-6">{kt(langCode, 'thankYou')}</p>
              <button
                onClick={() => navigate('/kiosk/home')}
                className="p-4 text-xl bg-blue-500 text-white rounded-xl hover:bg-blue-600"
              >
                {kt(langCode, 'startNewSession')}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepIndex = step === 'done' ? 4 : step === 'documents' ? 3 : step === 'details' ? 1 : 2;

  return (
    <div className={`min-h-screen ${highContrast ? 'high-contrast' : 'bg-slate-50'}`}>
      <button
        onClick={toggleHighContrast}
        aria-pressed={highContrast}
        className="fixed top-4 right-4 z-50 px-4 py-2 text-sm font-bold border-2 border-slate-400 rounded-xl"
      >
        {highContrast ? 'AA' : 'A'}
      </button>
      <Stepper
        steps={[
          { label: kt(langCode, 'stepperLanguage') },
          { label: kt(langCode, 'stepperBasicDetails') },
          { label: kt(langCode, 'stepperHealthCheck') },
          { label: kt(langCode, 'stepperDocuments') },
          { label: kt(langCode, 'stepperDone') },
        ]}
        current={stepIndex}
      />
      {renderStep()}
    </div>
  );
}