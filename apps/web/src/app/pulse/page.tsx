'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, TrendingUp, Globe2, Lock } from 'lucide-react';

import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { AuthGate } from '@/components/auth-gate';
import { OnboardingModal } from '@/components/onboarding-modal';
import { MarketCard } from '@/components/market-card';
import { RoomCard } from '@/components/room-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QMark } from '@/components/q-mark';
import { usePublicRooms, useMyRooms } from '@/hooks/use-rooms';
import { useAllMarkets } from '@/hooks/use-markets';
import { cn } from '@/lib/utils';

type Tab = 'markets' | 'rooms' | 'mine';

export default function PulsePage() {
  return (
    <main className="relative min-h-screen flex flex-col bg-canvas">
      <Nav />
      <AuthGate>
        <OnboardingModal />
        <PulseContent />
      </AuthGate>
      <Footer />
    </main>
  );
}

function PulseContent() {
  const [tab, setTab] = useState<Tab>('markets');
  const [query, setQuery] = useState('');
  const publicRooms = usePublicRooms();
  const myRooms = useMyRooms();
  const allMarkets = useAllMarkets();

  const filteredRooms = (tab === 'rooms' ? publicRooms.rooms : myRooms.rooms).filter((r) =>
    query.trim() ? r.name.toLowerCase().includes(query.toLowerCase()) : true,
  );
  const filteredMarkets = allMarkets.markets.filter((m) =>
    query.trim() ? m.question.toLowerCase().includes(query.toLowerCase()) : true,
  );
  const openMarkets = filteredMarkets.filter((m) => m.status === 0);
  const resolvedMarkets = filteredMarkets.filter((m) => m.status !== 0);

  return (
    <section className="flex-1 px-4 sm:px-5 pt-8 sm:pt-10 pb-20">
      <div className="mx-auto max-w-[1320px]">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 sm:gap-6 mb-8 sm:mb-10">
          <div>
            <div className="label mb-3 flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-volt" />
              Pulse
            </div>
            <h1 className="font-display tracking-crunch leading-[0.95] text-4xl sm:text-5xl md:text-stat text-ink">
              What happens <span className="italic text-volt">next?</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
              <Input
                placeholder="Search…"
                value={query} onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-9 w-full md:w-52 text-sm rounded-lg bg-canvas-elevated"
              />
            </div>
            <Link href="/rooms/new" className="shrink-0">
              <Button size="sm" variant="outline">
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Room</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs — scroll horizontally if too wide */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-canvas-raised border border-line w-fit max-w-full overflow-x-auto mb-6 sm:mb-8">
          <TabBtn active={tab === 'markets'} onClick={() => setTab('markets')}>
            Markets {allMarkets.markets.length > 0 && <Count n={allMarkets.markets.length} />}
          </TabBtn>
          <TabBtn active={tab === 'rooms'} onClick={() => setTab('rooms')}>
            Rooms <Count n={publicRooms.rooms.length} />
          </TabBtn>
          <TabBtn active={tab === 'mine'} onClick={() => setTab('mine')}>
            My rooms <Count n={myRooms.rooms.length} />
          </TabBtn>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {tab === 'markets' ? (
            <motion.div key="markets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {allMarkets.loading ? (
                <SkeletonGrid count={4} />
              ) : filteredMarkets.length === 0 ? (
                <EmptyMarkets />
              ) : (
                <div className="space-y-10">
                  {openMarkets.length > 0 && (
                    <div>
                      <div className="label mb-4 flex items-center gap-2">
                        <span className="dot-live" />
                        Open markets
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {openMarkets.map((m, i) => (
                          <MarketCard key={m.id.toString()} market={m} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                  {resolvedMarkets.length > 0 && (
                    <div>
                      <div className="label mb-4">Resolved</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {resolvedMarkets.map((m, i) => (
                          <MarketCard key={m.id.toString()} market={m} index={i} compact />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {(tab === 'rooms' ? publicRooms.loading : myRooms.loading) ? (
                <SkeletonGrid count={6} />
              ) : filteredRooms.length === 0 ? (
                <EmptyRooms isPrivate={tab === 'mine'} hasQuery={query.trim().length > 0} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredRooms.map((room, i) => (
                    <RoomCard key={room.id.toString()} room={room} index={i} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function TabBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      'relative px-3 py-1.5 rounded-lg label transition-all duration-200',
      active ? 'text-canvas bg-volt' : 'text-ink-muted hover:text-ink',
    )}>
      {children}
    </button>
  );
}

function Count({ n }: { n: number }) {
  return <span className="ml-1 text-ink-ghost">{n}</span>;
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-40" />
      ))}
    </div>
  );
}

function EmptyMarkets() {
  return (
    <div className="surface-glass text-center py-20 px-8 rounded-2xl space-y-4">
      <QMark size={40} className="mx-auto opacity-30" />
      <h3 className="font-display text-2xl tracking-crunch">No markets yet.</h3>
      <p className="text-ink-muted text-sm max-w-sm mx-auto">
        Open a room and post the first question. Markets show up here once created.
      </p>
    </div>
  );
}

function EmptyRooms({ isPrivate, hasQuery }: { isPrivate: boolean; hasQuery: boolean }) {
  if (hasQuery) return <div className="text-center py-20"><p className="text-ink-muted label">No match.</p></div>;
  return (
    <div className="surface-glass text-center py-20 px-8 rounded-2xl space-y-4">
      <QMark size={40} className="mx-auto opacity-30" />
      <h3 className="font-display text-2xl tracking-crunch">
        {isPrivate ? 'No private rooms yet.' : 'No rooms found.'}
      </h3>
      {isPrivate && (
        <Link href="/rooms/new" className="inline-block">
          <Button size="sm"><Plus className="h-3 w-3" />Create a room</Button>
        </Link>
      )}
    </div>
  );
}
