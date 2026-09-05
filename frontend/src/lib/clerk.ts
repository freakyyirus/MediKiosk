export const isClerkConfigured = () => {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
  return key.startsWith('pk_');
};

export const clerkPublishableKey = (): string | undefined => {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
  return key.startsWith('pk_') ? key : undefined;
};