/**
 * usePageMeta — declarative document title + meta description + Open Graph
 * management. Lets every route own its unique <title> and description
 * without duplicating head logic or adding a heavy dependency.
 */

export interface PageMeta {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
}

const DEFAULT_META: PageMeta = {
  title: 'MediKiosk — AI-Powered Patient Intake',
  description:
    'MediKiosk is an AI-powered patient intake and clinical history platform designed to help hospitals collect structured patient information and support faster clinical triage.',
};

function setMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setProperty(property: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function applyPageMeta(meta: PageMeta) {
  const resolved = { ...DEFAULT_META, ...meta };
  document.title = resolved.title;

  if (resolved.description) {
    setMeta('description', resolved.description);
    setProperty('og:description', resolved.description);
    setMeta('twitter:description', resolved.description);
  }

  const title = resolved.title;
  setProperty('og:title', title);
  setMeta('twitter:title', title);
  setProperty('og:type', resolved.ogType ?? 'website');

  if (resolved.ogImage) {
    setProperty('og:image', resolved.ogImage);
    setMeta('twitter:image', resolved.ogImage);
  }

  const canonical = window.location.origin + window.location.pathname;
  let canonicalEl = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonical);
}

export function usePageMeta(meta: PageMeta) {
  if (typeof window !== 'undefined') {
    applyPageMeta(meta);
  }
}

/** Registry of every tracked route → its unique title + description. */
export const ROUTE_META: Record<string, PageMeta> = {
  '/': { title: 'MediKiosk — AI-Powered Patient Intake' },
  '/login': { title: 'MediKiosk | Sign In' },
  '/register': { title: 'MediKiosk | Patient Registration' },
  '/unauthorized': { title: 'MediKiosk | Access Restricted' },

  // Kiosk patient flow
  '/kiosk/home': { title: 'MediKiosk | Patient Check-in' },
  '/kiosk/language': { title: 'MediKiosk | Choose Language' },
  '/kiosk/identify': { title: 'MediKiosk | Patient Registration' },
  '/kiosk/consent': { title: 'MediKiosk | Consent & Data Notice' },
  '/kiosk/body-map': { title: 'MediKiosk | Symptom Body Map' },
  '/kiosk/interview': { title: 'MediKiosk | Clinical Interview' },
  '/kiosk/ayush': { title: 'MediKiosk | AYUSH Assessment' },
  '/kiosk/emergency': { title: 'MediKiosk | Emergency Care' },
  '/kiosk/documents': { title: 'MediKiosk | Medical Document Upload' },
  '/kiosk/summary': { title: 'MediKiosk | Clinical Summary' },

  // Patient portal
  '/patient': { title: 'MediKiosk | Patient Dashboard' },
  '/patient/dashboard': { title: 'MediKiosk | Patient Dashboard' },
  '/patient/book-opd': { title: 'MediKiosk | Book OPD Appointment' },
  '/patient/visits': { title: 'MediKiosk | My Visits' },
  '/patient/health-timeline': { title: 'MediKiosk | Health Timeline' },
  '/patient/documents': { title: 'MediKiosk | Documents Vault' },
  '/patient/profile': { title: 'MediKiosk | Patient Profile' },
  '/patient/kiosk': { title: 'MediKiosk | Patient Kiosk' },

  // Hospital admin portal
  '/hospital': { title: 'MediKiosk | Hospital Dashboard' },
  '/hospital/dashboard': { title: 'MediKiosk | Hospital Dashboard' },
  '/hospital/opd': { title: 'MediKiosk | Today\'s OPD' },
  '/hospital/triage': { title: 'MediKiosk | Triage' },
  '/hospital/queue': { title: 'MediKiosk | Queue Management' },
  '/hospital/doctors': { title: 'MediKiosk | Doctor Management' },
  '/hospital/departments': { title: 'MediKiosk | Department Management' },
  '/hospital/vitals': { title: 'MediKiosk | Vitals Monitor' },
  '/hospital/data-retention': { title: 'MediKiosk | Data Retention' },

  // Doctor portal
  '/doctor': { title: 'MediKiosk | Doctor Dashboard' },
  '/doctor/dashboard': { title: 'MediKiosk | Doctor Dashboard' },
  '/doctor/queue': { title: 'MediKiosk | Patient Queue' },
  '/doctor/patient': { title: 'MediKiosk | Patient Record' },
  '/doctor/schedule': { title: 'MediKiosk | Schedule' },
  '/doctor/scan-qr': { title: 'MediKiosk | QR Scan' },
  '/doctor/ocr': { title: 'MediKiosk | OCR Review' },

  // Legal / informational
  '/privacy-policy': { title: 'MediKiosk | Privacy Policy' },
  '/terms': { title: 'MediKiosk | Terms of Service' },
};