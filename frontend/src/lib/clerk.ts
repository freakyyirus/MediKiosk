export const isClerkConfigured = () => {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
  return key.startsWith('pk_');
};

export const clerkPublishableKey = (): string | undefined => {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
  return key.startsWith('pk_') ? key : undefined;
};

interface ClerkApiLike {
  signUp?: unknown;
  signIn?: unknown;
  loaded?: boolean;
}

const clerkGlobal = () =>
  (window as unknown as { Clerk?: ClerkApiLike | undefined }).Clerk;

const isClerkReady = (clerk: ClerkApiLike | undefined): boolean =>
  Boolean(clerk && (clerk.loaded === true || clerk.signUp || clerk.signIn));

/**
 * Wait until the Clerk JS instance has finished loading and exposes its
 * auth methods (signUp, signIn, etc.) on `window.Clerk`.
 * The global is populated asynchronously by ClerkProvider, so a click can
 * land before it's ready. Polls until ready or the timeout elapses.
 *
 * Prefer the official React hooks (`useSignUp`, `useSignIn`, `useClerk`)
 * inside components — they reflect the provider state exactly and never
 * require polling. This helper is only a fallback for the Zustand store,
 * which lives outside the React tree.
 */
export const waitForClerk = async (timeoutMs = 15000): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const clerk = clerkGlobal();
    if (isClerkReady(clerk)) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
};

export const getClerkApi = (): ClerkApiLike | undefined => {
  const clerk = clerkGlobal();
  return isClerkReady(clerk) ? clerk : undefined;
};