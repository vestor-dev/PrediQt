'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const CIPHER_CHARS = '0123456789ABCDEF░▒▓█▪▫';

/**
 * Encrypted-reveal — a string that "decrypts" on mount.
 * Each character cycles through random ciphertext for a moment before
 * settling on its true glyph, with a stagger across the string.
 *
 * Used anywhere we display data that came from an FHE handle — visually
 * reinforces the "this was encrypted, now decrypted just for you" story.
 */
export function EncryptedReveal({
  value,
  duration = 800,
  delay = 0,
  className,
  monoClass = 'font-mono',
}: {
  value: string;
  duration?: number;
  delay?: number;
  className?: string;
  monoClass?: string;
}) {
  const [displayed, setDisplayed] = useState(value);
  const rafRef = useRef<number>();
  const startedRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const target = value;

    const tick = (now: number) => {
      if (cancelled) return;
      if (startedRef.current === null) startedRef.current = now + delay;
      const elapsed = now - startedRef.current;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const chars = target.split('').map((ch, i) => {
        // Each character settles at progress >= (i / target.length)
        const settleAt = i / Math.max(target.length, 1);
        if (progress >= settleAt + 0.02) return ch;
        if (ch === ' ' || ch === '\n') return ch;
        return CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
      });
      setDisplayed(chars.join(''));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayed(target);
      }
    };

    startedRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, delay]);

  return <span className={cn(monoClass, 'tabular', className)}>{displayed}</span>;
}
