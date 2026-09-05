export {};

type ClerkSignUpInstance = {
  create: (p: {
    emailAddress: string;
    password: string;
    firstName: string;
    publicMetadata: Record<string, unknown>;
  }) => Promise<{ status: string; createdSessionId?: string | null }>;
  prepareEmailAddressVerification: (p: { strategy: 'email_code' }) => Promise<unknown>;
  attemptEmailAddressVerification: (p: { code: string }) => Promise<{ status: string; createdSessionId?: string | null }>;
};

declare global {
  interface Window {
    Clerk?: {
      user?: unknown;
      signIn?: {
        create: (p: { identifier: string; password: string }) => Promise<{ status?: string; createdSessionId?: string | null }>;
      };
      signOut?: (opts?: { redirectUrl?: string }) => Promise<void>;
      setActive?: (p: { session?: string | null }) => Promise<unknown>;
      signUp?: ClerkSignUpInstance;
    };
  }
}