'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { relativeTime, formatPredq, cn } from '@/lib/utils';
import type { MarketInfo } from '@/hooks/use-markets';

/**
 * Auto-scrolling band of compact market chips. Hover pauses the scroll.
 */
export function MarketsMarquee({ markets }: { markets: MarketInfo[] }) {
  if (markets.length === 0) return null;
  const loop = [...markets, ...markets, ...markets];
  const itemCount = markets.length;
  // Slow when many markets, faster when few — keeps perceived speed even.
  const duration = Math.max(28, itemCount * 6);

  return (
    <div className="relative overflow-hidden mask-fade-x py-2">
      <motion.div
        className="flex gap-3 hover:[animation-play-state:paused]"
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      >
        {loop.map((m, i) => {
          const isOpen = m.status === 0;
          const isUp = m.yesPrice > 50;
          return (
            <Link
              key={`${m.id.toString()}-${i}`}
              href={`/markets/${m.marketAddress}`}
              className={cn(
                'shrink-0 w-[300px] rounded-2xl border bg-canvas-elevated px-4 py-3.5',
                'transition-colors duration-200 hover:border-volt/40',
                isOpen ? 'border-line' : isUp ? 'border-up/30' : 'border-down/30',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {isOpen ? (
                  <span className="label flex items-center gap-1 text-up">
                    <span className="dot-live" /> live
                  </span>
                ) : (
                  <span className="label text-ink-muted">
                    {m.outcome ? 'YES won' : 'NO won'}
                  </span>
                )}
                <span className="label text-ink-muted">·</span>
                <span className="label flex items-center gap-1 text-ink-muted">
                  <Clock className="h-3 w-3" />
                  {relativeTime(m.resolveAt)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <p className="text-ink text-[13px] leading-snug line-clamp-2 flex-1">
                  {m.question}
                </p>
                <div className={cn(
                  'font-mono tabular font-bold text-xl tracking-tight shrink-0',
                  isUp ? 'text-up' : 'text-down',
                )}>
                  {m.yesPrice.toFixed(0)}%
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 label text-ink-muted">
                {isUp ? <TrendingUp className="h-3 w-3 text-up" /> : <TrendingDown className="h-3 w-3 text-down" />}
                <span>{formatPredq(m.totalDeposited, { compact: true })} pool</span>
                <span>·</span>
                <span>{m.totalBettors} bettors</span>
              </div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
