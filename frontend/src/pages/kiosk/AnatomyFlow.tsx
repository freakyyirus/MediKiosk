import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardList, MapPin, Phone, CalendarDays, Star, CheckCircle2 } from 'lucide-react';
import { useUIStore } from '../../stores';
import AnatomyMap, { type BodyPart } from '../../components/kiosk/AnatomyMap';
import Interview, { type InterviewResult } from './Interview';
import KioskConsent from '../../components/kiosk/KioskConsent';
import KioskDocuments from '../../components/kiosk/KioskDocuments';
import Stepper from '../../components/Stepper';
import { kioskApi, type KioskHospital } from '../../api/client';
import { kt } from '../../lib/kioskI18n';

type Step =
  | 'details'
  | 'consent'
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
  const [summary, setSummary] = useState<InterviewResult | null>(null);
  const [hospitals, setHospitals] = useState<KioskHospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<KioskHospital | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [bookingResult, setBookingResult] = useState<{ id: string; message: string } | null>(null);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [showEmergencyHospitals, setShowEmergencyHospitals] = useState(false);

  const rootCls = `min-h-screen mesh-bg ${highContrast ? 'high-contrast' : ''}`;

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
    setStep('consent');
  };

  const handleAnatomySelect = async (part: BodyPart, organSel: string | null) => {
    setBodyPart(part.id);

    if (sessionId) {
      try {
        await kioskApi.selectBodyPart(sessionId, part.id, organSel);
      } catch {
        // Backend offline
      }
    }
    setStep('interview');
  };

  const handleInterviewComplete = useCallback((s: InterviewResult) => {
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

  const tt = (hi: string, en: string) => (langCode === 'hi' ? hi : en);

  const sharedInput =
    'w-full bg-white border-2 border-surface-200 rounded-2xl px-5 py-4 text-lg font-medium text-surface-900 placeholder-surface-400 focus:outline-none focus:border-primary-500 transition-colors';

  const renderStep = () => {
    switch (step) {
      case 'details':
        return (
          <div className={`${rootCls} p-6 flex flex-col items-center ${hcClass}`}>
            <div className="w-16 h-16 rounded-[22px] bg-primary-100 border border-primary-200 flex items-center justify-center mb-5">
              <ClipboardList className="w-8 h-8 text-primary-700" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-surface-900">{kt(langCode, 'tellUsAboutYou')}</h1>
            <p className="text-lg text-surface-500 mb-6">{tt('कुछ बुनियादी जानकारी।', 'Just a few basic details to begin.')}</p>
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
                className={`touch-target p-5 text-2xl font-bold rounded-2xl flex items-center justify-center gap-3 transition-all ${
                  name.trim() && phone.trim()
                    ? 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 text-white cursor-pointer shadow-lg shadow-primary-600/25'
                    : 'bg-surface-200 text-surface-400 cursor-not-allowed'
                }`}
              >
                {kt(langCode, 'continueBtn')} <ChevronRight className="w-6 h-6" />
              </button>
              <button onClick={() => navigate('/kiosk/home')} className="p-3 bg-transparent text-surface-500 font-medium">
                {kt(langCode, 'backToHome')}
              </button>
            </div>
          </div>
        );

      case 'consent':
        return (
          <div className={`${rootCls} ${hcClass}`}>
            <KioskConsent
              sessionId={sessionId}
              language={langCode}
              onComplete={() => setStep('anatomy')}
              onBack={() => setStep('details')}
            />
          </div>
        );

      case 'anatomy':
        return <AnatomyMap onSelect={handleAnatomySelect} language={langCode} />;

      case 'interview':
        return (
          <Interview
            bodyPart={bodyPart}
            onComplete={handleInterviewComplete}
            onBack={() => setStep('anatomy')}
          />
        );

      case 'emergency':
        return (
          <div className={`${rootCls} p-6 flex flex-col items-center ${hcClass}`}>
            <div className="max-w-2xl w-full">
              <div className="card border-danger-300 bg-danger-50/60 rounded-2xl p-8 mb-6 text-center">
                <div className="text-6xl mb-4">🚨</div>
                <h1 className="text-4xl font-bold mb-3 text-danger-700">
                  {kt(langCode, 'alertEmergency')}
                </h1>
                <p className="text-2xl text-surface-800">{kt(langCode, 'emergencyVisit')}</p>
                <p className="text-xl mt-3 text-surface-600">{kt(langCode, 'emergencySuggestion')}</p>
              </div>

              <div className="flex flex-col gap-4 mb-6">
                <a
                  href={LEGACY_TEL}
                  className="p-6 text-2xl font-bold rounded-2xl bg-danger-600 hover:bg-danger-700 text-white text-center shadow-lg shadow-danger-600/25"
                >
                  📞 {kt(langCode, 'callAmbulance')}
                </a>
                <a
                  href={ALTERNATE_TEL}
                  className="p-4 text-xl font-bold rounded-2xl border-2 border-danger-400 text-danger-700 hover:bg-danger-50 text-center"
                >
                  📞 Emergency (112)
                </a>
              </div>

              <button
                onClick={() => void showEmergencyER()}
                className="touch-target w-full p-5 text-2xl font-bold rounded-2xl bg-gradient-to-r from-warning-500 to-warning-400 hover:from-warning-600 text-white shadow-lg shadow-warning-500/25"
              >
                {kt(langCode, 'findNearestER')}
              </button>

              {showEmergencyHospitals && (
                <div className="mt-6">
                  <h2 className="text-2xl font-bold mb-3 text-surface-900">{kt(langCode, 'erNote')}</h2>
                  {emergencyLoading ? (
                    <p className="text-lg text-surface-500">{kt(langCode, 'findingHospitals')}</p>
                  ) : hospitals.length === 0 ? (
                    <p className="text-lg text-surface-500">{kt(langCode, 'noEmergHospitals')}</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {hospitals.map((h) => (
                        <div
                          key={h.id}
                          className="card flex items-center justify-between gap-4 p-5 rounded-2xl"
                        >
                          <div>
                            <div className="text-xl font-bold text-surface-900">{h.name}</div>
                            <div className="text-sm mt-1 text-surface-500">
                              {h.distance_km != null && `${h.distance_km} km`}
                              {h.distance_km != null && h.address ? ' · ' : ''}
                              {h.address}
                            </div>
                          </div>
                          {h.phone && (
                            <a
                              href={`tel:${h.phone.replace(/[^+\d]/g, '')}`}
                              className="shrink-0 p-4 text-lg font-bold rounded-2xl bg-danger-600 hover:bg-danger-700 text-white shadow-md shadow-danger-600/20"
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

              <button onClick={() => navigate('/kiosk/home')} className="mt-6 p-3 text-lg text-surface-500 font-medium">
                {kt(langCode, 'startNewSession')}
              </button>
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className={`${rootCls} p-6 flex flex-col items-center ${hcClass}`}>
            <div className="max-w-xl w-full">
              <div className="text-center pb-6">
                <div className="w-16 h-16 rounded-[22px] bg-primary-100 border border-primary-200 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-primary-700" />
                </div>
                <h1 className="text-3xl font-bold text-surface-900">{kt(langCode, 'yourHealthSummary')}</h1>
                <p className="text-lg text-surface-500 mt-2">{tt('यह आपका स्वास्थ्य सारांश है।', 'Here is your health summary.')}</p>
              </div>

              <div className="card rounded-2xl p-6 mb-4">
                <h2 className="text-xl font-bold text-surface-900 mb-2">{kt(langCode, 'departmentLabel')}</h2>
                <p className="text-lg text-primary-600 font-semibold">{summary?.department || tt('सामान्य चिकित्सा', 'General Medicine')}</p>
              </div>

              <div className="card rounded-2xl p-6 mb-6">
                <h2 className="text-xl font-bold text-surface-900 mb-2">{kt(langCode, 'summaryLabel')}</h2>
                <p className="text-lg text-surface-700 leading-relaxed">{summary?.summary || tt('कोई सारांश उपलब्ध नहीं।', 'No summary available.')}</p>
              </div>

              {summary?.conversation && summary.conversation.length > 0 && (
                <div className="card rounded-2xl p-6 mb-6">
                  <h2 className="text-xl font-bold text-surface-900 mb-3">{kt(langCode, 'conversationLabel')}</h2>
                  <div className="space-y-2">
                    {summary.conversation.map((item, i) => (
                      <div key={i} className="text-base">
                        <p className="text-primary-700 font-semibold">Q: {item.q}</p>
                        <p className="text-surface-600">A: {item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => void proceedToHospitals()}
                className="touch-target w-full p-5 text-2xl font-bold rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 text-white flex items-center justify-center gap-3 shadow-lg shadow-primary-600/25"
              >
                {kt(langCode, 'findNearbyHospitals')} <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        );

      case 'hospitals':
        return (
          <div className={`${rootCls} p-6 ${hcClass}`}>
            <h1 className="text-3xl font-bold mb-2 text-surface-900">{kt(langCode, 'chooseHospital')}</h1>
            <p className="text-lg mb-4 text-surface-500">
              {kt(langCode, 'suggestedDept')}: {summary?.department || tt('सामान्य चिकित्सा', 'General Medicine')}
            </p>

            {loadingHospitals ? (
              <div className="text-center py-8">
                <p className="text-lg text-surface-500">{kt(langCode, 'findingHospitals')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-w-xl">
                {hospitals.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHospital(h)}
                    className={`card text-left p-5 rounded-2xl transition-all ${
                      selectedHospital?.id === h.id
                        ? 'border-primary-500 bg-primary-50/50 shadow-md'
                        : 'hover:border-primary-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-xl font-bold text-surface-900">{h.name}</div>
                    <div className="flex items-start gap-1.5 text-sm text-surface-500 mt-1">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" /> <span>{h.address}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {h.rating && (
                        <span className="flex items-center gap-1 text-sm text-amber-600 font-semibold">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {h.rating}
                        </span>
                      )}
                      {h.phone && (
                        <span className="flex items-center gap-1 text-sm text-surface-500">
                          <Phone className="w-4 h-4" /> {h.phone}
                        </span>
                      )}
                      <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                        h.is_partner ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
                      }`}>
                        {h.is_partner ? kt(langCode, 'partner') : kt(langCode, 'nonPartner')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedHospital && (
              <div className="card mt-6 max-w-xl rounded-2xl p-6 border-primary-200">
                <h2 className="text-xl font-bold text-surface-900 mb-4">{kt(langCode, 'selectDateAndTime')}</h2>
                <div className="flex items-center gap-2 text-surface-500 mb-2">
                  <CalendarDays className="w-5 h-5 text-primary-600" />
                  <span className="text-base">{tt('तारीख चुनें', 'Select a date')}</span>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full p-4 text-lg border-2 border-surface-200 rounded-2xl mb-4 bg-white focus:border-primary-500 focus:outline-none ${hcClass ? 'text-slate-900' : 'text-surface-900'}`}
                />
                <p className="text-base text-surface-500 mb-2">{tt('समय चुनें', 'Select a time slot')}</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 text-lg font-semibold rounded-2xl border-2 transition-colors ${
                        selectedSlot === slot
                          ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/25'
                          : 'bg-white text-surface-700 border-surface-200 hover:border-primary-400'
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
                  className={`touch-target w-full p-5 text-xl font-bold rounded-2xl flex items-center justify-center gap-2 transition-all ${
                    selectedDate && selectedSlot
                      ? 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 text-white cursor-pointer shadow-lg shadow-primary-600/25'
                      : 'bg-surface-200 text-surface-400 cursor-not-allowed'
                  }`}
                >
                  {selectedHospital.is_partner ? kt(langCode, 'bookAppointment') : kt(langCode, 'sendRequest')}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            <button onClick={() => setStep('summary')} className="mt-4 p-3 text-lg text-surface-500 font-medium flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" /> {kt(langCode, 'backToSummary')}
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
              <div className="w-20 h-20 rounded-[26px] bg-success-100 border border-success-200 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-11 h-11 text-success-600" />
              </div>
              <h1 className="text-4xl font-bold mb-4 text-surface-900">{kt(langCode, 'allDone')}</h1>
              {bookingResult && (
                <div className="card border-success-200 bg-success-50/50 rounded-2xl p-6 mb-6">
                  <p className="text-lg font-bold text-success-700 mb-2">{bookingResult.id}</p>
                  <p className="text-lg text-surface-700">{bookingResult.message}</p>
                </div>
              )}
              <p className="text-xl text-surface-500 mb-6">{kt(langCode, 'thankYou')}</p>
              <button
                onClick={() => navigate('/kiosk/home')}
                className="touch-target w-full p-4 text-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 text-white rounded-2xl shadow-lg shadow-primary-600/25"
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

  const stepIndex = step === 'done' ? 4 : step === 'documents' ? 3 : step === 'details' || step === 'consent' ? 1 : 2;

  if (step === 'interview') {
    return renderStep();
  }

  return (
    <div className={`min-h-screen mesh-bg ${highContrast ? 'high-contrast' : ''}`}>
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