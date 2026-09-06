import { motion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * The MediKiosk Guardian — a persistent, friendly anatomical figure that
 * transforms across sections (whole, fragmented, organizing, glowing-steps,
 * red-alert, teal-aura, shielded, success-green).
 * Rendered as SVG for crisp scaling; orbiting data cards added on top.
 */

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
  /** orbiting data cards cluster (uses lucide icons passed as react nodes) */
  orbitCards?: boolean;
  /** pointer-tilt 3D effect (desktop only) */
  tilt?: boolean;
}

// Orbiting data card positions
const ORBIT = [
  { angle: 15, dist: 1.0, label: 'Heart' },
  { angle: 75, dist: 0.82, label: 'Lungs' },
  { angle: 145, dist: 1.05, label: 'Brain' },
  { angle: 205, dist: 0.86, label: 'Stomach' },
  { angle: 275, dist: 1.0, label: 'Kidney' },
  { angle: 330, dist: 0.8, label: 'Pulse' },
];

// Zone lighting (body glow regions) with colors
const ZONES: { key: string; x: number; y: number }[] = [
  { key: 'head', x: 50, y: 15 },
  { key: 'chest', x: 50, y: 42 },
  { key: 'abdomen', x: 50, y: 60 },
  { key: 'leftarm', x: 33, y: 48 },
  { key: 'rightarm', x: 67, y: 48 },
];

export default function Guardian({ state = 'whole', className = '', orbitCards = false, tilt = false }: GuardianProps) {
  const orbit = useMemo(() =>
    ORBIT.map((n) => {
      const rad = (n.angle * Math.PI) / 180;
      return { x: 50 + Math.cos(rad) * 66 * n.dist, y: 100 + Math.sin(rad) * 76 * n.dist, label: n.label };
    }), []);

  // Which body zone glows (steps state = chest, then head, then arms)
  const lit: Record<string, boolean> = {};
  if (state === 'whole' || state === 'organizing' || state === 'success') {
    ZONES.forEach((z) => (lit[z.key] = true));
  } else if (state === 'steps') {
    lit.chest = true;
    lit.head = true;
    lit.leftarm = true;
  } else if (state === 'alert') {
    lit.chest = true;
  } else if (state === 'teal') {
    lit.chest = true;
    lit.head = true;
  } else if (state === 'shield') {
    lit.chest = true;
  }

  // glow color per state
  const glowColor =
    state === 'alert' ? '#EF4444'
    : state === 'success' ? '#10B981'
    : state === 'teal' ? '#2DD4BF'
    : '#6B4EE6';

  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={tilt ? { rotateX: 6, rotateY: -8 } : undefined}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      role="img"
      aria-label="The MediKiosk Guardian anatomical figure"
    >
      <svg viewBox="0 0 100 200" className="w-full h-auto overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="gBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#edeaf8" />
            <stop offset="100%" stopColor="#d9d2f0" />
          </linearGradient>
          <linearGradient id="gRim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id="gHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.55" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>
          <filter id="gGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* state halo / aura */}
        {(state === 'teal' || state === 'alert' || state === 'success') && (
          <motion.circle
            cx="50" cy="100" r="80"
            fill="url(#gHalo)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 1 }}
          />
        )}

        {/* shield hex pattern (shield state) */}
        {state === 'shield' && (
          <g opacity="0.35" fill="none" stroke="#6B4EE6" strokeWidth="0.3">
            {[1, 2, 3].map((r) => (
              <polygon key={r} points={Array.from({ length: 6 }, (_, i) => {
                const a = (i * 60 - 90) * Math.PI / 180;
                return `${50 + (34 + r * 12) * Math.cos(a)},${100 + (34 + r * 12) * Math.sin(a)}`;
              }).join(' ')} />
            ))}
          </g>
        )}

        {/* orbiting connectors for success / organizing */}
        {orbitCards && state !== 'fragmented' && orbit.map((p, i) => (
          <g key={i} opacity="0.5">
            <line x1="50" y1="100" x2={p.x} y2={p.y} stroke="#6B4EE6" strokeWidth="0.4" opacity="0.25" />
            <circle cx={p.x} cy={p.y} r="1.6" fill={glowColor} opacity="0.8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${3 + i}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        {/* Body */}
        <g
          opacity={state === 'fragmented' ? 0.5 : 1}
          filter={state === 'alert' || state === 'success' ? 'url(#gGlow)' : undefined}
        >
          {/* legs */}
          <path d="M44 96 Q43 138 36 176 Q34 184 40 184 L52 184 Q56 184 55 176 Q50 138 50 96 Z" fill="url(#gBody)" />
          <path d="M56 96 Q57 138 64 176 Q66 184 60 184 L48 184 Q44 184 45 176 Q50 138 50 96 Z" fill="url(#gBody)" />
          {/* arms */}
          <path d="M38 42 Q25 55 21 76 Q20 84 25 82 Q34 78 36 66" fill="none" stroke="url(#gBody)" strokeWidth="11" strokeLinecap="round" />
          <path d="M62 42 Q75 55 79 76 Q80 84 75 82 Q66 78 64 66" fill="none" stroke="url(#gBody)" strokeWidth="11" strokeLinecap="round" />
          {/* torso */}
          <path d="M42 34 Q50 30 58 34 Q64 42 62 60 Q60 90 50 96 Q40 90 38 60 Q36 42 42 34 Z" fill="url(#gBody)" />
          {/* neck + head */}
          <rect x="46" y="22" width="8" height="12" rx="3" fill="url(#gBody)" />
          <circle cx="50" cy="15" r="11" fill="url(#gBody)" />

          {/* body zone glows */}
          {ZONES.map((z) => {
            const on = !!lit[z.key];
            return (
              <g key={z.key} style={{ opacity: on ? 1 : 0.12, transition: 'opacity 0.5s ease' }}>
                {z.key === 'head' && <circle cx={z.x} cy={z.y} r="13" fill="url(#gRim)" opacity="0.7" />}
                {z.key === 'chest' && <ellipse cx={z.x} cy={z.y} rx="16" ry="15" fill="url(#gRim)" opacity="0.7" />}
                {z.key === 'abdomen' && <ellipse cx={z.x} cy={z.y} rx="14" ry="13" fill="url(#gRim)" opacity="0.6" />}
                {(z.key === 'leftarm' || z.key === 'rightarm') && <circle cx={z.x} cy={z.y} r="12" fill="url(#gRim)" opacity="0.6" />}
              </g>
            );
          })}
        </g>

        {/* fragmentation papers (fragmented state) */}
        {state === 'fragmented' && (
          <g>
            {[
              { x: 30, y: 55, r: -18 }, { x: 66, y: 50, r: 12 }, { x: 24, y: 80, r: 8 },
              { x: 72, y: 82, r: -10 }, { x: 38, y: 105, r: 16 }, { x: 62, y: 108, r: -14 },
            ].map((p, i) => (
              <motion.g
                key={i}
                initial={{ opacity: 0, rotate: 0 }}
                animate={{
                  opacity: 0.9,
                  rotate: [p.r - 6, p.r + 6, p.r - 6],
                  x: [0, 4, 0],
                }}
                transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
              >
                <rect x={p.x} y={p.y} width="12" height="16" fill="#fff" stroke="#E2Dff0" strokeWidth="0.6" rx="1" transform={`rotate(${p.r} ${p.x + 6} ${p.y + 8})`} />
                <line x1={p.x + 2} y1={p.y + 4} x2={p.x + 10} y2={p.y + 4} stroke="#d3cdf0" strokeWidth="1" />
                <line x1={p.x + 2} y1={p.y + 8} x2={p.x + 8} y2={p.y + 8} stroke="#d3cdf0" strokeWidth="1" />
              </motion.g>
            ))}
          </g>
        )}

        {/* organizing: data streams flowing in */}
        {(state === 'organizing' || state === 'steps') && (
          <g stroke="#6B4EE6" strokeWidth="1.1" fill="none" opacity="0.7">
            <motion.path d="M30 30 L50 44 L42 58 L58 78 L50 98" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4 }} />
            <motion.path d="M70 30 L50 44 L58 58 L42 78 L50 98" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, delay: 0.2 }} />
          </g>
        )}

        {/* alert: red pulse at chest */}
        {state === 'alert' && (
          <motion.circle
            cx="50" cy="42" r="16"
            fill="none" stroke="#EF4444" strokeWidth="1.5"
            initial={{ scale: 0.6, opacity: 1 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {/* success: digital health card in hand */}
        {state === 'success' && (
          <g transform="translate(16, 70) rotate(-12)">
            <motion.rect width="28" height="18" rx="3" fill="#fff" stroke="#10B981" strokeWidth="1.5"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} />
            <rect x="3" y="3" width="7" height="4" rx="1" fill="#6B4EE6" />
            <rect x="3" y="9" width="22" height="1.6" rx="0.8" fill="#2DD4BF" />
            <path d="M20 12.5 l1.4 1.4 2.6-2.8" fill="none" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>

      {/* orbit glass data cards */}
      {orbitCards && (
        <div className="absolute inset-0 pointer-events-none">
          {orbit.map((p, i) => (
            <motion.div
              key={i}
              className="absolute w-9 h-9 rounded-xl bg-white/90 border border-white/60 shadow-lg shadow-primary-600/10 flex items-center justify-center"
              style={{ left: `${p.x}%`, top: `${p.y * 0.48}%` }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.9, scale: 1 }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: glowColor, opacity: 0.8 }} />
            </motion.div>
          ))}
        </div>
      )}

      {/* success embers */}
      {state === 'success' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ background: '#10B981', left: `${20 + i * 7}%`, bottom: '10%' }}
              animate={{ y: [-90, -160], opacity: [0.8, 0] }}
              transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
