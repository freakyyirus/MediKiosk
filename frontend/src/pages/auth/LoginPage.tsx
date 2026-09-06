import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Activity, ShieldCheck, Heart, User, Building2, Stethoscope } from 'lucide-react';
import { useAuthStore, getRoleRedirect } from '../../stores/authStore';
import { isSupabaseConfigured } from '../../lib/mockData';
import { useToastStore } from '../../components/shared/Toast';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import Logo from '../../components/brand/Logo';

const isConfigured = isSupabaseConfigured();
const demoMode = !isConfigured;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, setMockRole, isLoading, isAuthenticated, user } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(getRoleRedirect(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleDemoLogin = (role: 'patient' | 'hospital_admin' | 'doctor') => {
    setMockRole(role);
    navigate(getRoleRedirect(role), { replace: true });
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errs: typeof errors = {};
    if (!email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email address';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await login(email, password);
      const { user } = useAuthStore.getState();
      if (user?.role) {
        navigate(getRoleRedirect(user.role), { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      addToast('error', message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-accent-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <div className="flex items-center gap-3 mb-8">
            <Logo size={46} variant="white" />
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
            Smart Healthcare
            <br />
            <span className="text-accent-300">At Your Fingertips</span>
          </h1>

          <p className="text-lg text-primary-100 leading-relaxed mb-10 max-w-md">
            Access your health records, manage appointments, and connect with healthcare
            professionals seamlessly.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary-100">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-sm">End-to-end encrypted & ABDM compliant</span>
            </div>
            <div className="flex items-center gap-3 text-primary-100">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <span className="text-sm">Trusted by 500+ healthcare institutions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-surface-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Logo size={40} variant="gradient" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-surface-900">Welcome back</h2>
            <p className="text-surface-500 mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              icon={<Mail size={18} />}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-surface-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-surface-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
              Register
            </Link>
          </p>

          {demoMode && (
            <div className="mt-8 p-4 bg-accent-50 border border-accent-200 rounded-xl">
              <p className="text-center text-sm font-medium text-accent-700 mb-3">
                Demo Mode &mdash; no auth provider configured
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDemoLogin('patient')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white border border-surface-200 hover:border-primary-400 hover:bg-primary-50 transition-colors cursor-pointer"
                >
                  <User className="w-5 h-5 text-primary-600" />
                  <span className="text-xs font-medium text-surface-700">Patient</span>
                </button>
                <button
                  onClick={() => handleDemoLogin('hospital_admin')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white border border-surface-200 hover:border-primary-400 hover:bg-primary-50 transition-colors cursor-pointer"
                >
                  <Building2 className="w-5 h-5 text-primary-600" />
                  <span className="text-xs font-medium text-surface-700">Hospital Admin</span>
                </button>
                <button
                  onClick={() => handleDemoLogin('doctor')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white border border-surface-200 hover:border-primary-400 hover:bg-primary-50 transition-colors cursor-pointer"
                >
                  <Stethoscope className="w-5 h-5 text-primary-600" />
                  <span className="text-xs font-medium text-surface-700">Doctor</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
