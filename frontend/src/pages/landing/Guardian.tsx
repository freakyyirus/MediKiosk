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
    state === 'alert' ? '#ef4444' // Red
    : state === 'success' ? '#10b981' // Green
    : state === 'teal' ? '#14b8a6' // Teal
    : '#0ea5e9'; // Blue

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      whileHover={tilt ? { rotateX: 4, rotateY: -6 } : undefined}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      role="img"
      aria-label="Abstract human anatomy illustration"
    >
      <svg viewBox="0 0 200 400" className="w-full h-auto max-w-[220px]" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}Body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.4" />
          </linearGradient>
          
          <radialGradient id={`${uid}Glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>
          
          <filter id={`${uid}Blur`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* Ambient State Aura */}
        <motion.circle
          cx="100" cy="180" r="120"
          fill={`url(#${uid}Glow)`}
          filter={`url(#${uid}Blur)`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />

        {/* ─── PREMIUM ABSTRACT HUMAN SILHOUETTE ─── */}
        <g stroke="#cbd5e1" strokeWidth="1.5" fill={`url(#${uid}Body)`} strokeLinejoin="round" className="drop-shadow-2xl">
          {/* Head & Neck */}
          <path d="M 85 40 C 85 20, 115 20, 115 40 C 115 55, 105 60, 105 70 L 95 70 C 95 60, 85 55, 85 40 Z" />
          
          {/* Torso & Arms & Legs */}
          <path d="
            M 105 70 L 120 70 
            C 140 70, 145 80, 150 110 
            L 155 180 C 155 190, 145 190, 140 180 
            L 130 110 L 130 190 L 130 250
            C 130 260, 125 260, 120 340
            C 118 360, 105 360, 105 340
            L 100 230 L 95 340
            C 95 360, 82 360, 80 340
            C 75 260, 70 260, 70 250
            L 70 190 L 70 110
            L 60 180 C 55 190, 45 190, 45 180
            L 50 110 C 55 80, 60 70, 80 70
            L 95 70 Z
          " />
        </g>

        {/* ─── VITAL NETWORKS & DATA POINTS ─── */}
        <g stroke={glowColor} strokeWidth="1.5" fill="none" opacity="0.6">
          {/* Central spine/nervous system line */}
          <motion.path 
            d="M 100 60 L 100 200" 
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Heart node */}
          <circle cx="106" cy="110" r="4" fill={glowColor} className="animate-pulse" />
          <path d="M 106 110 L 130 100" strokeWidth="1" opacity="0.4" />
          <path d="M 106 110 L 70 120" strokeWidth="1" opacity="0.4" />

          {/* Brain node */}
          <circle cx="100" cy="40" r="3" fill={glowColor} />
          
          {/* Joint nodes */}
          {[
            { x: 75, y: 80 }, { x: 125, y: 80 }, // Shoulders
            { x: 85, y: 240 }, { x: 115, y: 240 } // Hips
          ].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill={glowColor} opacity="0.8" />
          ))}
        </g>

        {/* ─── STATE OVERLAYS ─── */}
        
        {/* Shield state (protective barrier) */}
        {state === 'shield' && (
          <motion.path
            d="M 100 10 L 170 50 L 170 180 Q 170 300 100 380 Q 30 300 30 180 L 30 50 Z"
            fill="none" stroke="#10b981" strokeWidth="2" strokeOpacity="0.5" strokeDasharray="8 8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          />
        )}

        {/* Alert state (red pulsing waves) */}
        {state === 'alert' && (
          <motion.circle
            cx="106" cy="110" r="20"
            fill="none" stroke="#ef4444" strokeWidth="2"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Fragmented state (flying data cards) */}
        {state === 'fragmented' && (
          <g>
            {[
              { x: 10, y: 120, r: -15 }, { x: 160, y: 90, r: 15 },
              { x: 20, y: 250, r: -5 }, { x: 150, y: 280, r: 25 },
            ].map((p, i) => (
              <motion.g
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, -15, 0], rotate: [p.r - 8, p.r + 8, p.r - 8] }}
                transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }}
              >
                <rect x={p.x} y={p.y} width="24" height="32" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="1.5" className="drop-shadow-sm" transform={`rotate(${p.r} ${p.x+12} ${p.y+16})`} />
                <line x1={p.x+6} y1={p.y+10} x2={p.x+18} y2={p.y+10} stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                <line x1={p.x+6} y1={p.y+16} x2={p.x+14} y2={p.y+16} stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
              </motion.g>
            ))}
          </g>
        )}
      </svg>
    </motion.div>
  );
}