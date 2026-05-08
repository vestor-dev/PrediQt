'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Lock } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EncryptedReveal } from './encrypted-reveal';
import { QMark } from './q-mark';
import { useCredit } from '@/hooks/use-credit';
import { useAuth } from '@/hooks/use-auth';
import { useEthBalance } from '@/hooks/use-eth-balance';
import { toast } from '@/components/ui/toaster';

type Phase = 'funding' | 'ready' | 'minting' | 'done';

/**
 * Onboarding — shown once to new users.
 * Auto-drips gas ETH from the deployer wallet, then prompts the PREDQ mint.
 */
export function OnboardingModal() {
  const { status: authStatus, address } = useAuth();
  const { hasClaimed, claimSignup, busy, balance } = useCredit();
  const eth = useEthBalance(3000);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('funding');
  const dripCalledRef = useRef(false);

  // Open when authenticated + unclaimed.
  useEffect(() => {
    if (authStatus === 'authenticated' && hasClaimed === false) {
      setOpen(true);
    } else if (hasClaimed === true) {
      setOpen(false);
    }
  }, [authStatus, hasClaimed]);

  // Auto-fund: call /api/faucet-gas once, then wait for balance to arrive.
  useEffect(() => {
    if (!open || !address || dripCalledRef.current) return;
    if (phase !== 'funding') return;
    dripCalledRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/faucet-gas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const data = await res.json();
        if (data.status === 'sufficient' || data.status === 'already_dripped') {
          setPhase('ready');
        }
        // else: drip sent, we wait for balance to update via polling.
      } catch (e) {
        console.error('[onboarding] faucet-gas failed', e);
        // fallback: advance anyway, let the mint fail and show error.
        setPhase('ready');
      }
    })();
  }, [open, address, phase]);

  // Advance from funding → ready once ETH lands.
  useEffect(() => {
    if (phase === 'funding' && eth.balance !== null && !eth.isZero) {
      setPhase('ready');
    }
  }, [phase, eth.balance, eth.isZero]);

  // Auto-close after success.
  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => setOpen(false), 2400);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleMint = async () => {
    setPhase('minting');
    try {
      await claimSignup();
      setPhase('done');
    } catch {
      setPhase('ready');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {phase === 'funding' && (
            <motion.div
              key="funding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 px-8 space-y-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              >
                <QMark size={48} />
              </motion.div>
              <DialogTitle className="text-center text-2xl">
                Setting you up…
              </DialogTitle>
              <p className="text-ink-dim text-sm text-center">
                Dripping gas ETH to your wallet so you can transact.
              </p>
              <div className="font-mono text-xs tabular text-ink-muted">
                <EncryptedReveal value="funding wallet…" duration={1200} />
              </div>
            </motion.div>
          )}

          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 space-y-7"
            >
              <div className="flex items-center justify-center pb-1">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <QMark size={56} />
                </motion.div>
              </div>
              <div className="text-center space-y-3">
                <DialogTitle>Welcome to Prediqt.</DialogTitle>
                <DialogDescription>
                  You&apos;re about to mint{' '}
                  <span className="text-volt font-mono">1,000 PREDQ</span> —
                  your private betting credits, encrypted to your wallet.
                </DialogDescription>
              </div>
              <ul className="space-y-3 pt-1">
                {[
                  ['Encrypted balance — only you can decrypt it', 'lock'],
                  ['Bet across public and private rooms', 'check'],
                  ['Weekly faucet replenishes 100 PREDQ', 'check'],
                ].map(([t, icon]) => (
                  <li key={t} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 text-volt">
                      {icon === 'lock' ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="text-ink-dim">{t}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full" onClick={handleMint} loading={busy}>
                <Sparkles className="h-4 w-4" />
                Mint my 1,000 PREDQ
              </Button>
              <p className="label-micro text-center">
                One-time · sepolia testnet
                {eth.pretty ? ` · gas funded (${eth.pretty})` : ''}
              </p>
            </motion.div>
          )}

          {phase === 'minting' && (
            <motion.div
              key="minting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-14 px-8 space-y-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <QMark size={56} />
              </motion.div>
              <DialogTitle className="text-center">
                Encrypting your credits…
              </DialogTitle>
              <p className="text-ink-dim text-sm font-mono text-center">
                FHE.add(0, 1000) → euint64 → wallet
              </p>
              <div className="font-mono text-xs tabular text-ink-muted">
                <EncryptedReveal value="awaiting confirmation…" duration={1400} />
              </div>
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-14 px-8 space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, ease: 'backOut' }}
                className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-volt/10 ring-1 ring-volt/40"
              >
                <Check className="h-7 w-7 text-volt" />
              </motion.div>
              <DialogTitle className="text-center">You&apos;re in.</DialogTitle>
              <div className="font-mono text-3xl tabular text-volt text-center">
                +
                <EncryptedReveal
                  value={balance ? formatBig(balance) : '1,000'}
                  duration={900}
                />{' '}
                <span className="text-ink-dim text-lg">PREDQ</span>
              </div>
              <p className="text-ink-dim text-sm text-center">
                Your balance is encrypted on-chain.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function formatBig(raw: bigint): string {
  const whole = raw / 1_000_000n;
  return whole.toLocaleString();
}
