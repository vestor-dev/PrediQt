'use client';

import { useCredit } from '@/hooks/use-credit';
import { formatPredq } from '@/lib/utils';

export function BalancePill() {
  const { balance, status } = useCredit();
  return (
    <div className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg bg-canvas-elevated border border-line">
      <span className="w-1.5 h-1.5 rounded-full bg-volt animate-pulse-slow" />
      <span className="font-mono text-[11px] tabular tracking-wider">
        {status === 'decrypted' && balance !== null ? (
          <>
            <span className="text-volt">{formatPredq(balance, { compact: true })}</span>
            <span className="text-ink-ghost ml-1">PREDQ</span>
          </>
        ) : status === 'loading' ? (
          <span className="text-ink-ghost">…</span>
        ) : (
          <span className="text-ink-ghost">— PREDQ</span>
        )}
      </span>
    </div>
  );
}
