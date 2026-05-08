'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Copy, Droplet, Wallet, Activity, Bot, Users, ArrowUpRight } from 'lucide-react';

import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { AuthGate } from '@/components/auth-gate';
import { Button } from '@/components/ui/button';
import { EncryptedReveal } from '@/components/encrypted-reveal';
import { MarketCard } from '@/components/market-card';
import { QMark } from '@/components/q-mark';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useAuth } from '@/hooks/use-auth';
import { useCredit } from '@/hooks/use-credit';
import { useMyRooms } from '@/hooks/use-rooms';
import { useMyBets } from '@/hooks/use-markets';
import { formatPredq, shortAddr } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

export default function ProfilePage() {
  return (
    <main className="relative min-h-screen flex flex-col bg-canvas">
      <Nav />
      <AuthGate><ProfileContent /></AuthGate>
      <Footer />
    </main>
  );
}

function ProfileContent() {
  const { address } = useAuth();
  const { balance, status, claimFaucet, busy, hasClaimed } = useCredit();
  const myRooms = useMyRooms();
  const { myBets: myMarkets, loading: betsLoading } = useMyBets();
  const [showFaucetConfirm, setShowFaucetConfirm] = useState(false);

  const copyAddr = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast({ title: 'Copied', description: shortAddr(address, 6, 6) });
  };

  return (
    <section className="flex-1 px-5 pt-10 pb-20">
      <div className="mx-auto max-w-[1320px]">
        {/* Portfolio card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="surface p-8 md:p-10 mb-10 relative overflow-hidden">
          <div aria-hidden className="absolute -top-20 -right-16 opacity-[0.03] pointer-events-none">
            <QMark size={320} />
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div className="space-y-4">
              <div className="label flex items-center gap-2"><Wallet className="h-3 w-3" /> Portfolio</div>
              <div className="space-y-1">
                <div className="font-mono text-sm tabular text-ink-muted">{shortAddr(address ?? '', 8, 6)}</div>
                <div className="font-mono text-5xl md:text-6xl tabular font-bold tracking-tightest leading-none">
                  {status === 'decrypted' && balance !== null ? (
                    <EncryptedReveal value={formatPredq(balance)} className="text-volt" duration={800} />
                  ) : <span className="text-ink-ghost">—</span>}
                </div>
                <div className="label mt-1">PREDQ balance</div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={copyAddr}><Copy className="h-3 w-3" /> Copy</Button>
                {hasClaimed && (
                  <Button variant="ghost" size="sm" onClick={() => setShowFaucetConfirm(true)}>
                    <Droplet className="h-3 w-3" /> +100 Faucet
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Markets" value={myMarkets.length.toString()} />
              <StatTile label="Rooms" value={myRooms.rooms.length.toString()} />
              <StatTile label="Rank" value="—" />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Markets */}
          <div className="lg:col-span-8 space-y-4">
            <div className="label flex items-center gap-2"><Activity className="h-3 w-3" /> Active bets</div>
            {betsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
              </div>
            ) : myMarkets.length === 0 ? (
              <div className="surface-glass text-center py-16 space-y-3">
                <QMark size={32} className="mx-auto opacity-20" />
                <p className="text-ink-muted text-sm">Markets you bet on will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myMarkets.map((m, i) => <MarketCard key={m.id.toString()} market={m} index={i} />)}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="surface p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="label flex items-center gap-2"><Users className="h-3 w-3" /> Rooms</div>
                <span className="font-mono text-[11px] tabular text-ink-ghost">{myRooms.rooms.length}</span>
              </div>
              {myRooms.rooms.length === 0 ? (
                <p className="text-ink-muted text-sm">Join a room or create one.</p>
              ) : (
                <div className="space-y-1.5">
                  {myRooms.rooms.map((r) => (
                    <Link key={r.id.toString()} href={`/rooms/${r.id}`}
                      className="flex items-center justify-between rounded-lg bg-canvas-raised border border-line p-3 hover:border-line-strong transition-colors group">
                      <span className="font-sans text-sm font-medium group-hover:text-volt transition-colors">{r.name}</span>
                      <ArrowUpRight className="h-3 w-3 text-ink-ghost group-hover:text-volt" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="surface p-5">
              <div className="label flex items-center gap-2 mb-2"><Bot className="h-3 w-3" /> AI agents</div>
              <p className="text-ink-muted text-sm">Deploy strategy agents. Coming Week 4.</p>
            </div>
          </aside>
        </div>
        <ConfirmDialog
          open={showFaucetConfirm}
          onClose={() => setShowFaucetConfirm(false)}
          onConfirm={async () => { setShowFaucetConfirm(false); await claimFaucet(); }}
          loading={busy}
          icon={<Droplet className="h-5 w-5" />}
          title="Claim weekly faucet?"
          description="This mints 100 PREDQ to your encrypted balance. Available once per week."
          details={[
            { label: 'Amount', value: '+100 PREDQ', accent: 'volt' },
            { label: 'Cooldown', value: '7 days' },
          ]}
          confirmLabel="Claim 100 PREDQ"
        />
      </div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-canvas-raised border border-line p-4 text-center">
      <div className="font-mono text-2xl tabular font-semibold text-ink">{value}</div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}
