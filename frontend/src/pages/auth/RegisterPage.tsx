import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, User, Phone, Activity,
  Building2, Stethoscope, ArrowRight, ArrowLeft, Check,
  Calendar, MapPin, FileText, GraduationCap, CreditCard,
} from 'lucide-react';
import { useAuthStore, getRoleRedirect } from '../../stores/authStore';
import type { UserRole } from '../../stores/authStore';
import { isClerkConfigured, waitForClerk } from '../../lib/clerk';
import { useToastStore } from '../../components/shared/Toast';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import Select from '../../components/shared/Select';
import Logo from '../../components/brand/Logo';

const steps = ['Account', 'Profile', 'Confirm'];

const clerkEnabled = isClerkConfigured();

interface ClerkSignUpLike {
  create: (p: {
    emailAddress: string;
    password: string;
    firstName: string;
    publicMetadata: Record<string, unknown>;
  }) => Promise<{ status: string; createdSessionId?: string | null }>;
  prepareEmailAddressVerification: (p: { strategy: 'email_code' }) => Promise<unknown>;
  attemptEmailAddressVerification: (p: { code: string }) => Promise<{ status: string; createdSessionId?: string | null }>;
}

const getClerkAuth = () =>
  window.Clerk as unknown as { signUp?: ClerkSignUpLike; setActive?: (p: { session?: string | null }) => Promise<unknown> } | undefined;

const roleOptions: { value: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'patient', label: 'Patient', icon: <User size={24} />, desc: 'Access health records & appointments' },
  { value: 'hospital_admin', label: 'Hospital Admin', icon: <Building2 size={24} />, desc: 'Manage hospital operations' },
  { value: 'doctor', label: 'Doctor', icon: <Stethoscope size={24} />, desc: 'Clinical workflow & patient management' },
];

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const bloodGroupOptions = [
  { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, isLoading } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: '' as UserRole | '',
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    hospital_name: '',
    hospital_address: '',
    hospital_phone: '',
    registration_number: '',
    qualification: '',
    specialization: '',
    license_number: '',
    hospital_id: '',
  });

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    const r = searchParams.get('role');
    if (r === 'patient' || r === 'hospital_admin' || r === 'doctor') {
      update('role', r);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.role) errs.role = 'Please select a role';
    if (!form.email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Minimum 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name) errs.full_name = 'Full name is required';
    if (!form.phone) errs.phone = 'Phone is required';

    if (form.role === 'doctor') {
      if (!form.qualification) errs.qualification = 'Required';
      if (!form.specialization) errs.specialization = 'Required';
      if (!form.license_number) errs.license_number = 'Required';
    }
    if (form.role === 'hospital_admin') {
      if (!form.hospital_name) errs.hospital_name = 'Required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const completeAuth = async (sessionId?: string | null) => {
    const clerk = getClerkAuth();
    if (clerk?.setActive && sessionId) {
      await clerk.setActive({ session: sessionId });
    }
    await useAuthStore.getState().fetchUser();
    const { user } = useAuthStore.getState() as unknown as { user?: { role?: string } | null };
    if (user?.role) navigate(getRoleRedirect(user.role as UserRole));
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setVerifyingCode(true);
    try {
      if (!(await waitForClerk())) {
        addToast('error', 'Clerk is still loading — please wait a moment and try again.');
        return;
      }
      const clerk = getClerkAuth();
      if (!clerk?.signUp) throw new Error('Clerk sign-up unavailable');
      const res = await clerk.signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (res.status === 'complete') {
        addToast('success', 'Account verified successfully!');
        await completeAuth(res.createdSessionId);
      } else {
        addToast('error', 'Verification incomplete. Check the code and try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Verification failed. Please try again.';
      addToast('error', message);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (clerkEnabled) {
        if (!(await waitForClerk())) {
          addToast('error', 'Clerk is still loading — please wait a moment and try again.');
          return;
        }
        const clerk = getClerkAuth();
        if (!clerk?.signUp) throw new Error('Clerk sign-up is not loaded yet — refresh and retry.');
        const result = await clerk.signUp.create({
          emailAddress: form.email,
          password: form.password,
          firstName: form.full_name || form.email,
          publicMetadata: { role: form.role },
        });

        if (result.status === 'complete') {
          addToast('success', 'Account created successfully!');
          await completeAuth(result.createdSessionId);
        } else {
          await clerk.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          setAwaitingCode(true);
          addToast('info', 'We emailed you a 6-digit verification code.');
        }
        return;
      }

      await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone,
        role: form.role as UserRole,
        ...(form.role === 'patient' && {
          date_of_birth: form.date_of_birth,
          gender: form.gender,
          blood_group: form.blood_group,
          address: form.address,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_phone: form.emergency_contact_phone,
        }),
        ...(form.role === 'hospital_admin' && {
          hospital_name: form.hospital_name,
          hospital_address: form.hospital_address,
          hospital_phone: form.hospital_phone,
          registration_number: form.registration_number,
        }),
        ...(form.role === 'doctor' && {
          qualification: form.qualification,
          specialization: form.specialization,
          license_number: form.license_number,
          hospital_id: form.hospital_id,
        }),
      });

      addToast('success', 'Account created successfully!');
      const { user } = useAuthStore.getState();
      if (user?.role) {
        navigate(getRoleRedirect(user.role));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      addToast('error', message);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo size={42} variant="gradient" />
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-0">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`step-dot ${
                      i + 1 === step ? 'active' : i + 1 < step ? 'done' : 'upcoming'
                    }`}
                  >
                    {i + 1 < step ? <Check size={14} /> : i + 1}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:inline ${
                      i + 1 === step ? 'text-primary-700' : 'text-surface-400'
                    }`}
                  >
                    {s}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`step-line ${i + 1 < step ? 'done' : 'upcoming'} mx-3`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8">
          {awaitingCode ? (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-surface-900">Verify your email</h2>
                <p className="text-surface-500 text-sm mt-1">
                  Enter the 6-digit code we emailed to <span className="font-semibold text-surface-700">{form.email}</span>
                </p>
              </div>
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <Input
                  label="Verification Code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  icon={<Mail size={18} />}
                  required
                />
                <Button type="submit" className="w-full" size="lg" loading={verifyingCode} icon={<Check size={16} />}>
                  Verify & Create Account
                </Button>
              </form>
              <button
                type="button"
                onClick={() => setAwaitingCode(false)}
                className="text-sm text-surface-500 hover:text-surface-700 font-medium"
              >
                Back to form
              </button>
            </div>
          ) : (
          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            {/* Step 1: Account */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-surface-900">Create your account</h2>
                  <p className="text-surface-500 text-sm mt-1">Choose your role and enter credentials</p>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-3">I am a...</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {roleOptions.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => update('role', r.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          form.role === r.value
                            ? 'border-primary-500 bg-primary-50 shadow-sm'
                            : 'border-surface-200 hover:border-surface-300 bg-white'
                        }`}
                      >
                        <div className={`mb-2 ${form.role === r.value ? 'text-primary-600' : 'text-surface-400'}`}>
                          {r.icon}
                        </div>
                        <p className={`text-sm font-semibold ${form.role === r.value ? 'text-primary-700' : 'text-surface-800'}`}>
                          {r.label}
                        </p>
                        <p className="text-xs text-surface-400 mt-0.5">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                  {errors.role && <p className="text-sm text-danger-600 mt-1">{errors.role}</p>}
                </div>

                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  error={errors.email}
                  icon={<Mail size={18} />}
                  required
                />

                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    error={errors.password}
                    icon={<Lock size={18} />}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-surface-400 hover:text-surface-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  error={errors.confirmPassword}
                  icon={<Lock size={18} />}
                  required
                />
              </div>
            )}

            {/* Step 2: Profile Details */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-surface-900">Profile Details</h2>
                  <p className="text-surface-500 text-sm mt-1">
                    {form.role === 'patient' && 'Tell us about yourself'}
                    {form.role === 'hospital_admin' && 'Hospital information'}
                    {form.role === 'doctor' && 'Professional details'}
                  </p>
                </div>

                <Input
                  label="Full Name"
                  placeholder="Enter your full name"
                  value={form.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  error={errors.full_name}
                  icon={<User size={18} />}
                  required
                />

                <Input
                  label="Phone"
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  error={errors.phone}
                  icon={<Phone size={18} />}
                  required
                />

                {/* Patient Fields */}
                {form.role === 'patient' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Date of Birth"
                        type="date"
                        value={form.date_of_birth}
                        onChange={(e) => update('date_of_birth', e.target.value)}
                        icon={<Calendar size={18} />}
                      />
                      <Select
                        label="Gender"
                        options={genderOptions}
                        value={form.gender}
                        onChange={(v) => update('gender', v)}
                        placeholder="Select gender"
                      />
                    </div>
                    <Select
                      label="Blood Group"
                      options={bloodGroupOptions}
                      value={form.blood_group}
                      onChange={(v) => update('blood_group', v)}
                      placeholder="Select blood group"
                    />
                    <Input
                      label="Address"
                      placeholder="Full address"
                      value={form.address}
                      onChange={(e) => update('address', e.target.value)}
                      icon={<MapPin size={18} />}
                    />
                    <div className="border-t border-surface-200 pt-4 mt-4">
                      <p className="text-sm font-semibold text-surface-700 mb-3">Emergency Contact</p>
                      <div className="space-y-4">
                        <Input
                          label="Contact Name"
                          placeholder="Name"
                          value={form.emergency_contact_name}
                          onChange={(e) => update('emergency_contact_name', e.target.value)}
                          icon={<User size={18} />}
                        />
                        <Input
                          label="Contact Phone"
                          type="tel"
                          placeholder="Phone number"
                          value={form.emergency_contact_phone}
                          onChange={(e) => update('emergency_contact_phone', e.target.value)}
                          icon={<Phone size={18} />}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Hospital Admin Fields */}
                {form.role === 'hospital_admin' && (
                  <>
                    <Input
                      label="Hospital Name"
                      placeholder="Hospital / Clinic name"
                      value={form.hospital_name}
                      onChange={(e) => update('hospital_name', e.target.value)}
                      error={errors.hospital_name}
                      icon={<Building2 size={18} />}
                      required
                    />
                    <Input
                      label="Hospital Address"
                      placeholder="Full address"
                      value={form.hospital_address}
                      onChange={(e) => update('hospital_address', e.target.value)}
                      icon={<MapPin size={18} />}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Hospital Phone"
                        type="tel"
                        placeholder="Phone"
                        value={form.hospital_phone}
                        onChange={(e) => update('hospital_phone', e.target.value)}
                        icon={<Phone size={18} />}
                      />
                      <Input
                        label="Registration Number"
                        placeholder="Registration #"
                        value={form.registration_number}
                        onChange={(e) => update('registration_number', e.target.value)}
                        icon={<CreditCard size={18} />}
                      />
                    </div>
                  </>
                )}

                {/* Doctor Fields */}
                {form.role === 'doctor' && (
                  <>
                    <Input
                      label="Qualification"
                      placeholder="e.g. MBBS, MD"
                      value={form.qualification}
                      onChange={(e) => update('qualification', e.target.value)}
                      error={errors.qualification}
                      icon={<GraduationCap size={18} />}
                      required
                    />
                    <Input
                      label="Specialization"
                      placeholder="e.g. Cardiology"
                      value={form.specialization}
                      onChange={(e) => update('specialization', e.target.value)}
                      error={errors.specialization}
                      icon={<Stethoscope size={18} />}
                      required
                    />
                    <Input
                      label="License Number"
                      placeholder="Medical license #"
                      value={form.license_number}
                      onChange={(e) => update('license_number', e.target.value)}
                      error={errors.license_number}
                      icon={<FileText size={18} />}
                      required
                    />
                  </>
                )}
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-surface-900">Review & Confirm</h2>
                  <p className="text-surface-500 text-sm mt-1">Verify your details before creating account</p>
                </div>

                <div className="space-y-3">
                  <ConfirmRow label="Role" value={form.role?.replace('_', ' ')} />
                  <ConfirmRow label="Email" value={form.email} />
                  <ConfirmRow label="Full Name" value={form.full_name} />
                  <ConfirmRow label="Phone" value={form.phone} />

                  {form.role === 'patient' && (
                    <>
                      <ConfirmRow label="Date of Birth" value={form.date_of_birth} />
                      <ConfirmRow label="Gender" value={form.gender} />
                      <ConfirmRow label="Blood Group" value={form.blood_group} />
                      {form.address && <ConfirmRow label="Address" value={form.address} />}
                      {form.emergency_contact_name && (
                        <ConfirmRow label="Emergency Contact" value={`${form.emergency_contact_name} - ${form.emergency_contact_phone}`} />
                      )}
                    </>
                  )}
                  {form.role === 'hospital_admin' && (
                    <>
                      <ConfirmRow label="Hospital" value={form.hospital_name} />
                      {form.hospital_address && <ConfirmRow label="Address" value={form.hospital_address} />}
                      {form.registration_number && <ConfirmRow label="Reg. No." value={form.registration_number} />}
                    </>
                  )}
                  {form.role === 'doctor' && (
                    <>
                      <ConfirmRow label="Qualification" value={form.qualification} />
                      <ConfirmRow label="Specialization" value={form.specialization} />
                      <ConfirmRow label="License" value={form.license_number} />
                    </>
                  )}
                </div>

                <div className="bg-primary-50 rounded-lg p-4">
                  <p className="text-sm text-primary-700">
                    By clicking "Create Account", you agree to MediKiosk's Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-200">
              {step > 1 ? (
                <Button type="button" variant="ghost" onClick={handleBack} icon={<ArrowLeft size={16} />}>
                  Back
                </Button>
              ) : (
                <div />
              )}
              {step < 3 ? (
                <Button type="submit" icon={<ArrowRight size={16} />}>
                  Next
                </Button>
              ) : (
                <Button type="submit" loading={isLoading} icon={<Check size={16} />}>
                  Create Account
                </Button>
              )}
            </div>
          </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-surface-500">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
      <span className="text-sm text-surface-500">{label}</span>
      <span className="text-sm font-medium text-surface-800">{value || '-'}</span>
    </div>
  );
}
