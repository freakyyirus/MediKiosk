import { useState } from 'react';
import { bodyPartById, BODY_PARTS } from './bodyMapData';

interface InteractiveBodyMapProps {
  language?: 'en' | 'hi';
  onSelect: (partId: string) => void;
  selectedIds?: string[];
  highContrast?: boolean;
  lowLiteracy?: boolean;
}

interface ZoneShape {
  id: string;
  label: string;
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
}

/**
 * Interactive anatomical figure (front-facing stick/soft figure) with
 * tappable body-part zones. Letters are large, high-contrast friendly.
 */
export default function InteractiveBodyMap({
  language = 'en',
  onSelect,
  selectedIds = [],
  highContrast = false,
  lowLiteracy = false,
}: InteractiveBodyMapProps) {
  const [focused, setFocused] = useState<string | null>(null);

  // Define clickable zones as SVG paths/ellipses overlaying a simple human figure.
  const zones: ZoneShape[] = [
    { id: 'head', label: 'Head', cx: 200, cy: 70, rx: 48, ry: 48 },
    { id: 'eyes', label: 'Eyes', cx: 168, cy: 63, rx: 20, ry: 14 },
    { id: 'eyes', label: 'Eyes', cx: 232, cy: 63, rx: 20, ry: 14 },
    { id: 'ears', label: 'Ears', cx: 128, cy: 78, rx: 16, ry: 20 },
    { id: 'ears', label: 'Ears', cx: 272, cy: 78, rx: 16, ry: 20 },
    { id: 'nose_throat', label: 'Nose/Throat', cx: 200, cy: 125, rx: 34, ry: 30 },
    { id: 'chest', label: 'Chest', cx: 200, cy: 195, rx: 82, ry: 70 },
    { id: 'stomach', label: 'Stomach', cx: 200, cy: 300, rx: 68, ry: 60 },
    { id: 'back', label: 'Back', cx: 200, cy: 195, rx: 64, ry: 90 },
    { id: 'arms_hands', label: 'Arms/Hands', cx: 320, cy: 240, rx: 34, ry: 90 },
    { id: 'arms_hands', label: 'Arms/Hands', cx: 80, cy: 240, rx: 34, ry: 90 },
    { id: 'legs_feet', label: 'Legs/Feet', cx: 245, cy: 430, rx: 46, ry: 120 },
    { id: 'legs_feet', label: 'Legs/Feet', cx: 155, cy: 430, rx: 46, ry: 120 },
    { id: 'joints', label: 'Joints', cx: 200, cy: 540, rx: 60, ry: 24 },
    { id: 'skin', label: 'Skin', cx: 200, cy: 200, rx: 150, ry: 150 },
    { id: 'private', label: 'Private', cx: 200, cy: 400, rx: 36, ry: 20 },
  ];

  const zoneFill = (id: string) => {
    if (selectedIds.includes(id)) return highContrast ? '#FFD60A' : '#34D399';
    if (focused === id) return highContrast ? '#FFD60A' : '#6B4EE6';
    return highContrast ? '#E0E0E0' : '#E9E5FB';
  };

  const zoneStroke = (id: string) => {
    if (selectedIds.includes(id)) return highContrast ? '#000000' : '#059669';
    return highContrast ? '#000000' : '#8A7CC8';
  };

  const handleClick = (id: string) => {
    const base = id.replace(/2$/, '');
    onSelect(base);
  };

  const label = (id: string) => {
    const def = bodyPartById(id.replace(/2$/, ''));
    if (!def) return id;
    return language === 'hi' ? def.label_hi : def.label_en;
  };

  return (
    <div className="relative w-full max-w-[520px] mx-auto select-none" role="group" aria-label="Body map">
      <svg viewBox="0 0 400 600" className="w-full h-auto" role="img" aria-label="Tap the body part that hurts">
        {/* Simple body base silhouette */}
        <g fill="none" stroke={highContrast ? '#000' : '#C7C0E6'} strokeWidth="6" strokeLinecap="round">
          {/* head */}
          <circle cx="200" cy="70" r="48" />
          {/* torso */}
          <path d="M150 175 Q130 300 140 390 L260 390 Q270 300 250 175 Z" />
          {/* arms */}
          <path d="M150 190 Q95 250 90 330" />
          <path d="M250 190 Q305 250 310 330" />
          {/* legs */}
          <path d="M175 390 L160 560" />
          <path d="M225 390 L240 560" />
        </g>

        {/* Clickable zones */}
        {zones.map((z, i) => {
          const key = `${z.id}-${i}`;
          const base = z.id.replace(/2$/, '');
          const selected = selectedIds.includes(base);
          return (
            <g
              key={key}
              onClick={() => handleClick(z.id)}
              onMouseEnter={() => setFocused(base)}
              onMouseLeave={() => setFocused(null)}
              className="cursor-pointer transition-opacity"
              style={{ opacity: selected ? 1 : focused === base ? 1 : 0.75 }}
            >
              {(z.rx) && (
                <ellipse
                  cx={z.cx}
                  cy={z.cy}
                  rx={z.rx}
                  ry={z.ry ?? z.rx}
                  fill={zoneFill(base)}
                  stroke={zoneStroke(base)}
                  strokeWidth="3"
                  className="transition-colors"
                />
              )}
              {/* Label */}
              <text
                x={z.cx}
                y={z.cy + 5}
                textAnchor="middle"
                fontSize={lowLiteracy ? 16 : 13}
                fontWeight="700"
                fill={highContrast ? '#000' : '#4A3F7A'}
                pointerEvents="none"
              >
                {label(base)}
              </text>
            </g>
          );
        })}

        {/* Private region marker */}
        <text x="200" y="425" textAnchor="middle" fontSize="12" fill={highContrast ? '#000' : '#8A7CC8'} pointerEvents="none">
          {language === 'hi' ? 'निजी' : 'Private'}
        </text>
      </svg>

      {/* Legend chips with friendly labels */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {BODY_PARTS.filter((b) => !['eyes', 'ears', 'nose_throat'].includes(b.id)).map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors touch-target ${
              selectedIds.includes(b.id)
                ? highContrast
                  ? 'bg-black text-yellow-300 border-black'
                  : 'bg-success-500 text-white border-success-600'
                : 'bg-white text-surface-600 border-surface-200 hover:border-primary-400'
            }`}
          >
            {language === 'hi' ? b.label_hi : b.label_en}
          </button>
        ))}
      </div>
    </div>
  );
}