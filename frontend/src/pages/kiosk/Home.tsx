import { useNavigate } from 'react-router-dom';
import { Globe, Accessibility, HelpCircle, Shield, Heart, Sparkles, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import EmergencyFab from '../../components/EmergencyFab';
import { useUIStore } from '../../stores';
import Logo from '../../components/brand/Logo';

export default function Home() {
  const navigate = useNavigate();
  const { lowLiteracyMode, highContrast, toggleLowLiteracyMode, toggleHighContrast } = useUIStore();
  const [ayushMode, setAyushMode] = useState(false);

  return (
    <div className={`min-h-screen ${ayushMode ? 'ayush-mode' : 'mesh-bg'} flex flex-col text-surface-900 ${lowLiteracyMode ? 'low-literacy' : ''} ${highContrast ? 'high-contrast' : ''}`}>
      {/* Header */}
      <header className="w-full flex items-center justify-between px-10 py-6">
        <div className="flex items-center gap-3">
          <Logo size={46} variant="gradient" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleLowLiteracyMode()}
            className={`flex items-center gap-2 px-4 py-2.5 bg-white border rounded-xl font-medium text-sm transition-colors touch-target ${lowLiteracyMode ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-surface-200 text-surface-600 hover:border-surface-300'}`}
          >
            <Accessibility className="w-5 h-5" />
            {lowLiteracyMode ? 'Low-literacy: ON' : 'Accessibility'}
          </button>
          <button
            onClick={() => toggleHighContrast()}
            className={`flex items-center gap-2 px-4 py-2.5 bg-white border rounded-xl font-medium text-sm transition-colors touch-target ${highContrast ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-surface-200 text-surface-600 hover:border-surface-300'}`}
          >
            <Accessibility className="w-5 h-5" />
            Contrast
          </button>
          <button
            onClick={() => setAyushMode((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 bg-white border rounded-xl font-medium text-sm transition-colors touch-target ${ayushMode ? 'border-accent-400 bg-accent-50 text-accent-700' : 'border-surface-200 text-surface-600 hover:border-surface-300'}`}
          >
            <Sparkles className="w-5 h-5" /> AYUSH
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-surface-600 font-medium text-sm hover:border-surface-300 transition-colors touch-target">
            <HelpCircle className="w-5 h-5" /> Help
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col md:flex-row items-center px-10 max-w-6xl mx-auto w-full gap-8 py-4">
        <div className="flex-1">
          <h1 className={`text-5xl md:text-6xl font-black text-surface-900 leading-[1.08] mb-6 ${lowLiteracyMode ? 'text-6xl' : ''}`}>
            Your First Step to<br /> Better Care.
          </h1>
          <p className="text-xl md:text-2xl text-surface-500 mb-10 max-w-xl leading-relaxed">
            Tell us how you're feeling and we'll guide you through a simple health check before you see the doctor.
          </p>

          <button
            onClick={() => navigate('/kiosk/language')}
            className="touch-target-lg px-10 py-5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 text-white text-2xl font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-primary-600/30 transition-all hover:scale-[1.02]"
          >
            Start Health Check <ArrowRight className="w-6 h-6" />
          </button>

          <div className="flex gap-6 mt-10 flex-wrap">
            <div className="flex items-center gap-2 text-base font-medium text-surface-600">
              <Shield className="w-5 h-5 text-primary-600" /> Private & Secure
            </div>
            <div className="flex items-center gap-2 text-base font-medium text-surface-600">
              <Globe className="w-5 h-5 text-primary-600" /> Multilingual
            </div>
            <div className="flex items-center gap-2 text-base font-medium text-surface-600">
              <Heart className="w-5 h-5 text-coral-400" /> Easy to Use
            </div>
          </div>
        </div>

        {/* Soft 3D-style illustration (CSS shapes) */}
        <div className="flex-[0.9] flex justify-center">
          <div className="relative w-full max-w-[420px] aspect-square animate-float">
            <div className="absolute inset-0 bg-white rounded-[40px] shadow-[0_30px_60px_rgba(107,78,230,0.15)] border border-surface-100 overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary-100 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent-100 rounded-full blur-2xl" />
              {/* heart */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 relative">
                  <div className="w-40 h-40 bg-gradient-to-br from-primary-500 to-primary-300 rounded-full flex items-center justify-center shadow-2xl shadow-primary-500/30">
                    <Heart className="w-16 h-16 text-white" />
                  </div>
                  <div className="absolute -right-8 top-8 w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg animate-float" style={{ animationDelay: '0.5s' }}>
                    <Globe className="w-8 h-8 text-primary-600" />
                  </div>
                  <div className="absolute -left-8 -bottom-4 w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg animate-float" style={{ animationDelay: '1s' }}>
                    <Shield className="w-8 h-8 text-accent-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full px-10 pb-6 text-center text-surface-400 text-sm">
        Digital health assistance · Audio guided
      </footer>

      <EmergencyFab />
    </div>
  );
}
