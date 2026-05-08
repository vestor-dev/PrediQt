'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function ProbabilityBar({
  yesPercent,
  size = 'md',
  showLabels = true,
  className,
}: {
  yesPercent: number;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, yesPercent));
  const noPercent = 100 - clamped;
  const heights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };
  const isUp = clamped >= 50;

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className={cn('relative w-full rounded-full overflow-hidden', heights[size])}
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: 'linear-gradient(90deg, #CAFF3C, #9BCC1F)' }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {showLabels && (
        <div className="flex justify-between font-mono text-[11px] tabular">
          <span className={cn(isUp ? 'text-up' : 'text-ink-muted')}>
            {clamped.toFixed(1)}% <span className="text-ink-ghost">yes</span>
          </span>
          <span className={cn(!isUp ? 'text-down' : 'text-ink-muted')}>
            <span className="text-ink-ghost">no</span> {noPercent.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
