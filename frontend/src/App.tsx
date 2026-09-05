import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from './components/shared/LoadingSpinner';
import { useAuthStore } from './stores/authStore';
import Toast from './components/shared/Toast';

// Kiosk Pages (eager)
import LandingPage from './pages/LandingPage';
import KioskHome from './pages/kiosk/Home';
import KioskLanguageSelect from './pages/kiosk/LanguageSelect';
import KioskIdentification from './pages/kiosk/Identification';
import KioskConsent from './pages/kiosk/Consent';
import KioskInterview from './pages/kiosk/Interview';
import KioskBodyMap from './pages/kiosk/BodyMap';
import KioskDocumentUpload from './pages/kiosk/DocumentUpload';
import KioskSummary from './pages/kiosk/Summary';
import KioskAyush from './pages/kiosk/AyushAssessment';
import KioskEmergency from './pages/kiosk/EmergencyDemo';
import PhysicianDashboard from './pages/physician/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';

// Lazy Auth Pages
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/auth/RegisterPage'));
const UnauthorizedPage = React.lazy(() => import('./pages/auth/UnauthorizedPage'));

// Lazy Patient Portal
const PatientDashboard = React.lazy(() => import('./pages/patient/Dashboard'));
const BookOPD = React.lazy(() => import('./pages/patient/BookOPD'));
const MyVisits = React.lazy(() => import('./pages/patient/MyVisits'));
const HealthTimeline = React.lazy(() => import('./pages/patient/HealthTimeline'));
const DocumentsVault = React.lazy(() => import('./pages/patient/DocumentsVault'));
const PatientProfile = React.lazy(() => import('./pages/patient/Profile'));

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

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900 font-sans">
      <Toast />
      <Routes>
        {/* Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth Routes */}
        <Route path="/login" element={<SuspenseWrapper><LoginPage /></SuspenseWrapper>} />
        <Route path="/register" element={<SuspenseWrapper><RegisterPage /></SuspenseWrapper>} />
        <Route path="/unauthorized" element={<SuspenseWrapper><UnauthorizedPage /></SuspenseWrapper>} />

        {/* Kiosk Patient Flow */}
        <Route path="/kiosk" element={<Navigate to="/kiosk/home" replace />} />
        <Route path="/kiosk/home" element={<KioskHome />} />
        <Route path="/kiosk/language" element={<KioskLanguageSelect />} />
        <Route path="/kiosk/identify" element={<KioskIdentification />} />
        <Route path="/kiosk/consent" element={<KioskConsent />} />
        <Route path="/kiosk/body-map" element={<KioskBodyMap />} />
        <Route path="/kiosk/interview" element={<KioskInterview />} />
        <Route path="/kiosk/ayush" element={<KioskAyush />} />
        <Route path="/kiosk/emergency" element={<KioskEmergency />} />
        <Route path="/kiosk/documents" element={<KioskDocumentUpload />} />
        <Route path="/kiosk/summary" element={<KioskSummary />} />

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

        {/* Physician Dashboard (legacy) */}
        <Route path="/physician/*" element={<PhysicianDashboard />} />

        {/* Admin Dashboard (legacy) */}
        <Route path="/admin/*" element={<AdminDashboard />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
