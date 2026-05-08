'use client';

import { useEffect, useRef, useState } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789?!@#$%&*';

interface ScrambleTextProps {
  children: string;
  className?: string;
  /** Time per character to settle (ms). */
  speed?: number;
  /** Random characters to cycle through before each char locks in. */
  steps?: number;
  /** Trigger to restart the scramble (e.g. on hover or on mount). */
  trigger?: number;
}

/**
 * Letter-by-letter text scramble — ASCII chars cycle then settle on the real
 * letter. Used for marquee headlines so the page lands with motion instead of
 * a static title.
 */
export function ScrambleText({
  children,
  className,
  speed = 35,
  steps = 8,
  trigger = 0,
}: ScrambleTextProps) {
  const target = children;
  const [display, setDisplay] = useState(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let i = 0;
    let stepsLeft = steps;
    setDisplay('');

    const tick = () => {
      // Build a string: [resolved chars] + [random char] + [random tail]
      const resolved = target.slice(0, i);
      const tail = Array.from({ length: Math.max(0, target.length - i - 1) })
        .map(() => CHARS[Math.floor(Math.random() * CHARS.length)])
        .join('');
      const cur = i < target.length
        ? CHARS[Math.floor(Math.random() * CHARS.length)]
        : '';
      setDisplay(resolved + cur + tail);

      if (i >= target.length) return;

      stepsLeft -= 1;
      if (stepsLeft <= 0) {
        i += 1;
        stepsLeft = steps;
      }
      frameRef.current = window.setTimeout(tick, speed) as unknown as number;
    };

    frameRef.current = window.setTimeout(tick, speed) as unknown as number;

    return () => {
      if (frameRef.current !== null) clearTimeout(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, trigger]);

  return <span className={className}>{display || ' '}</span>;
}
