'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Globe2, Users, Calendar, UserPlus, Plus } from 'lucide-react';

import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { AuthGate } from '@/components/auth-gate';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-picker';
import { QMark } from '@/components/q-mark';
import { MarketCard } from '@/components/market-card';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useRoom, useAutoJoinPublicRoom } from '@/hooks/use-rooms';
import { useRoomMarkets, useCreateMarket } from '@/hooks/use-markets';
import { useAuth } from '@/hooks/use-auth';
import { RoomType } from '@prediqt/shared';
import { shortAddr, cn } from '@/lib/utils';

export default function RoomPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const roomId = (() => {
    try { return BigInt(id); } catch { return null; }
  })();

  return (
    <main className="relative min-h-screen flex flex-col">
      <Nav />
      <AuthGate>
        {roomId === null ? <InvalidId /> : <RoomContent roomId={roomId} />}
      </AuthGate>
      <Footer />
    </main>
  );
}

function RoomContent({ roomId }: { roomId: bigint }) {
  const { address } = useAuth();
  const { room, members, loading, refresh: refreshRoom } = useRoom(roomId);
  const { markets, loading: mktsLoading, refresh: refreshMarkets } = useRoomMarkets(roomId);
  const { joined, joining } = useAutoJoinPublicRoom(roomId);
  const [showCreate, setShowCreate] = useState(false);

  if (loading) {
    return (
      <section className="flex-1 px-6 pt-16">
        <div className="mx-auto max-w-[1280px]">
          <div className="shimmer-overlay rounded-3xl border border-line bg-canvas-raised h-72" />
        </div>
      </section>
    );
  }

  if (!room || !room.exists) {
    return (
      <section className="flex-1 px-6 pt-32 text-center">
        <QMark size={48} className="mx-auto opacity-50 mb-6" />
        <h2 className="font-display text-3xl tracking-crunch">Room not found.</h2>
        <Link href="/pulse" className="inline-block mt-6">
          <Button variant="outline">Back to Pulse</Button>
        </Link>
      </section>
    );
  }

  const isPrivate = room.roomType === RoomType.Private;
  const isCreator = address && address.toLowerCase() === room.creator.toLowerCase();
  const Icon = isPrivate ? Lock : Globe2;

  return (
    <section className="flex-1 px-4 sm:px-6 pt-10 sm:pt-16 pb-20 sm:pb-24">
      <div className="mx-auto max-w-[1280px]">
        <Link href="/pulse" className="inline-flex items-center gap-2 label-micro hover:text-ink mb-8 sm:mb-10">
          <ArrowLeft className="h-3 w-3" />
          back to pulse
        </Link>

        {/* Room header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-y-6 md:gap-y-8 mb-10 md:mb-12"
        >
          <div className="md:col-span-8 space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2 sm:gap-3 label-micro flex-wrap">
              <Icon className="h-3 w-3" />
              {isPrivate ? 'Private' : 'Public'} room
              <span className="text-ink-muted">/</span>
              <span className="text-ink-muted font-mono">#{room.id.toString()}</span>
              {isCreator && (
                <>
                  <span className="text-ink-muted">/</span>
                  <span className="text-volt">you&apos;re the creator</span>
                </>
              )}
            </div>
            <h1 className="font-display tracking-crunch leading-[0.95] text-4xl sm:text-5xl md:text-mega">{room.name}</h1>
            {room.description && (
              <p className="text-ink-dim text-base md:text-lg leading-relaxed max-w-[680px]">
                {room.description}
              </p>
            )}
          </div>
          <div className="md:col-span-4 flex md:justify-end items-end">
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              <Stat label="Members" value={room.memberCount.toString()} />
              <Stat label="Markets" value={markets.length.toString()} />
            </div>
          </div>
        </motion.div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Markets column */}
          <div className="lg:col-span-8 space-y-5">
            <div className="flex items-center justify-between">
              <SectionLabel>Markets</SectionLabel>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-3.5 w-3.5" />
                New market
              </Button>
            </div>

            {mktsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="shimmer-overlay rounded-2xl border border-line bg-canvas-raised h-36" />
                ))}
              </div>
            ) : markets.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-line p-12 text-center space-y-6">
                <QMark size={48} className="mx-auto opacity-40" />
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="font-display text-2xl tracking-crunch">
                    No markets <span className="italic text-ink-dim">yet.</span>
                  </h3>
                  <p className="text-ink-dim text-sm">
                    Post the first question for this room.
                  </p>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Create a market
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {markets.map((m, i) => (
                  <MarketCard key={m.id.toString()} market={m} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Members sidebar */}
          <aside className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Members</SectionLabel>
            </div>
            <div className="rounded-2xl border border-line bg-canvas-raised divide-y divide-line">
              {members.map((m, i) => (
                <motion.div
                  key={m}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar seed={m} />
                    <div>
                      <div className="font-mono text-xs tabular">{shortAddr(m, 6, 4)}</div>
                      {m.toLowerCase() === room.creator.toLowerCase() && (
                        <div className="label-micro text-volt mt-0.5">creator</div>
                      )}
                    </div>
                  </div>
                  {address && m.toLowerCase() === address.toLowerCase() && (
                    <span className="label-micro">you</span>
                  )}
                </motion.div>
              ))}
            </div>
            <div className="rounded-2xl border border-line bg-canvas-raised p-5 space-y-2">
              <div className="label-micro flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Created
              </div>
              <div className="font-mono text-sm tabular text-ink-dim">
                {new Date(Number(room.createdAt) * 1000).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </div>
            </div>
          </aside>
        </div>

        <CreateMarketDialog
          roomId={roomId}
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={refreshMarkets}
        />
      </div>
    </section>
  );
}

function CreateMarketDialog({
  roomId,
  open,
  onClose,
  onCreated,
}: {
  roomId: bigint;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { create, busy } = useCreateMarket();
  const [question, setQuestion] = useState('');
  const [resolveDate, setResolveDate] = useState<Date | null>(null);

  const canSubmit = question.trim().length > 0 && resolveDate !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !resolveDate) return;
    const ts = Math.floor(resolveDate.getTime() / 1000);
    try {
      await create(roomId, question.trim(), ts);
      setQuestion('');
      setResolveDate(null);
      onClose();
      onCreated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <DialogTitle>Post a market</DialogTitle>
            <DialogDescription>
              Ask a yes/no question. The room will bet on it.
            </DialogDescription>
          </div>
          <div className="space-y-2">
            <label className="label-micro">Question</label>
            <Textarea
              placeholder="Will France win the World Cup Final?"
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 280))}
              className="min-h-[80px]"
              autoFocus
            />
            <div className="label-micro text-ink-muted text-right">{question.length}/280</div>
          </div>
          <div className="space-y-2">
            <label className="label">Resolves at</label>
            <DateTimePicker
              value={resolveDate}
              onChange={setResolveDate}
              minDate={new Date()}
              placeholder="When does this market resolve?"
            />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-line">
            <span className="label-micro">You&apos;ll be the resolver.</span>
            <Button type="submit" disabled={!canSubmit || busy} loading={busy}>
              Create market
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-canvas-raised p-4">
      <div className="label-micro mb-2">{label}</div>
      <div className="font-mono text-2xl tabular">{value}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="label-micro flex items-center gap-2">
      <span className="q-dot" />
      {children}
    </div>
  );
}

function Avatar({ seed }: { seed: string }) {
  const h1 = parseInt(seed.slice(2, 6) || '0', 16);
  const h2 = parseInt(seed.slice(6, 10) || '0', 16);
  const useVolt = h1 % 2 === 0;
  return (
    <div
      className="h-8 w-8 rounded-md grid place-items-center font-mono text-[10px]"
      style={{
        background: useVolt ? 'rgba(217,255,60,0.1)' : 'rgba(255,92,92,0.1)',
        border: `1px solid ${useVolt ? 'rgba(217,255,60,0.3)' : 'rgba(255,92,92,0.3)'}`,
        color: useVolt ? '#D9FF3C' : '#FF5C5C',
      }}
    >
      {((h2 % 0xff) | 0).toString(16).padStart(2, '0').toUpperCase()}
    </div>
  );
}

function InvalidId() {
  return (
    <section className="flex-1 px-6 pt-32 text-center">
      <QMark size={48} className="mx-auto opacity-50 mb-6" />
      <h2 className="font-display text-3xl tracking-crunch">Invalid room id.</h2>
    </section>
  );
}
