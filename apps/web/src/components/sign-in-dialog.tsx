'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Lock } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QMark } from './q-mark';
import { SocialIcon } from './social-icons';
import { useAuthContext } from '@/providers/auth-provider';
import {
  SOCIAL_PROVIDERS,
  providerLabel,
  type SocialProvider,
} from '@/lib/web3auth';
import { cn } from '@/lib/utils';

/**
 * Custom on-brand sign-in dialog. Renders our own UI and dispatches to
 * Web3Auth (no-modal) under the hood — no third-party-styled chrome.
 */
export function SignInDialog() {
  const {
    isSignInOpen,
    closeSignIn,
    connectWithEmail,
    connectWithSocial,
    status,
  } = useAuthContext();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'email' | SocialProvider | null>(null);

  const isConnecting = status === 'connecting' || busy !== null;

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setBusy('email');
    try {
      await connectWithEmail(email.trim().toLowerCase());
    } finally {
      setBusy(null);
    }
  };

  const handleSocial = async (p: SocialProvider) => {
    setBusy(p);
    try {
      await connectWithSocial(p);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={isSignInOpen} onOpenChange={(o) => !o && closeSignIn()}>
      <DialogContent className="max-w-[440px] p-0 overflow-y-auto">
        {/* Header band — minimal, editorial */}
        <div className="relative px-8 pt-9 pb-7 border-b border-line">
          <div
            aria-hidden
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at top right, rgba(217,255,60,0.06) 0%, transparent 60%)',
            }}
          />
          <div className="relative flex items-start gap-4">
            <motion.div
              initial={{ rotate: -8, scale: 0.85, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <QMark size={36} />
            </motion.div>
            <div className="flex-1 pt-0.5">
              <DialogTitle className="text-3xl">
                Step <span className="italic text-volt">in.</span>
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-xs">
                Your account is a key, not a profile. No passwords stored.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-7 space-y-6">
          <AnimatePresence mode="wait">
            {isConnecting ? (
              <motion.div
                key="connecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-4 text-center space-y-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="mx-auto w-fit"
                >
                  <QMark size={32} />
                </motion.div>
                <div className="text-sm text-ink-dim font-mono">
                  {busy === 'email'
                    ? 'check your email for a magic link'
                    : busy
                      ? `redirecting to ${providerLabel(busy as SocialProvider)}…`
                      : 'connecting…'}
                </div>
                <button
                  onClick={closeSignIn}
                  className="text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline transition-colors"
                >
                  cancel
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Email */}
                <form onSubmit={handleEmail} className="space-y-3">
                  <label className="label-micro flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    Email
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="you@somewhere.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      autoComplete="email"
                      className="pr-12 h-12"
                      required
                    />
                    <button
                      type="submit"
                      disabled={!email.includes('@')}
                      aria-label="Continue with email"
                      className={cn(
                        'absolute right-1.5 top-1.5 h-9 w-9 rounded-lg grid place-items-center transition-all',
                        email.includes('@')
                          ? 'bg-volt text-canvas hover:bg-volt-glow active:scale-95'
                          : 'bg-line text-ink-muted cursor-not-allowed',
                      )}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="label-micro">
                    We&apos;ll send a one-time magic link.
                  </p>
                </form>

                {/* Divider */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
                  <span className="relative bg-canvas-raised px-3 label-micro">
                    or continue with
                  </span>
                </div>

                {/* Social providers — 2x grid feels designed, not crammed */}
                <div className="grid grid-cols-2 gap-2">
                  {SOCIAL_PROVIDERS.map((p) => (
                    <SocialButton
                      key={p}
                      provider={p}
                      onClick={() => handleSocial(p)}
                    />
                  ))}
                </div>

                {/* Trust line */}
                <div className="flex items-center justify-center gap-2 pt-2 label-micro">
                  <Lock className="h-2.5 w-2.5" />
                  Powered by Web3Auth · Sapphire Devnet
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SocialButton({
  provider,
  onClick,
}: {
  provider: SocialProvider;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex items-center justify-center gap-2 h-11 rounded-xl',
        'border border-line bg-canvas hover:bg-canvas-raised',
        'transition-all duration-200 hover:border-line-strong',
        'ring-focus',
      )}
    >
      <SocialIcon provider={provider} className="text-ink-dim group-hover:text-ink transition-colors" />
      <span className="font-mono text-xs uppercase tracking-wider text-ink-dim group-hover:text-ink">
        {providerLabel(provider)}
      </span>
    </button>
  );
}
