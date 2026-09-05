import { useId } from 'react';

export type LogoVariant = 'gradient' | 'white' | 'mono' | 'blue';

interface LogoProps {
  variant?: LogoVariant;
  /** Height of the mark in px (wordmark scales off it). */
  size?: number;
  showWordmark?: boolean;
  stacked?: boolean;
  className?: string;
}

/**
 * MediKiosk Logo — Patient touching a kiosk screen with medical cross + signal waves.
 * Based on the official brand sheet.
 */
function LogoMark({ id, variant }: { id: string; variant: LogoVariant }) {
  const isGradient = variant === 'gradient';
  const isWhite = variant === 'white';
  const isMono = variant === 'mono';

  // Primary color for the main shapes
  const primary = isWhite ? '#FFFFFF' : isMono ? '#1E293B' : isGradient ? `url(#${id}_grad)` : '#4F46E5';
  // Solid primary for strokes/fills that can't use gradients
  const primarySolid = isWhite ? '#FFFFFF' : isMono ? '#1E293B' : '#4F46E5';
  // Accent (purple for cross / waves)
  const accent = isWhite ? '#FFFFFF' : isMono ? '#1E293B' : '#8B5CF6';
  // Screen glow
  const screenBg = isWhite ? 'rgba(255,255,255,0.15)' : isMono ? 'rgba(30,41,59,0.08)' : 'rgba(79,70,229,0.06)';

  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}_grad`} x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="0.5" stopColor="#6D28D9" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      {/* ─── Kiosk Screen (rounded rectangle tablet) ─── */}
      <rect
        x="22" y="4" width="38" height="44" rx="6"
        fill={screenBg}
        stroke={primarySolid}
        strokeWidth="2.5"
      />
      {/* Screen inner area */}
      <rect
        x="26" y="8" width="30" height="33" rx="3"
        fill={isWhite ? 'rgba(255,255,255,0.1)' : isMono ? 'rgba(30,41,59,0.03)' : 'rgba(79,70,229,0.04)'}
      />
      {/* Kiosk stand/base */}
      <line x1="37" y1="48" x2="47" y2="48" stroke={primarySolid} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="48" x2="42" y2="54" stroke={primarySolid} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="35" y1="54" x2="49" y2="54" stroke={primarySolid} strokeWidth="3" strokeLinecap="round" />

      {/* ─── Medical Cross on screen ─── */}
      <rect x="38" y="14" width="6" height="18" rx="2" fill={accent} />
      <rect x="32" y="20" width="18" height="6" rx="2" fill={accent} />

      {/* ─── Signal / Voice Waves ─── */}
      <path
        d="M 55 16 Q 59 20 55 24"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <path
        d="M 58 12 Q 64 20 58 28"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />

      {/* ─── Patient Figure ─── */}
      {/* Head */}
      <circle cx="12" cy="22" r="6" fill={primarySolid} />
      {/* Body */}
      <path
        d="M 12 28.5 L 12 44 Q 12 46 10 48 L 6 54"
        stroke={primarySolid}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Back leg */}
      <path
        d="M 12 44 Q 14 48 18 54"
        stroke={primarySolid}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Arm reaching to kiosk screen */}
      <path
        d="M 12 32 L 20 28 L 28 23"
        stroke={primarySolid}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* ─── Touch indicator (glow on screen) ─── */}
      <circle cx="30" cy="22" r="3.5" fill={accent} opacity="0.6" />
      <circle cx="30" cy="22" r="6.5" fill={accent} opacity="0.2" />

      {/* ─── Pulse/heartbeat line at bottom ─── */}
      <path
        d="M 2 60 L 12 60 L 15 55 L 19 64 L 22 57 L 25 60 L 34 60"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
    </svg>
  );
}

function Wordmark({ variant, fontSize }: { variant: LogoVariant; fontSize: number }) {
  const light = variant === 'white';
  const medi = light ? '#FFFFFF' : '#4F46E5';
  const kiosk = light ? '#FFFFFF' : '#7C3AED';
  return (
    <span
      className="inline-flex items-baseline font-bold tracking-tight leading-none"
      style={{
        fontSize,
        fontFamily: "'Inter', system-ui, sans-serif",
        color: light ? '#FFFFFF' : '#1A1A2E',
      }}
    >
      <span style={{ color: medi }}>Medi</span>
      <span style={{ color: kiosk }}>Kiosk</span>
    </span>
  );
}

export default function Logo({
  variant = 'gradient',
  size = 36,
  showWordmark = true,
  stacked = false,
  className = '',
}: LogoProps) {
  const id = useId().replace(/:/g, '');
  const markSize = size;
  return (
    <span
      className={`inline-flex items-center ${stacked ? 'flex-col gap-1' : 'gap-2.5'} ${className}`}
    >
      <span style={{ width: markSize, height: markSize }} className="block shrink-0">
        <LogoMark id={id} variant={variant} />
      </span>
      {showWordmark && (
        <Wordmark variant={variant} fontSize={markSize * 0.58} />
      )}
    </span>
  );
}