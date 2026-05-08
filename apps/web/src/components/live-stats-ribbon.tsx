'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Bot, Coins, Users } from 'lucide-react';
import type { MarketInfo } from '@/hooks/use-markets';

interface Stats {
  markets: number;
  open: number;
  pool: number;          // total PREDQ across all markets (whole units)
  bettors: number;       // distinct bettor count (sum of per-market totals)
  agents: number;
}

function computeStats(markets: MarketInfo[]): Stats {
  let pool = 0;
  let bettors = 0;
  let open = 0;
  for (const m of markets) {
    pool += Number(m.totalDeposited) / 1_000_000;
    bettors += m.totalBettors;
    if (m.status === 0) open += 1;
  }
  return { markets: markets.length, open, pool: Math.floor(pool), bettors, agents: 3 };
}

/**
 * Animated odometer-style number — counts up from 0 to value.
 */
function CountUp({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // ease-out
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n.toLocaleString()}</>;
}

export function LiveStatsRibbon({ markets }: { markets: MarketInfo[] }) {
  const stats = computeStats(markets);
  const items = [
    { Icon: Activity, label: 'live markets', value: stats.open },
    { Icon: Coins, label: 'predq wagered', value: stats.pool },
    { Icon: Users, label: 'bettors', value: stats.bettors },
    { Icon: Bot, label: 'AI agents', value: stats.agents },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="inline-flex flex-wrap items-stretch rounded-2xl sm:rounded-full border border-line bg-canvas-elevated/70 backdrop-blur-md overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-line"
    >
      {items.map(({ Icon, label, value }) => (
        <div key={label} className="px-3 sm:px-4 py-2 flex items-center gap-2 min-w-[160px] sm:min-w-0 flex-1 sm:flex-none">
          <Icon className="h-3 w-3 text-volt shrink-0" />
          <span className="font-mono text-sm tabular text-ink font-semibold">
            <CountUp value={value} />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted truncate">
            {label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}
