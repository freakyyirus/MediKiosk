import { motion } from 'framer-motion';
import { useId } from 'react';

export type GuardianState =
  | 'whole'
  | 'fragmented'
  | 'organizing'
  | 'steps'
  | 'alert'
  | 'teal'
  | 'shield'
  | 'success';

interface GuardianProps {
  state?: GuardianState;
  className?: string;
  orbitCards?: boolean;
  tilt?: boolean;
}

export default function Guardian({ state = 'whole', className = '', orbitCards = false, tilt = false }: GuardianProps) {
  const uid = useId().replace(/:/g, '');

  const glowColor =
    state === 'alert' ? '#ef5252'
    : state === 'success' ? '#10b981'
    : state === 'teal' ? '#2a9d8f'
    : '#0ea5e9';

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      whileHover={tilt ? { rotateX: 4, rotateY: -6 } : undefined}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      role="img"
      aria-label="Human figure illustration"
    >
      <svg viewBox="0 0 200 300" className="w-full h-auto max-w-[280px] drop-shadow-xl" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}Body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <linearGradient id={`${uid}Legs`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <radialGradient id={`${uid}Halo`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Halo for states */}
        {(state === 'teal' || state === 'alert' || state === 'success' || state === 'shield') && (
          <motion.circle
            cx="100" cy="150" r="140"
            fill={`url(#${uid}Halo)`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />
        )}

        {/* ─── HUMAN FIGURE (Clean Vector Style) ─── */}
        
        {/* Head */}
        <circle cx="100" cy="45" r="25" fill="#fcd34d" />
        
        {/* Torso/Shirt */}
        <path d="M 70 85 C 70 75 130 75 130 85 L 140 180 L 60 180 Z" fill={`url(#${uid}Body)`} rx="10" />
        
        {/* Left Arm */}
        <path d="M 65 85 Q 40 110 45 160" fill="none" stroke={`url(#${uid}Body)`} strokeWidth="18" strokeLinecap="round" />
        <circle cx="46" cy="160" r="9" fill="#fcd34d" /> {/* Hand */}

        {/* Right Arm */}
        <path d="M 135 85 Q 160 110 155 160" fill="none" stroke={`url(#${uid}Body)`} strokeWidth="18" strokeLinecap="round" />
        <circle cx="154" cy="160" r="9" fill="#fcd34d" /> {/* Hand */}

        {/* Legs/Pants */}
        <path d="M 65 180 L 135 180 L 125 280 L 105 280 L 100 200 L 95 280 L 75 280 Z" fill={`url(#${uid}Legs)`} />
        
        {/* Shoes */}
        <path d="M 75 280 Q 75 295 90 295 L 90 280 Z" fill="#334155" />
        <path d="M 125 280 Q 125 295 110 295 L 110 280 Z" fill="#334155" />
        
        {/* ─── STATE OVERLAYS ─── */}
        
        {/* Alert state (red pulsing heart) */}
        {state === 'alert' && (
          <motion.circle
            cx="110" cy="115" r="15"
            fill="#ef4444"
            initial={{ scale: 1 }}
            animate={{ scale: 1.4, opacity: [1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Success state (green checkmark or card) */}
        {state === 'success' && (
          <motion.g transform="translate(145, 120)" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <rect width="35" height="25" rx="4" fill="#fff" stroke="#10b981" strokeWidth="3" />
            <path d="M 10 12.5 L 15 17.5 L 25 7.5" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>
        )}

        {/* Shield state (protective barrier) */}
        {state === 'shield' && (
          <motion.path
            d="M 100 20 L 170 50 L 170 120 Q 170 200 100 280 Q 30 200 30 120 L 30 50 Z"
            fill="none" stroke="#10b981" strokeWidth="4" strokeOpacity="0.7" strokeDasharray="10 10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          />
        )}

        {/* Fragmented state (flying papers) */}
        {state === 'fragmented' && (
          <g>
            {[
              { x: 20, y: 80, r: -15 }, { x: 160, y: 60, r: 15 },
              { x: 30, y: 180, r: -5 }, { x: 170, y: 200, r: 25 },
            ].map((p, i) => (
              <motion.g
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, -10, 0], rotate: [p.r - 5, p.r + 5, p.r - 5] }}
                transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }}
              >
                <rect x={p.x} y={p.y} width="25" height="35" rx="2" fill="#fff" stroke="#cbd5e1" strokeWidth="2" transform={`rotate(${p.r} ${p.x+12} ${p.y+17})`} />
                <line x1={p.x+5} y1={p.y+10} x2={p.x+20} y2={p.y+10} stroke="#94a3b8" strokeWidth="2" />
                <line x1={p.x+5} y1={p.y+16} x2={p.x+15} y2={p.y+16} stroke="#94a3b8" strokeWidth="2" />
              </motion.g>
            ))}
          </g>
        )}

        {/* Organizing state (data lines) */}
        {(state === 'organizing' || state === 'steps') && (
          <g stroke="#0ea5e9" strokeWidth="3" strokeDasharray="6 6" fill="none" opacity="0.6">
            <motion.path
              d="M 10 100 Q 50 80 80 120"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.path
              d="M 190 150 Q 150 180 120 120"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </g>
        )}
      </svg>
    </motion.div>
  );
}