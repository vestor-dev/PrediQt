'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, Users, TrendingUp, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';
import { Sparkline } from './sparkline';
import { relativeTime, formatPredq, cn } from '@/lib/utils';
import type { MarketInfo } from '@/hooks/use-markets';
import { AgentBadgeStrip, useAgentPositions } from './agent-positions';

/**
 * Premium market card — feels like a mini financial asset.
 * Sparkline + big probability + momentum + glassmorphic surface.
 */
export function MarketCard({
  market,
  index = 0,
  compact = false,
}: {
  market: MarketInfo;
  index?: number;
  compact?: boolean;
}) {
  const isOpen = market.status === 0;
  const isUp = market.yesPrice > 50;
  const wonYes = !isOpen && market.outcome;
  const wonNo = !isOpen && !market.outcome;
  const resolveLabel = relativeTime(market.resolveAt);
  const pool = formatPredq(market.totalDeposited, { compact: true });
  const { positions } = useAgentPositions(market.marketAddress);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        href={`/markets/${market.marketAddress}`}
        className={cn(
          'group relative block rounded-2xl overflow-hidden',
          'bg-canvas-elevated border transition-all duration-300 ease-out',
          'hover:shadow-card-hover hover:-translate-y-0.5 ring-focus',
          isOpen
            ? 'border-line shadow-card hover:border-line-strong'
            : wonYes
            ? 'border-up/30 shadow-card hover:border-up/50'
            : 'border-down/30 shadow-card hover:border-down/50',
        )}
      >
        {/* Top accent line — volt for open, outcome-colored bar for resolved */}
        <div className={cn(
          'absolute top-0 inset-x-0',
          isOpen ? 'h-[1px] bg-gradient-to-r from-transparent via-volt/50 to-transparent'
                 : wonYes ? 'h-[2px] bg-up' : 'h-[2px] bg-down',
        )} />

        {/* Resolved corner stamp */}
        {!isOpen && (
          <div className={cn(
            'absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-0.5',
            'rounded-md font-mono text-[10px] uppercase tracking-[0.14em] font-semibold',
            'border backdrop-blur-sm',
            wonYes
              ? 'bg-up/15 text-up border-up/30'
              : 'bg-down/15 text-down border-down/30',
          )}>
            {wonYes ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            resolved · {wonYes ? 'yes' : 'no'}
          </div>
        )}

        <div className={cn('relative', compact ? 'p-4' : 'p-5', !isOpen && 'pr-28')}>
          {/* Row 1: Status + Sparkline + Big % */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {isOpen ? (
                  <span className="inline-flex items-center gap-1.5 label text-up">
                    <span className="dot-live" />
                    live
                  </span>
                ) : (
                  <span className="label text-ink-ghost">settled</span>
                )}
                <span className="label text-ink-ghost">·</span>
                <span className="label flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {resolveLabel}
                </span>
              </div>
              <h3 className={cn(
                'font-sans font-medium leading-snug',
                'group-hover:text-volt transition-colors duration-300',
                compact ? 'text-sm' : 'text-[15px]',
                isOpen ? 'text-ink' : 'text-ink-dim',
              )}>
                {market.question}
              </h3>
            </div>

            {/* Big probability + sparkline (hidden when resolved — outcome chip carries the signal) */}
            {isOpen && (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className={cn(
                  'font-mono tabular font-semibold tracking-tight',
                  compact ? 'text-2xl' : 'text-3xl',
                  isUp ? 'text-up' : 'text-down',
                )}>
                  {market.yesPrice.toFixed(1)}%
                </div>
                <Sparkline
                  seed={market.marketAddress}
                  currentValue={market.yesPrice}
                  width={compact ? 56 : 72}
                  height={compact ? 20 : 24}
                />
              </div>
            )}
          </div>

          {/* Probability bar — solid winning-side fill when resolved */}
          <div className="prob-track mb-3">
            {isOpen ? (
              <div className="prob-fill-yes" style={{ width: `${market.yesPrice}%` }} />
            ) : (
              <div
                className={cn('h-full', wonYes ? 'bg-up' : 'bg-down')}
                style={{ width: '100%' }}
              />
            )}
          </div>

          {/* Row 2: Meta stats */}
          <div className="flex items-center justify-between gap-3 text-ink-muted">
            <div className="flex items-center gap-3 min-w-0">
              <span className="label flex items-center gap-1">
                <Users className="h-3 w-3" />
                {market.totalBettors}
              </span>
              <span className="label">·</span>
              <span className="label">{pool} predq</span>
              {!compact && (
                <>
                  <span className="label">·</span>
                  <span className={cn(
                    'label flex items-center gap-0.5',
                    isUp ? 'text-up' : 'text-down',
                  )}>
                    {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {isUp ? 'yes leads' : 'no leads'}
                  </span>
                </>
              )}
            </div>
            <AgentBadgeStrip positions={positions} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
