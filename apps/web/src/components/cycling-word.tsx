'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface CyclingWordProps {
  words: string[];
  className?: string;
  intervalMs?: number;
}

/**
 * Cycles through a list of words, fading between them. Used in the hero to
 * say "Predict the future. <Privately|Encrypted|Together>."
 */
export function CyclingWord({ words, className, intervalMs = 2400 }: CyclingWordProps) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % words.length), intervalMs);
    return () => clearInterval(t);
  }, [words.length, intervalMs]);

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      {/* Reserve width using the longest word so layout never jumps. */}
      <span className="invisible">
        {words.reduce((a, b) => (a.length > b.length ? a : b))}
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[i]}
          initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
