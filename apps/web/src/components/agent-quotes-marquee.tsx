'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import type { ActivityRecord } from '@/lib/agent-activity';

const PALETTE: Record<string, { color: string; bg: string; border: string; glyph: string }> = {
  Quanta: { color: '#D9FF3C', bg: 'rgba(217,255,60,0.10)', border: 'rgba(217,255,60,0.30)', glyph: 'Q' },
  Hawk:   { color: '#FF8B3C', bg: 'rgba(255,139,60,0.10)', border: 'rgba(255,139,60,0.30)', glyph: 'H' },
  Doubt:  { color: '#7BD0FF', bg: 'rgba(123,208,255,0.10)', border: 'rgba(123,208,255,0.30)', glyph: 'D' },
};

const FALLBACK_QUOTES = [
  { agent: 'Quanta', side: 'no', amount: 10, question: 'Will BTC reach 200 before year ends?', reason: '' },
  { agent: 'Hawk',   side: 'yes', amount: 20, question: 'Will Brazil win the world cup?', reason: '' },
  { agent: 'Doubt',  side: 'no', amount: 15, question: 'Will Solana reach $200 by end of May?', reason: '' },
];

/**
 * Infinite-scrolling marquee of recent agent activity. Pulled live from the
 * `/api/agent-activity` endpoint and refreshed every 20s.
 */
export function AgentQuotesMarquee() {
  const [quotes, setQuotes] = useState<ActivityRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/agent-activity?limit=20');
        const data = await res.json();
        if (!cancelled) {
          const bets = (data.recent ?? []).filter((r: ActivityRecord) => r.kind === 'bet');
          setQuotes(bets);
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 20_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const items = quotes && quotes.length > 0 ? quotes : (FALLBACK_QUOTES as any[]);
  // Duplicate so the marquee can loop seamlessly.
  const loop = [...items, ...items, ...items];

  return (
    <div className="relative overflow-hidden mask-fade-x">
      <motion.div
        className="flex gap-3 py-1"
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
      >
        {loop.map((q, i) => {
          const pal = PALETTE[q.agent] ?? { color: '#888', bg: 'rgba(136,136,136,0.10)', border: 'rgba(136,136,136,0.30)', glyph: '?' };
          return (
            <div
              key={i}
              className="shrink-0 flex items-center gap-3 rounded-full border bg-canvas-raised px-4 py-2"
              style={{ borderColor: pal.border }}
            >
              <div
                className="h-6 w-6 rounded-full grid place-items-center font-mono text-[10px] font-bold shrink-0"
                style={{ background: pal.bg, color: pal.color }}
              >
                {pal.glyph}
              </div>
              <div className="flex items-center gap-2 text-[12px] whitespace-nowrap">
                <span className="font-display tracking-crunch font-medium" style={{ color: pal.color }}>
                  {q.agent}
                </span>
                <span className="text-ink-muted">staked</span>
                <span
                  className={`font-mono tabular text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    q.side === 'yes' ? 'bg-up-dim text-up' : 'bg-down-dim text-down'
                  }`}
                >
                  {q.amount} {q.side}
                </span>
                <span className="text-ink-muted">on</span>
                <span className="text-ink italic max-w-[280px] truncate">"{q.question}"</span>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
