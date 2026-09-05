import { useMemo } from 'react';

/**
 * Stylized anatomical human figure (soft clay-render style).
 * Body zones glow in purple on hover; data nodes orbit it like a constellation.
 * Used across hero + scroll transformation states.
 */

interface AnatomicalFigureProps {
  state?: 'whole' | 'chaos' | 'orbiting' | 'data' | 'success';
  className?: string;
  float?: boolean;
}

// Orbiting data nodes (polar coordinates defined as angles + radius offsets)
const NODES = [
  { angle: 20, dist: 0.95, delay: 0 },
  { angle: 80, dist: 0.8, delay: 0.6 },
  { angle: 150, dist: 1.0, delay: 1.2 },
  { angle: 210, dist: 0.85, delay: 0.3 },
  { angle: 280, dist: 0.95, delay: 0.9 },
  { angle: 335, dist: 0.8, delay: 1.5 },
];

// Body zones: (path, x, y) for glow
const ZONES = [
  { key: 'head', label: 'Head', x: 50, y: 16 },
  { key: 'chest', label: 'Chest', x: 50, y: 42 },
  { key: 'abdomen', label: 'Abdomen', x: 50, y: 60 },
  { key: 'leftarm', label: 'Left Arm', x: 32, y: 48 },
  { key: 'rightarm', label: 'Right Arm', x: 68, y: 48 },
  { key: 'leftleg', label: 'Left Leg', x: 41, y: 80 },
  { key: 'rightleg', label: 'Right Leg', x: 59, y: 80 },
];

export default function AnatomicalFigure({
  state = 'whole',
  className = '',
  float = false,
}: AnatomicalFigureProps) {
  // Compute node positions relative to a 100x190 viewBox center around the figure
  const nodePositions = useMemo(() => {
    return NODES.map((n) => {
      const rad = (n.angle * Math.PI) / 180;
      return {
        x: 50 + Math.cos(rad) * 68 * n.dist,
        y: 100 + Math.sin(rad) * 78 * n.dist,
        delay: n.delay,
      };
    });
  }, []);

  // Determine glow zones based on state (sequential body zone lighting)
  const litZones: Record<string, boolean> = {};
  if (state === 'whole') {
    litZones.head = true;
    litZones.chest = true;
  } else if (state === 'orbiting') {
    ZONES.forEach((z, i) => {
      if (i <= 3) litZones[z.key] = true;
    });
  } else if (state === 'success') {
    ZONES.forEach((z) => (litZones[z.key] = true));
  }

  return (
    <div className={`relative w-full h-full ${float ? 'animate-float' : ''} ${className}`} role="img" aria-label="Stylized anatomical human figure">
      <svg viewBox="0 0 100 200" className="w-full h-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d9d3f2" />
            <stop offset="100%" stopColor="#b9b0e0" />
          </linearGradient>
          <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6B4EE6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#9B87F5" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="successGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6B4EE6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#9B87F5" stopOpacity="0" />
          </radialGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Success green halo */}
        {state === 'success' && (
          <circle cx="50" cy="100" r="78" fill="url(#successGlow)" className="animate-pulse" />
        )}

        {/* Constellation orbit nodes */}
        {state !== 'chaos' && nodePositions.map((p, i) => (
          <g key={i} className={state === 'data' ? 'animate-pulse' : ''}>
            <circle cx={p.x} cy={p.y} r="2.2" fill="#6B4EE6" opacity="0.55">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${3 + i}s`} repeatCount="indefinite" />
            </circle>
            <line x1={50} y1={100} x2={p.x} y2={p.y} stroke="#6B4EE6" strokeWidth="0.4" opacity="0.15" />
          </g>
        ))}

        {/* Data streams (teal lines flowing through) for state 4 */}
        {state === 'data' && (
          <g stroke="#2DD4BF" strokeWidth="1.2" fill="none" opacity="0.8">
            <path d="M30 30 L50 45 L42 60 L58 80 L50 100" />
            <path d="M70 30 L50 45 L58 60 L42 80 L50 100" />
            <path d="M50 20 L50 40 L38 55 L62 75" />
            <path d="M30 110 L44 120 L40 140 L50 160" strokeOpacity="0.6" />
            <path d="M70 110 L56 120 L60 140 L50 160" strokeOpacity="0.6" />
          </g>
        )}

        {/* Central purple orb glow (state 3) */}
        {state === 'orbiting' && (
          <circle cx="50" cy="100" r="34" fill="url(#orbGlow)" className="animate-pulse" />
        )}

        {/* BODY GROUP */}
        <g
          className="transition-all duration-500"
          opacity={state === 'chaos' ? 0.28 : state === 'data' ? 0.85 : 1}
          filter={state === 'success' ? 'url(#softGlow)' : undefined}
        >
          {/* legs */}
          <path d="M44 96 Q43 140 36 178 Q34 186 40 186 L52 186 Q56 186 55 178 Q50 140 50 96 Z" fill="url(#bodyGrad)" />
          <path d="M56 96 Q57 140 64 178 Q66 186 60 186 L48 186 Q44 186 45 178 Q50 140 50 96 Z" fill="url(#bodyGrad)" />

          {/* arms */}
          <path d="M38 42 Q26 55 22 78 Q21 86 26 84 Q34 80 36 66" fill="none" stroke="url(#bodyGrad)" strokeWidth="11" strokeLinecap="round" />
          <path d="M62 42 Q74 55 78 78 Q79 86 74 84 Q66 80 64 66" fill="none" stroke="url(#bodyGrad)" strokeWidth="11" strokeLinecap="round" />

          {/* torso */}
          <path d="M42 34 Q50 30 58 34 Q64 42 62 60 Q60 90 50 96 Q40 90 38 60 Q36 42 42 34 Z" fill="url(#bodyGrad)" />

          {/* neck + head */}
          <rect x="46" y="24" width="8" height="12" rx="3" fill="url(#bodyGrad)" />
          <circle cx="50" cy="16" r="11" fill="url(#bodyGrad)" />

          {/* Body zone glow overlays (show progressively) */}
          {ZONES.map((z) => {
            const lit = litZones[z.key];
            return (
              <g key={z.key} className="zone" data-zone={z.key} style={{ opacity: lit ? 1 : 0.15, transition: 'opacity 0.4s ease' }}>
                {z.key === 'head' && <circle cx={z.x} cy={z.y} r="13" fill="url(#glowGrad)" opacity="0.5" className="transition-opacity" />}
                {z.key === 'chest' && <ellipse cx={z.x} cy={z.y} rx="16" ry="14" fill="url(#glowGrad)" opacity="0.45" />}
                {z.key === 'abdomen' && <ellipse cx={z.x} cy={z.y} rx="14" ry="13" fill="url(#glowGrad)" opacity="0.45" />}
                {(z.key === 'leftarm' || z.key === 'rightarm') && <circle cx={z.x} cy={z.y} r="12" fill="url(#glowGrad)" opacity="0.4" />}
                {(z.key === 'leftleg' || z.key === 'rightleg') && <circle cx={z.x} cy={z.y} r="12" fill="url(#glowGrad)" opacity="0.4" />}
              </g>
            );
          })}

          {/* Digital health card (state 5) in hand */}
          {state === 'success' && (
            <g transform="translate(20, 74) rotate(-12)">
              <rect x="0" y="0" width="26" height="17" rx="3" fill="#ffffff" stroke="#2DD4BF" strokeWidth="1.5" filter="url(#softGlow)" />
              <rect x="3" y="3" width="6" height="3.5" rx="1" fill="#6B4EE6" />
              <rect x="3" y="8.5" width="20" height="1.4" rx="0.7" fill="#2DD4BF" />
              <rect x="3" y="11.5" width="12" height="1.4" rx="0.7" fill="#c7c0e6" />
            </g>
          )}
        </g>
      </svg>

      {/* Floating paper-fly icons for chaos state (overlaid divs with CSS float) */}
      {state === 'chaos' && (
        <div className="absolute inset-0 pointer-events-none">
          {[40, 55, 70, 25, 62].map((left, i) => (
            <div
              key={i}
              className="absolute w-6 h-8 bg-white rounded shadow-md flex items-center justify-center"
              style={{
                left: `${left}%`,
                top: `${18 + i * 16}%`,
                transform: `rotate(${[-18, 14, -8, 20, -14][i]}deg)`,
                animation: `float 4s ease-in-out ${i * 0.4}s infinite`,
                border: '1px solid #e7e4f5',
              }}
            >
              <span className="w-3 h-1 bg-surface-200 rounded" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
