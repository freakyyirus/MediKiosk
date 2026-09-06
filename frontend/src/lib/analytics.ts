const DENY = /name|phone|abha|aadhaar|symptom|prescrip|diagnos|ocr|summary|medication|blood|gender|dob|email/i;

function getAnonymousId(): string {
  try {
    let id = sessionStorage.getItem('mk_anon_id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('mk_anon_id', id);
    }
    return id;
  } catch {
    return 'fallback';
  }
}

export function track(event: string, props?: Record<string, string | number | boolean>) {
  try {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
    if (!endpoint) return;

    const filtered: Record<string, string | number | boolean> = {};
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (!DENY.test(k)) {
          filtered[k] = v;
        }
      }
    }

    const payload = {
      event,
      props: filtered,
      path: window.location.pathname,
      ts: Date.now(),
      session_id: getAnonymousId(),
    };

    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      if (sent) return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // analytics must never break the app
  }
}

export function trackPageView() {
  track('page_view', { path: window.location.pathname });
}
