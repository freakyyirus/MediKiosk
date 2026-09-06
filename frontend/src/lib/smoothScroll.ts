/**
 * Scroll helpers — native scrolling (Lenis smooth-scroll is intentionally
 * disabled: wheel input goes straight to the browser for the fastest feel).
 *
 * All helpers degrade to native browser scrolling; the API is kept so call
 * sites (nav, preloader, navigationController) work unchanged.
 */

export const isSmoothScrollActive = (): boolean => false;

/** Start smooth scroll. No-op (returns a no-op disposer) — native scroll. */
export const initSmoothScroll = (): (() => void) => {
  return () => {};
};

/** Freeze body scroll (modal/drawer open). */
export const lockScroll = (): void => {
  document.body.style.overflow = 'hidden';
};

/** Restore body scroll (modal/drawer closed). */
export const unlockScroll = (): void => {
  document.body.style.overflow = '';
};

/** Re-enable scrolling after a bfcache restore. No-op with native scroll. */
export const resumeSmoothScroll = (): void => {};

/** Scroll to the top, instantly (native smooth glides too slowly). */
export const scrollToTop = (): void => {
  window.scrollTo({ top: 0, behavior: 'auto' });
};

/**
 * Scroll to an anchor/hash element. Instant jump (native) — no Lenis, and
 * native smooth is avoided because it glides slowly.
 */
export const scrollToHash = (hashOrId: string, offset = -80): void => {
  if (!hashOrId) return;
  const selector = hashOrId.startsWith('#') ? hashOrId : `#${hashOrId}`;
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'auto' });
};