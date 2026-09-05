export const isClerkConfigured = () => {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
  return key.startsWith('pk_');
};

export const clerkPublishableKey = (): string | undefined => {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
  return key.startsWith('pk_') ? key : undefined;
};

/**
 * Wait until the Clerk JS instance has finished loading and exposes its
 * auth methods (signUp, signIn, etc.) on `window.Clerk`.
 * The global is populated asynchronously by ClerkProvider, so a click can
 * land before it's ready. Polls until ready or the timeout elapses.
 */
export const waitForClerk = async (timeoutMs = 10000): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const clerk = (window as unknown as { Clerk?: { signUp?: unknown } | undefined }).Clerk;
    if (clerk?.signUp) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
};