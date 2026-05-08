'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ExternalLink, MessageCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AgentPosition {
  agent: string;
  wallet: string;
  side: 'yes' | 'no' | null;
  shares: string;
  amount: number;
  reason: string;
  timestamp: number;
  txHash?: string;
}

const AGENT_PALETTE: Record<string, { color: string; bg: string; border: string; glyph: string }> = {
  Quanta: { color: '#D9FF3C', bg: 'rgba(217,255,60,0.10)', border: 'rgba(217,255,60,0.30)', glyph: 'Q' },
  Hawk:   { color: '#FF8B3C', bg: 'rgba(255,139,60,0.10)',  border: 'rgba(255,139,60,0.30)',  glyph: 'H' },
  Doubt:  { color: '#7BD0FF', bg: 'rgba(123,208,255,0.10)', border: 'rgba(123,208,255,0.30)', glyph: 'D' },
};

function paletteFor(name: string) {
  return AGENT_PALETTE[name] ?? { color: '#888', bg: 'rgba(136,136,136,0.10)', border: 'rgba(136,136,136,0.30)', glyph: '?' };
}

export function useAgentPositions(marketAddress: string) {
  const [positions, setPositions] = useState<AgentPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!marketAddress) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/market-activity?address=${marketAddress}`);
        const data = await res.json();
        if (!cancelled) setPositions(data.positions ?? []);
      } catch (e) {
        console.error('[useAgentPositions]', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [marketAddress]);

  return { positions, loading };
}

/** Compact agent strip — used on MarketCard */
export function AgentBadgeStrip({ positions }: { positions: AgentPosition[] }) {
  const active = positions.filter((p) => p.side !== null);
  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {active.map((p) => {
          const pal = paletteFor(p.agent);
          return (
            <div
              key={p.agent}
              className="h-5 w-5 rounded-full grid place-items-center text-[9px] font-mono font-bold ring-2 ring-canvas-elevated"
              style={{ background: pal.bg, color: pal.color, border: `1px solid ${pal.border}` }}
              title={`${p.agent}: ${p.side?.toUpperCase()} ${p.shares}`}
            >
              {pal.glyph}
            </div>
          );
        })}
      </div>
      <span className="label flex items-center gap-1 text-ink-ghost">
        <Bot className="h-3 w-3" />
        {active.length} bot{active.length === 1 ? '' : 's'}
      </span>
    </div>
  );
}

/** Full agent positions panel — used on the market detail page */
export function AgentPositionsPanel({ marketAddress }: { marketAddress: string }) {
  const { positions, loading } = useAgentPositions(marketAddress);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const active = positions.filter((p) => p.side !== null);

  if (loading) {
    return (
      <div className="surface p-5 space-y-2">
        <div className="label flex items-center gap-1.5">
          <Bot className="h-3 w-3" /> Bot traders
        </div>
        <div className="space-y-2">
          <div className="skeleton h-12 rounded-lg" />
          <div className="skeleton h-12 rounded-lg" />
        </div>
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div className="surface p-5 space-y-2">
        <div className="label flex items-center gap-1.5">
          <Bot className="h-3 w-3" /> Bot traders
        </div>
        <p className="text-ink-ghost text-xs">No agent has bet on this market yet.</p>
      </div>
    );
  }

  return (
    <div className="surface p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="label flex items-center gap-1.5">
          <Bot className="h-3 w-3" /> Bot traders
        </div>
        <span className="font-mono text-[10px] tabular text-ink-ghost">
          {active.length} active
        </span>
      </div>

      <div className="space-y-2">
        {active.map((p) => {
          const pal = paletteFor(p.agent);
          const isExpanded = expandedAgent === p.agent;
          return (
            <motion.div
              key={p.agent}
              layout
              className={cn(
                'rounded-xl border bg-canvas-raised overflow-hidden transition-colors',
              )}
              style={{ borderColor: isExpanded ? pal.border : 'rgba(255,255,255,0.06)' }}
            >
              <button
                onClick={() => setExpandedAgent(isExpanded ? null : p.agent)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
              >
                <div
                  className="h-8 w-8 rounded-lg grid place-items-center font-display text-sm font-bold shrink-0"
                  style={{ background: pal.bg, color: pal.color, border: `1px solid ${pal.border}` }}
                >
                  {pal.glyph}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display tracking-crunch text-sm" style={{ color: pal.color }}>
                      {p.agent}
                    </span>
                    {p.amount > 0 && (
                      <span className="label text-ink-ghost">
                        bet {p.amount} predq
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={cn(
                        'font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded',
                        p.side === 'yes' ? 'bg-up-dim text-up' : 'bg-down-dim text-down',
                      )}
                    >
                      {p.side}
                    </span>
                    <span className="font-mono text-[11px] tabular text-ink-dim">
                      {p.shares} shares
                    </span>
                  </div>
                </div>
                {p.reason && (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-ink-ghost transition-transform',
                      isExpanded && 'rotate-180',
                    )}
                  />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && p.reason && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 space-y-2 border-t" style={{ borderColor: pal.border }}>
                      <div className="flex items-start gap-2">
                        <MessageCircle className="h-3 w-3 mt-1 shrink-0" style={{ color: pal.color }} />
                        <p className="text-ink-dim text-xs leading-relaxed italic">
                          "{p.reason}"
                        </p>
                      </div>
                      {p.txHash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${p.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] tabular text-ink-ghost hover:text-ink flex items-center gap-1 ml-5"
                        >
                          view tx <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
