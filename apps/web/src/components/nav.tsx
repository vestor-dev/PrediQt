'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './q-mark';
import { MobileNav } from './mobile-nav';
import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';
import { BalancePill } from './balance-pill';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from './ui/dialog';
import { shortAddr, cn } from '@/lib/utils';
import { LogOut, Plus, Menu } from 'lucide-react';

const LINKS = [
  { href: '/pulse', label: 'Pulse' },
  { href: '/agents', label: 'Agents' },
  { href: '/profile', label: 'Profile' },
];

export function Nav() {
  const pathname = usePathname();
  const { address, status, signIn, signOut } = useAuth();
  const isAuthed = status === 'authenticated';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    setConfirmOpen(false);
    await signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between px-4 sm:px-5">
          {/* Left: brand + desktop links */}
          <div className="flex items-center gap-8">
            <Link href="/" className="ring-focus rounded-md">
              <Wordmark />
            </Link>
            {isAuthed && (
              <nav className="hidden md:flex items-center gap-0.5">
                {LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      'px-3 py-1.5 rounded-lg label transition-colors',
                      pathname?.startsWith(l.href)
                        ? 'text-volt bg-volt/8'
                        : 'text-ink-muted hover:text-ink hover:bg-canvas-elevated',
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Right: desktop controls + mobile burger */}
          <div className="flex items-center gap-2">
            {/* Desktop-only controls */}
            <div className="hidden md:flex items-center gap-2">
              {isAuthed ? (
                <>
                  <Link href="/rooms/new">
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3" />
                      Room
                    </Button>
                  </Link>
                  <BalancePill />
                  <div className="flex items-center gap-2 h-8 px-3 rounded-lg bg-canvas-elevated border border-line">
                    <span className="w-1.5 h-1.5 rounded-full bg-up" />
                    <span className="font-mono text-[11px] tabular text-ink-muted">
                      {shortAddr(address)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmOpen(true)}
                    aria-label="Sign out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="sm" onClick={signIn} loading={status === 'connecting'}>
                  Sign in
                </Button>
              )}
            </div>

            {/* Mobile: balance pill (compact) when authed + burger always */}
            <div className="flex md:hidden items-center gap-2">
              {isAuthed && <BalancePill />}
              {!isAuthed && (
                <Button variant="primary" size="sm" onClick={signIn} loading={status === 'connecting'}>
                  Sign in
                </Button>
              )}
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="h-9 w-9 grid place-items-center rounded-lg text-ink hover:bg-canvas-elevated transition-colors"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <MobileNav
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isAuthed={isAuthed}
        address={address ?? undefined}
        onSignOut={() => setConfirmOpen(true)}
        links={LINKS}
      />

      {/* Sign-out confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[340px]">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="shrink-0 h-10 w-10 rounded-xl bg-canvas-raised border border-line flex items-center justify-center text-down">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-[15px] font-sans font-semibold">
                Sign out?
              </DialogTitle>
              <DialogDescription>
                You&apos;ll need to sign in again to access your bets and rooms.
              </DialogDescription>
            </div>
          </div>

          <div className="rounded-xl bg-canvas-raised border border-line px-4 py-2.5 flex items-center justify-between mb-5">
            <span className="label">Wallet</span>
            <span className="font-mono text-sm tabular text-ink">
              {shortAddr(address)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="md"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
