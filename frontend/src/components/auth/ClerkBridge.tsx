import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useAuthStore } from '../../stores/authStore';

export default function ClerkBridge() {
  const { isLoaded, isSignedIn, user } = useUser();
  const syncFromClerk = useAuthStore((s) => s.syncFromClerk);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user) {
      void syncFromClerk({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        fullName: user.fullName ?? null,
        role: (user.publicMetadata?.role as string | undefined) ?? null,
        imageUrl: user.imageUrl ?? null,
      });
    } else {
      void syncFromClerk(null);
    }
  }, [isLoaded, isSignedIn, user, syncFromClerk]);

  return null;
}