'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Tiny SVG sparkline — green when trending up, red when down.
 * Generates a deterministic "price history" from a seed string so
 * each market gets a unique but stable chart shape.
 */
export function Sparkline({
  seed,
  points = 24,
  width = 80,
  height = 28,
  currentValue = 50,
  className,
}: {
  seed: string;
  points?: number;
  width?: number;
  height?: number;
  currentValue?: number;
  className?: string;
}) {
  const data = useMemo(() => generateData(seed, points, currentValue), [seed, points, currentValue]);
  const isUp = data[data.length - 1] >= data[0];
  const color = isUp ? '#22C55E' : '#EF4444';
  const dimColor = isUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const pathPoints = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const linePath = `M${pathPoints.join(' L')}`;
  const areaPath = `${linePath} L${width - pad},${height} L${pad},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-fill-${seed.slice(0, 8)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dimColor} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-fill-${seed.slice(0, 8)})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle cx={width - pad} cy={pad + (1 - (data[data.length - 1] - min) / range) * (height - pad * 2)} r="2" fill={color} />
    </svg>
  );
}

/** Deterministic pseudo-random number from string seed */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function generateData(seed: string, points: number, currentValue: number): number[] {
  const data: number[] = [];
  let h = hash(seed);
  let val = currentValue - 10 + (h % 20);

  for (let i = 0; i < points; i++) {
    h = ((h * 1103515245 + 12345) >>> 0) & 0x7fffffff;
    const delta = ((h % 100) - 50) / 25;
    val = Math.max(2, Math.min(98, val + delta));
    data.push(val);
  }
  // Ensure the last point matches currentValue
  data[data.length - 1] = currentValue;
  return data;
}
