/**
 * safety — high-risk self-harm language detection for the kiosk flow.
 *
 * MediKiosk does NOT diagnose and is NOT a substitute for emergency care.
 * When high-risk language is detected we: stop the normal AI conversation,
 * surface urgent help resources, and mark the case as high priority for
 * human clinical review.
 */

// Deliberately conservative: only unmistakable, high-risk phrases trigger.
// Both Devanagari and Romanized forms are included for the languages we
// primarily serve (Hindi/others rendered in Devanagari or Latin script).
const HIGH_RISK_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bkill\s+(myself|me|myself)\b/i, label: 'self harm' },
  { pattern: /\bsuicide\b/i, label: 'suicide' },
  { pattern: /\bend\s+(my\s+)?(own\s+)?life\b/i, label: 'self harm' },
  { pattern: /\bhurt\s+(myself|myself)/i, label: 'self harm' },
  { pattern: /\bharm\s+(myself|myself)/i, label: 'self harm' },
  { pattern: /\bwant\s+to\s+die\b/i, label: 'self harm' },
  { pattern: /\bdon['’]?t\s+want\s+to\s+live\b/i, label: 'self harm' },
  { pattern: /\bself[-\s]harm\b/i, label: 'self harm' },
  // Devanagari (Hindi):
  { pattern: /खुद\s*को\s*मार/i, label: 'self harm' },
  { pattern: /आत्महत्या/i, label: 'suicide' },
  { pattern: /जान\s*दे/i, label: 'self harm' },
  { pattern: /खुदकुशी/i, label: 'suicide' },
  // Romanized Hindi:
  { pattern: /\b(khud\s*ko|aapni?)\s*(mar|khatam)/i, label: 'self harm' },
  { pattern: /\bsuicide\s*(kar|lene)/i, label: 'suicide' },
];

/**
 * Returns the matched high-risk labels, or an empty array when the text does
 * not clearly express self-harm.
 */
export function detectSelfHarm(text: string): string[] {
  const labels: string[] = [];
  for (const { pattern, label } of HIGH_RISK_PATTERNS) {
    if (pattern.test(text)) {
      if (!labels.includes(label)) labels.push(label);
    }
  }
  return labels;
}

/** Official, publicly well-known Indian helplines (no private/fabricated numbers). */
export const CRISIS_RESOURCES = [
  { label: 'Ambulance (free nationwide)', number: '108', tel: 'tel:108' },
  { label: 'National Emergency', number: '112', tel: 'tel:112' },
  { label: 'Tele-MANAS — Govt of India mental health helpline', number: '14416', tel: 'tel:14416' },
];