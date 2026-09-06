/**
 * Navigation controller — history-state + back-button loader protocol.
 *
 * SPA/React edition of the protocol:
 *   [loader]  → the route shows its loader at the top of its entry stack
 *   [content] → the same route renders again after the loader hides
 *
 * Replaying the loader on BACK: the app records the route that was showing
 * before each `popstate`. When the user presses Back to a loader-page (the
 * landing `/`), the page mounts, peeks the replay flag, re-shows its Preloader,
 * and restores the scroll position saved the last time it unmounted.
 */

import { scrollToHash } from './smoothScroll';

const STORAGE = {
  scroll: 'mk_landing_scroll',
  replay: 'mk_landing_replay',
};

const LOADER_PAGE = '/';

let prevRoutePath = mountTimePath();
let replayPending = false;
let popTimer: number | null = null;

function mountTimePath(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.location.pathname;
  } catch {
    return '';
  }
}

/** Tag the current history entry with its loader-state role. */
export const initLoaderState = (page = 'content'): void => {
  if (typeof window === 'undefined') return;
  try {
    window.history.replaceState({ ...(window.history.state ?? {}), loaderState: page }, '');
  } catch {
    /* history may be unavailable in some embeds */
  }
};

/** Record the route that is showing right now (called on every route change). */
export const recordRoutePath = (path: string): void => {
  prevRoutePath = path;
};

function isLoaderPage(path: string): boolean {
  return path === LOADER_PAGE;
}

/**
 * Bind the popstate + pageshow handlers once (App mount).
 * Returns a disposer for unmount.
 */
export const installHistoryListener = (): (() => void) => {
  const onPop = (): void => {
    if (isLoaderPage(window.location.pathname) && !isLoaderPage(prevRoutePath)) {
      // Coming BACK to a loader page across routes → arm the replay.
      replayPending = true;
      try {
        sessionStorage.setItem(STORAGE.replay, '1');
      } catch {
        /* private mode */
      }
    } else {
      replayPending = false;
      try {
        sessionStorage.removeItem(STORAGE.replay);
      } catch {
        /* ignore */
      }
    }

    // If the pop landed on a hash anchor, scroll to it (300ms debounce so the
    // target route has a chance to render first).
    if (popTimer) window.clearTimeout(popTimer);
    popTimer = window.setTimeout(() => manualScrollByHash(), 300);
  };

  const onShow = (event: PageTransitionEvent): void => {
    // Restored from the back/forward cache: nothing to replay.
    if (event.persisted) {
      replayPending = false;
      try {
        sessionStorage.removeItem(STORAGE.replay);
      } catch {
        /* ignore */
      }
    }
  };

  window.addEventListener('popstate', onPop);
  window.addEventListener('pageshow', onShow);

  return () => {
    window.removeEventListener('popstate', onPop);
    window.removeEventListener('pageshow', onShow);
    if (popTimer) window.clearTimeout(popTimer);
  };
};

/** Export the raw hash-scroll used by the debounced pop handler. */
export const manualScrollByHash = (): void => {
  const raw = window.location.hash;
  if (!raw) return;
  const id = raw.startsWith('#') ? raw.slice(1) : raw;
  const el = document.getElementById(id) ?? document.querySelector(`[name="${id}"]`);
  if (!el) return;
  scrollToHash(id, -80);
};

/** Non-destructive read — used by the loader page's lazy state initializer. */
export const peekReplayLoader = (): boolean => {
  let stored = false;
  try {
    stored = sessionStorage.getItem(STORAGE.replay) === '1';
  } catch {
    /* ignore */
  }
  return replayPending || stored;
};

/** Clear the armed replay after the loader page has consumed it. */
export const clearReplayLoader = (): void => {
  replayPending = false;
  try {
    sessionStorage.removeItem(STORAGE.replay);
  } catch {
    /* ignore */
  }
};

/** Persist the loader page's scroll position before it unmounts. */
export const saveLoaderPageScroll = (): void => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE.scroll, String(window.scrollY || 0));
  } catch {
    /* ignore */
  }
};

/** Restore (and consume) the saved scroll position after the loader hides. */
export const restoreLoaderPageScroll = (): void => {
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(STORAGE.scroll);
    sessionStorage.removeItem(STORAGE.scroll);
  } catch {
    /* ignore */
  }
  if (saved !== null) {
    requestAnimationFrame(() => window.scrollTo(0, Number(saved)));
  }
};