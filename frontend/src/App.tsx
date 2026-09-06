import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from './components/shared/LoadingSpinner';
import { useAuthStore } from './stores/authStore';
import Toast from './components/shared/Toast';
import PageViewTracker from './components/shared/PageViewTracker';
import { installHistoryListener, initLoaderState, recordRoutePath } from './lib/navigationController';
import { ROUTE_META, applyPageMeta, type PageMeta } from './hooks/usePageMeta';

// Landing (eager — first paint)
import LandingPage from './pages/LandingPage';

// Kiosk Pages (lazy — only downloaded when the walk-up flow starts)
const KioskHome = React.lazy(() => import('./pages/kiosk/Home'));
const KioskLanguageSelect = React.lazy(() => import('./pages/kiosk/LanguageSelect'));
const KioskIdentification = React.lazy(() => import('./pages/kiosk/Identification'));
const KioskConsent = React.lazy(() => import('./pages/kiosk/Consent'));
const KioskInterview = React.lazy(() => import('./pages/kiosk/Interview'));
const KioskBodyMap = React.lazy(() => import('./pages/kiosk/BodyMap'));
const KioskDocumentUpload = React.lazy(() => import('./pages/kiosk/DocumentUpload'));
const KioskSummary = React.lazy(() => import('./pages/kiosk/Summary'));
const KioskAyush = React.lazy(() => import('./pages/kiosk/AyushAssessment'));
const KioskEmergency = React.lazy(() => import('./pages/kiosk/EmergencyDemo'));

// Lazy Auth Pages
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/auth/RegisterPage'));
const UnauthorizedPage = React.lazy(() => import('./pages/auth/UnauthorizedPage'));

// Lazy Legal / Marketing Pages
const PrivacyPolicy = React.lazy(() => import('./pages/landing/PrivacyPolicy'));
const TermsPage = React.lazy(() => import('./pages/landing/Terms'));

// Lazy Patient Portal
const PatientDashboard = React.lazy(() => import('./pages/patient/Dashboard'));
const BookOPD = React.lazy(() => import('./pages/patient/BookOPD'));
const MyVisits = React.lazy(() => import('./pages/patient/MyVisits'));
const HealthTimeline = React.lazy(() => import('./pages/patient/HealthTimeline'));
const DocumentsVault = React.lazy(() => import('./pages/patient/DocumentsVault'));
const PatientProfile = React.lazy(() => import('./pages/patient/Profile'));
const PatientKiosk = React.lazy(() => import('./pages/patient/KioskMode'));

// Lazy Hospital Admin Portal
const HospitalDashboard = React.lazy(() => import('./pages/hospital/Dashboard'));
const TodaysOPD = React.lazy(() => import('./pages/hospital/TodaysOPD'));
const Triage = React.lazy(() => import('./pages/hospital/Triage'));
const QueueManagement = React.lazy(() => import('./pages/hospital/QueueManagement'));
const DoctorManagement = React.lazy(() => import('./pages/hospital/DoctorManagement'));
const DepartmentManagement = React.lazy(() => import('./pages/hospital/DepartmentManagement'));
const VitalsMonitor = React.lazy(() => import('./pages/hospital/VitalsMonitor'));
const DataRetentionManager = React.lazy(() => import('./pages/hospital/DataRetentionManager'));

// Lazy Doctor Portal
const DoctorDashboard = React.lazy(() => import('./pages/doctor/Dashboard'));
const DoctorPatientQueue = React.lazy(() => import('./pages/doctor/PatientQueue'));
const PatientCard = React.lazy(() => import('./pages/doctor/PatientCard'));
const DoctorSchedule = React.lazy(() => import('./pages/doctor/Schedule'));
const DoctorQrScan = React.lazy(() => import('./pages/doctor/QrScan'));
const DoctorOcrReview = React.lazy(() => import('./pages/doctor/OcrReview'));

// Lazy Legacy Dashboards (orphaned from the RBAC system; guarded below)
const PhysicianDashboard = React.lazy(() => import('./pages/physician/Dashboard'));
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>}>
    {children}
  </Suspense>
);

function ProtectedRoute({ allowedRoles, children }: { allowedRoles?: string[]; children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// "/" always shows the marketing/landing page (with its Preloader). Navigate
// to a portal via the auth store's role redirect (see Nav / LoginPage).
function RouteMetaManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const exact = ROUTE_META[pathname];
    if (exact) {
      applyPageMeta(exact);
      return;
    }
    // Dynamic segments — match the longest static prefix (e.g. /doctor/patient/123).
    const segments = pathname.split('/');
    let meta: PageMeta | undefined;
    for (let i = segments.length; i >= 1; i--) {
      const candidate = segments.slice(0, i).join('/') || '/';
      const hit = ROUTE_META[candidate];
      if (hit) {
        meta = hit;
        break;
      }
    }
    applyPageMeta(meta ?? { title: 'MediKiosk — AI-Powered Patient Intake' });
    recordRoutePath(pathname);
  }, [pathname]);

  return null;
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
    // History-state loader protocol: tag the entry + arm back-button replays.
    initLoaderState('content');
    const disposeHistory = installHistoryListener();
    return () => disposeHistory();
  }, [initialize]);

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900 font-sans">
      <RouteMetaManager />
      <PageViewTracker />
      <Toast />
      <Routes>
        {/* Landing / home */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth Routes */}
        <Route path="/login" element={<SuspenseWrapper><LoginPage /></SuspenseWrapper>} />
        <Route path="/register" element={<SuspenseWrapper><RegisterPage /></SuspenseWrapper>} />
        <Route path="/unauthorized" element={<SuspenseWrapper><UnauthorizedPage /></SuspenseWrapper>} />

        {/* Legal / Marketing Pages */}
        <Route path="/privacy-policy" element={<SuspenseWrapper><PrivacyPolicy /></SuspenseWrapper>} />
        <Route path="/terms" element={<SuspenseWrapper><TermsPage /></SuspenseWrapper>} />

        {/* Kiosk Patient Flow */}
        <Route path="/kiosk" element={<Navigate to="/kiosk/home" replace />} />
        <Route path="/kiosk/home" element={<SuspenseWrapper><KioskHome /></SuspenseWrapper>} />
        <Route path="/kiosk/language" element={<SuspenseWrapper><KioskLanguageSelect /></SuspenseWrapper>} />
        <Route path="/kiosk/identify" element={<SuspenseWrapper><KioskIdentification /></SuspenseWrapper>} />
        <Route path="/kiosk/consent" element={<SuspenseWrapper><KioskConsent /></SuspenseWrapper>} />
        <Route path="/kiosk/body-map" element={<SuspenseWrapper><KioskBodyMap /></SuspenseWrapper>} />
        <Route path="/kiosk/interview" element={<SuspenseWrapper><KioskInterview /></SuspenseWrapper>} />
        <Route path="/kiosk/ayush" element={<SuspenseWrapper><KioskAyush /></SuspenseWrapper>} />
        <Route path="/kiosk/emergency" element={<SuspenseWrapper><KioskEmergency /></SuspenseWrapper>} />
        <Route path="/kiosk/documents" element={<SuspenseWrapper><KioskDocumentUpload /></SuspenseWrapper>} />
        <Route path="/kiosk/summary" element={<SuspenseWrapper><KioskSummary /></SuspenseWrapper>} />

        {/* Patient Portal */}
        <Route path="/patient" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <SuspenseWrapper><PatientDashboard /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/patient/dashboard" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <SuspenseWrapper><PatientDashboard /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/patient/book-opd" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <SuspenseWrapper><BookOPD /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/patient/visits" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <SuspenseWrapper><MyVisits /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/patient/health-timeline" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <SuspenseWrapper><HealthTimeline /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/patient/documents" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <SuspenseWrapper><DocumentsVault /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/patient/profile" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <SuspenseWrapper><PatientProfile /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        {/* Authenticated patient kiosk (voice-first, auto-timeout) */}
        <Route path="/patient/kiosk" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <SuspenseWrapper><PatientKiosk /></SuspenseWrapper>
          </ProtectedRoute>
        } />

        {/* Hospital Admin Portal */}
        <Route path="/hospital" element={
          <ProtectedRoute allowedRoles={['hospital_admin']}>
            <SuspenseWrapper><HospitalDashboard /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/hospital/dashboard" element={
          <ProtectedRoute allowedRoles={['hospital_admin']}>
            <SuspenseWrapper><HospitalDashboard /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/hospital/opd" element={
          <ProtectedRoute allowedRoles={['hospital_admin']}>
            <SuspenseWrapper><TodaysOPD /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/hospital/triage" element={
          <ProtectedRoute allowedRoles={['hospital_admin']}>
            <SuspenseWrapper><Triage /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/hospital/queue" element={
          <ProtectedRoute allowedRoles={['hospital_admin']}>
            <SuspenseWrapper><QueueManagement /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/hospital/doctors" element={
          <ProtectedRoute allowedRoles={['hospital_admin']}>
            <SuspenseWrapper><DoctorManagement /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/hospital/departments" element={
          <ProtectedRoute allowedRoles={['hospital_admin']}>
            <SuspenseWrapper><DepartmentManagement /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/hospital/vitals" element={
          <ProtectedRoute allowedRoles={['hospital_admin', 'doctor']}>
            <SuspenseWrapper><VitalsMonitor /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/hospital/data-retention" element={
          <ProtectedRoute allowedRoles={['hospital_admin']}>
            <SuspenseWrapper><DataRetentionManager /></SuspenseWrapper>
          </ProtectedRoute>
        } />

        {/* Doctor Portal */}
        <Route path="/doctor" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <SuspenseWrapper><DoctorDashboard /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/doctor/dashboard" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <SuspenseWrapper><DoctorDashboard /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/doctor/queue" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <SuspenseWrapper><DoctorPatientQueue /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/doctor/patient/:id" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <SuspenseWrapper><PatientCard /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/doctor/schedule" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <SuspenseWrapper><DoctorSchedule /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/doctor/scan-qr" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <SuspenseWrapper><DoctorQrScan /></SuspenseWrapper>
          </ProtectedRoute>
        } />
        <Route path="/doctor/ocr" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <SuspenseWrapper><DoctorOcrReview /></SuspenseWrapper>
          </ProtectedRoute>
        } />

        {/* Legacy /physician/* — no such role exists in the auth system; block everyone */}
        <Route path="/physician/*" element={
          <ProtectedRoute allowedRoles={['physician']}>
            <SuspenseWrapper><PhysicianDashboard /></SuspenseWrapper>
          </ProtectedRoute>
        } />

        {/* Legacy /admin/* — no such role exists in the auth system; block everyone */}
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <SuspenseWrapper><AdminDashboard /></SuspenseWrapper>
          </ProtectedRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
