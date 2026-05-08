'use client';

import { useAuthContext } from '@/providers/auth-provider';

export function useAuth() {
  const ctx = useAuthContext();
  // Convenience alias — landing/nav want a single signIn() that opens dialog.
  return {
    ...ctx,
    signIn: ctx.openSignIn,
  };
}
