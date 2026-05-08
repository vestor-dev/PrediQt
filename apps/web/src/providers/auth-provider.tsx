'use client';

import * as React from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import {
  getWeb3Auth,
  connectWithEmail as _connectEmail,
  connectWithSocial as _connectSocial,
  type SocialProvider,
} from '@/lib/web3auth';
import { toast } from '@/components/ui/toaster';

export type AuthStatus =
  | 'idle'
  | 'initializing'
  | 'connecting'
  | 'authenticated'
  | 'error';

type AuthContextValue = {
  status: AuthStatus;
  address: string | null;
  signer: JsonRpcSigner | null;
  provider: BrowserProvider | null;
  signOut: () => Promise<void>;
  // Sign-in dialog control
  isSignInOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
  // Connection methods (called by the dialog)
  connectWithEmail: (email: string) => Promise<void>;
  connectWithSocial: (p: SocialProvider) => Promise<void>;
  error: string | null;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>('idle');
  const [address, setAddress] = React.useState<string | null>(null);
  const [signer, setSigner] = React.useState<JsonRpcSigner | null>(null);
  const [provider, setProvider] = React.useState<BrowserProvider | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isSignInOpen, setSignInOpen] = React.useState(false);

  // On mount: try to restore an existing session.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus('initializing');
        const w3a = await getWeb3Auth();
        if (cancelled) return;
        if (w3a.connected && w3a.provider) {
          await wireProvider(w3a.provider);
          setStatus('authenticated');
        } else {
          setStatus('idle');
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'init failed');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wireProvider = async (raw: any) => {
    const bp = new BrowserProvider(raw);
    const sg = await bp.getSigner();
    const addr = await sg.getAddress();
    setProvider(bp);
    setSigner(sg);
    setAddress(addr);
  };

  const completeConnect = React.useCallback(async (raw: any) => {
    if (!raw) throw new Error('Web3Auth returned no provider');
    await wireProvider(raw);
    setStatus('authenticated');
    setSignInOpen(false);
  }, []);

  const connectWithEmail = React.useCallback(
    async (email: string) => {
      try {
        setStatus('connecting');
        setError(null);
        const raw = await _connectEmail(email);
        await completeConnect(raw);
      } catch (e: any) {
        const msg = e?.message ?? 'connect failed';
        setError(msg);
        setStatus('idle');
        toast({
          title: 'Sign-in failed',
          description: msg.length > 120 ? msg.slice(0, 117) + '…' : msg,
          variant: 'error',
        });
      }
    },
    [completeConnect],
  );

  const connectWithSocial = React.useCallback(
    async (p: SocialProvider) => {
      try {
        setStatus('connecting');
        setError(null);
        const raw = await _connectSocial(p);
        await completeConnect(raw);
      } catch (e: any) {
        const msg = e?.message ?? 'connect failed';
        setError(msg);
        setStatus('idle');
        toast({
          title: 'Sign-in failed',
          description: msg.length > 120 ? msg.slice(0, 117) + '…' : msg,
          variant: 'error',
        });
      }
    },
    [completeConnect],
  );

  const signOut = React.useCallback(async () => {
    try {
      const w3a = await getWeb3Auth();
      await w3a.logout();
    } catch {
      /* ignore */
    }
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setStatus('idle');
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      address,
      signer,
      provider,
      error,
      signOut,
      isSignInOpen,
      openSignIn: () => setSignInOpen(true),
      closeSignIn: () => setSignInOpen(false),
      connectWithEmail,
      connectWithSocial,
    }),
    [
      status,
      address,
      signer,
      provider,
      error,
      signOut,
      isSignInOpen,
      connectWithEmail,
      connectWithSocial,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
