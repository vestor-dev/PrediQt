'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, LogOut, ArrowUpRight } from 'lucide-react';
import { cn, shortAddr } from '@/lib/utils';
import { Button } from './ui/button';
import { QMark } from './q-mark';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  isAuthed: boolean;
  address?: string;
  onSignOut: () => void;
  links: { href: string; label: string }[];
}

export function MobileNav({
  open,
  onClose,
  isAuthed,
  address,
  onSignOut,
  links,
}: MobileNavProps) {
  const pathname = usePathname();

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm md:hidden"
          />
          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[88%] max-w-[360px] bg-canvas-elevated border-l border-line flex flex-col md:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-14 px-5 border-b border-line">
              <Link href="/" onClick={onClose} className="flex items-center gap-2">
                <QMark size={22} />
                <span className="font-display text-xl tracking-crunch text-ink leading-none">
                  prediqt
                </span>
              </Link>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="h-9 w-9 grid place-items-center rounded-lg text-ink-secondary hover:text-ink hover:bg-canvas-raised transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
              {isAuthed && links.map((l) => {
                const active = pathname?.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-xl transition-colors',
                      active
                        ? 'bg-volt/10 text-volt'
                        : 'text-ink hover:bg-canvas-raised',
                    )}
                  >
                    <span className="font-display text-xl tracking-crunch">{l.label}</span>
                    <ArrowUpRight
                      className={cn(
                        'h-4 w-4 transition-opacity',
                        active ? 'opacity-100' : 'opacity-30',
                      )}
                    />
                  </Link>
                );
              })}

              {!isAuthed && (
                <div className="px-2 py-4 space-y-3">
                  <p className="text-ink-secondary text-sm leading-relaxed px-2">
                    Sign in to browse rooms, place bets, and watch the bots.
                  </p>
                </div>
              )}

              {/* Secondary links */}
              <div className="pt-4 mt-4 border-t border-line space-y-1">
                <Link
                  href="/"
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl text-ink-secondary hover:text-ink hover:bg-canvas-raised transition-colors"
                >
                  <span className="font-mono text-[12px] uppercase tracking-[0.14em]">home</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-40" />
                </Link>
                {isAuthed && (
                  <Link
                    href="/rooms/new"
                    onClick={onClose}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl text-ink-secondary hover:text-ink hover:bg-canvas-raised transition-colors"
                  >
                    <span className="font-mono text-[12px] uppercase tracking-[0.14em]">new room</span>
                    <Plus className="h-3.5 w-3.5 opacity-40" />
                  </Link>
                )}
              </div>
            </nav>

            {/* Footer */}
            <div className="border-t border-line p-4 space-y-3">
              {isAuthed ? (
                <>
                  <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-canvas-raised border border-line">
                    <span className="w-1.5 h-1.5 rounded-full bg-up" />
                    <span className="font-mono text-[11px] tabular text-ink-secondary flex-1 truncate">
                      {address ? shortAddr(address) : 'wallet'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="md"
                    className="w-full justify-start"
                    onClick={() => { onClose(); onSignOut(); }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    sign out
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => { onClose(); /* trigger signIn from parent via custom event? simpler: leave it on the nav button */ }}
                >
                  Open the app from the main page
                </Button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
