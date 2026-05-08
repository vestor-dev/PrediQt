import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Truncate an Ethereum address to e.g. 0xabcd…1234 */
export function shortAddr(addr?: string | null, head = 4, tail = 4) {
  if (!addr) return '';
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, 2 + head)}…${addr.slice(-tail)}`;
}

/** Format PREDQ amount (raw uint64 with 6 decimals) → human string */
export function formatPredq(raw: bigint, opts: { compact?: boolean } = {}): string {
  const whole = raw / 1_000_000n;
  const frac = raw % 1_000_000n;

  if (opts.compact && whole >= 1_000_000n) {
    return `${(Number(whole) / 1_000_000).toFixed(2)}M`;
  }
  if (opts.compact && whole >= 1_000n) {
    return `${(Number(whole) / 1_000).toFixed(2)}K`;
  }

  if (frac === 0n) return whole.toString();
  // Trim trailing zeros from fractional part
  const fracStr = frac.toString().padStart(6, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

/** Format a Unix seconds timestamp → relative "in 3h" / "5m ago" */
export function relativeTime(ts: number | bigint, now = Date.now()): string {
  const target = Number(ts) * 1000;
  const diff = target - now;
  const abs = Math.abs(diff);
  const future = diff > 0;

  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${future ? 'in ' : ''}${days}d${future ? '' : ' ago'}`;
  if (hours > 0) return `${future ? 'in ' : ''}${hours}h${future ? '' : ' ago'}`;
  if (minutes > 0) return `${future ? 'in ' : ''}${minutes}m${future ? '' : ' ago'}`;
  return 'now';
}

/** Stable pseudo-random 0..1 from a string — for non-data UI fillers */
export function hashFloat(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}
