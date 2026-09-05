import { useReducedMotion } from 'framer-motion';

/**
 * Hero scene — compact 16:9 SVG so it always fits the right column of the
 * headline (280–460px wide) without overflowing, matching the landing design
 * tokens (indigo primary + coral accent + mint teal).
 *
 * Story: a patient taps a kiosk mic, a coral waveform records her voice, a
 * bilingual chip shows it's transcribed, dash-dot AI carries the data to the
 * doctor's tablet, which renders a structured summary.
 */
export default function HeroIllustration({ className = '' }: { className?: string }) {
  const reduced = useReducedMotion();

  const bars = [10, 16, 11, 18, 13, 21, 12, 17, 9];
  const barXs = [56, 63, 70, 77, 84, 91, 98, 105, 112];
  const baseline = 124;

  return (
    <div
      className={`relative w-full aspect-[16/9] overflow-visible ${className}`}
      role="img"
      aria-label="A patient speaks into a hospital kiosk; the AI transcribes her symptoms and delivers a structured summary to a doctor's tablet."
    >
      <svg viewBox="0 0 460 259" className="w-full h-auto" aria-hidden="true" style={{ fontFamily: "'Inter','Noto Sans',system-ui,sans-serif" }}>
        <defs>
          <radialGradient id="hg-primary" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hg-coral" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hg-accent" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
          </radialGradient>
          <filter id="hsh" x="-30%" y="-30%" width="160%" height="220%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#1F1B38" floodOpacity="0.12" />
          </filter>
          <filter id="hsh-sm" x="-40%" y="-40%" width="180%" height="240%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#1F1B38" floodOpacity="0.10" />
          </filter>
        </defs>

        {/* ===== ambient glows ===== */}
        <circle cx="95" cy="120" r="120" fill="url(#hg-primary)" />
        <circle cx="365" cy="150" r="140" fill="url(#hg-coral)" />
        <circle cx="225" cy="60" r="90" fill="url(#hg-accent)" />

        {/* ground shadows */}
        <ellipse cx="90" cy="248" rx="66" ry="5" fill="#1F1B38" opacity="0.07" />
        <ellipse cx="358" cy="233" rx="82" ry="5" fill="#1F1B38" opacity="0.07" />

        {/* ===== KIOSK ===== */}
        <g>
          {/* device frame */}
          <rect x="24" y="30" width="122" height="212" rx="18" fill="#FFFFFF" stroke="#E7E4F5" strokeWidth="1.5" filter="url(#hsh)" />
          <rect x="66" y="38" width="26" height="4" rx="2" fill="#E7E4F5" />

          {/* mic avatar with pulsing rings */}
          <circle cx="85" cy="74" r="20" fill="#EEF2FF" />
          {!reduced && (
            <circle cx="85" cy="74" r="20" fill="none" stroke="#A5B4FC" strokeWidth="2">
              <animate attributeName="r" values="20;27;20" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0;0.7" dur="2.2s" repeatCount="indefinite" />
            </circle>
          )}
          <rect x="78" y="58" width="14" height="18" rx="7" fill="#4F46E5" />
          <path d="M85 76 v6 M81 82 h8" stroke="#4F46E5" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M101 66 q4 6 0 12" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.9" />
          <path d="M107 62 q6 8 0 18" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />

          {/* voice waveform */}
          <g>
            {bars.map((h, i) => (
              <rect
                key={i}
                x={barXs[i]}
                y={baseline - h}
                width="3"
                height={h}
                rx="1.5"
                fill="#F97316"
                className="animate-waveform"
                style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </g>
          <text x="85" y="143" textAnchor="middle" fontSize="9" fontWeight="600" fill="#7C75A3">Recording…</text>

          {/* bilingual transcript chip */}
          <rect x="50" y="152" width="70" height="18" rx="9" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1" />
          <circle cx="60" cy="161" r="5" fill="none" stroke="#6366F1" strokeWidth="1.2" />
          <circle cx="60" cy="161" r="1.6" fill="#6366F1" />
          <text x="70" y="164.5" fontSize="7.5" fontWeight="600" fill="#4338CA">हिन्दी · EN</text>

          {/* live caption chip */}
          <rect x="50" y="176" width="70" height="18" rx="9" fill="#FFF7ED" stroke="#FED7AA" strokeWidth="1.5" />
          {!reduced && (
            <circle cx="59" cy="185" r="3" fill="#F97316">
              <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
            </circle>
          )}
          {reduced && <circle cx="59" cy="185" r="3" fill="#F97316" />}
          <text x="70" y="188.5" fontSize="7.5" fontWeight="700" fill="#EA580C">AI Caption</text>

          {/* home indicator */}
          <rect x="38" y="212" width="94" height="1" fill="#F2F0FB" />
          <rect x="72" y="224" width="26" height="4" rx="2" fill="#E7E4F5" />
        </g>

        {/* ===== speech bubble ===== */}
        <g transform="rotate(-2 192 48)">
          <rect x="140" y="34" width="104" height="32" rx="12" fill="#FFFFFF" stroke="#E7E4F5" strokeWidth="1.5" filter="url(#hsh-sm)" />
          <path d="M158 62 l-11 12 17 -5 z" fill="#FFFFFF" stroke="#E7E4F5" strokeWidth="1.5" />
          <text x="192" y="53" textAnchor="middle" fontSize="10.5" fontWeight="500" fontStyle="italic" fill="#4338CA">I have chest pain…</text>
          <path d="M152 58 C 168 56, 181 60, 196 57 C 210 55, 224 59, 236 57" stroke="#F97316" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.9" />
        </g>

        {/* ===== data stream kiosk → tablet ===== */}
        <g>
          <path d="M150 152 C 190 170, 226 144, 262 160" fill="none" stroke="#A5B4FC" strokeWidth="1.6" strokeDasharray="5 6" strokeLinecap="round" opacity="0.85" />
          {!reduced && (
            <circle r="2.4" fill="#14B8A6" opacity="0.9">
              <animateMotion dur="2.6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" path="M150 152 C 190 170, 226 144, 262 160" begin="-0.9s" />
            </circle>
          )}
          {!reduced && (
            <circle r="2.4" fill="#818CF8" opacity="0.9">
              <animateMotion dur="2.6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" path="M150 152 C 190 170, 226 144, 262 160" begin="-1.8s" />
            </circle>
          )}
          {!reduced && (
            <circle r="2.4" fill="#F97316" opacity="0.9">
              <animateMotion dur="2.6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" path="M150 152 C 190 170, 226 144, 262 160" begin="-0.0s" />
            </circle>
          )}
        </g>

        {/* AI processing chip */}
        <g transform="rotate(-3 228 107)">
          <rect x="196" y="96" width="64" height="22" rx="11" fill="#FFFFFF" stroke="#C7D2FE" strokeWidth="1" filter="url(#hsh-sm)" opacity="0.96" />
          <circle cx="206" cy="107" r="3.4" fill="#F97316">
            {reduced ? undefined : <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />}
          </circle>
          <text x="228" y="110.8" textAnchor="middle" fontSize="8" fontWeight="700" fill="#4338CA">AI Processing</text>
        </g>

        {/* ===== DOCTOR TABLET ===== */}
        <g transform="rotate(-3 358 162)">
          <rect x="268" y="100" width="176" height="124" rx="16" fill="#1F1B38" filter="url(#hsh)" />
          <rect x="272" y="104" width="168" height="116" rx="10" fill="#FFFFFF" />

          {/* header */}
          <rect x="282" y="116" width="18" height="18" rx="5" fill="#4F46E5" />
          <text x="291" y="128.5" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#FFFFFF">MK</text>
          <text x="306" y="124" fontSize="9" fontWeight="700" fill="#1F1B38">Patient Summary</text>
          <text x="306" y="133" fontSize="6.5" fill="#7C75A3">Generated instantly</text>
          <rect x="392" y="115" width="40" height="15" rx="7.5" fill="#FFEDD5" />
          <text x="412" y="125.4" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#EA580C">URGENT</text>

          <line x1="282" y1="142" x2="432" y2="142" stroke="#F2F0FB" strokeWidth="1" />
          <text x="282" y="153" fontSize="6" fontWeight="700" letterSpacing="1" fill="#A7A0C9">CHIEF COMPLAINT</text>
          <text x="282" y="165" fontSize="11" fontWeight="700" fill="#1F1B38">Chest pain (retrosternal)</text>

          {/* stat tiles */}
          <rect x="282" y="174" width="73" height="24" rx="8" fill="#F8F7FF" stroke="#F2F0FB" strokeWidth="1" />
          <text x="291" y="185" fontSize="6" fontWeight="700" letterSpacing="0.8" fill="#A7A0C9">DURATION</text>
          <text x="291" y="194" fontSize="7.5" fontWeight="700" fill="#453F66">2 hrs &#183; Sudden</text>
          <rect x="361" y="174" width="71" height="24" rx="8" fill="#F8F7FF" stroke="#F2F0FB" strokeWidth="1" />
          <text x="370" y="185" fontSize="6" fontWeight="700" letterSpacing="0.8" fill="#A7A0C9">SEVERITY</text>
          <text x="370" y="194" fontSize="7.5" fontWeight="700" fill="#453F66">8/10 &#183; Radiating</text>

          {/* vitals chip */}
          <rect x="282" y="202" width="150" height="17" rx="8.5" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="0.8" />
          <circle cx="292" cy="210.5" r="3" fill="#4F46E5">
            {reduced ? undefined : <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />}
          </circle>
          <text x="301" y="214" fontSize="7" fontWeight="700" fill="#4338CA">BP 150/94 &#183; HR 96 &#183; SpO&#8322; 98%</text>
        </g>

        {/* ===== floating deco dots ===== */}
        <circle cx="398" cy="48" r="3" fill="#14B8A6" opacity="0.45" />
        <circle cx="422" cy="196" r="2.2" fill="#818CF8" opacity="0.5" />
        <circle cx="124" cy="18" r="2.2" fill="#F97316" opacity="0.4" />
      </svg>
    </div>
  );
}