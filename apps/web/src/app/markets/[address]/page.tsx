'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, TrendingUp, TrendingDown, Gavel, Gift, ArrowUpRight, Sparkles, Zap } from 'lucide-react';

import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { AuthGate } from '@/components/auth-gate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProbabilityBar } from '@/components/probability-bar';
import { Sparkline } from '@/components/sparkline';
import { EncryptedReveal } from '@/components/encrypted-reveal';
import { QMark } from '@/components/q-mark';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AgentPositionsPanel } from '@/components/agent-positions';
import { useMarket, usePlaceBet, useResolveMarket, useClaimPayout, useOracleOwner, type MarketInfo } from '@/hooks/use-markets';
import { useAuth } from '@/hooks/use-auth';
import { relativeTime, formatPredq, shortAddr, cn } from '@/lib/utils';

export default function MarketPage({ params }: { params: { address: string } }) {
  return (
    <main className="relative min-h-screen flex flex-col bg-canvas">
      <Nav />
      <AuthGate><MarketContent address={params.address} /></AuthGate>
      <Footer />
    </main>
  );
}

function MarketContent({ address }: { address: string }) {
  const { address: userAddr } = useAuth();
  const { market, userYes, userNo, hasClaimed, loading, refresh } = useMarket(address);
  const { placeBet, busy: betBusy } = usePlaceBet();
  const { resolve, busy: resolveBusy } = useResolveMarket();
  const { claim, busy: claimBusy } = useClaimPayout();
  const oracleOwner = useOracleOwner();
  const [amount, setAmount] = useState('');
  const [side, setSide] = useState<'yes' | 'no' | null>(null);
  const [showResolve, setShowResolve] = useState(false);
  const [showBetConfirm, setShowBetConfirm] = useState(false);
  const [showClaimConfirm, setShowClaimConfirm] = useState(false);

  if (loading) return <div className="flex-1 px-5 pt-12"><div className="mx-auto max-w-[960px]"><div className="skeleton h-64 rounded-2xl" /></div></div>;
  if (!market) return <div className="flex-1 flex items-center justify-center"><QMark size={40} className="opacity-30" /></div>;

  const isOpen = market.status === 0;
  const isResolver = !!(userAddr && oracleOwner && userAddr.toLowerCase() === oracleOwner.toLowerCase());
  const amountPredq = parseFloat(amount) || 0;
  const amountRaw = BigInt(Math.floor(amountPredq * 1_000_000));
  const canBet = isOpen && side && amountPredq >= 1 && !betBusy;
  const hasPosition = userYes > 0n || userNo > 0n;
  const winningShares = !isOpen ? (market.outcome ? userYes : userNo) : 0n;
  const losingShares = !isOpen ? (market.outcome ? userNo : userYes) : 0n;
  const won = winningShares > 0n;
  const lost = !won && losingShares > 0n;
  const est = side && amountPredq >= 1 ? estimateReturn(market, side === 'yes', amountPredq) : null;
  const isUp = market.yesPrice >= 50;

  // Resolution gating: only show resolver controls *after* the deadline.
  // Before that, the question is still under active speculation.
  const nowSec = Math.floor(Date.now() / 1000);
  const pastDeadline = nowSec >= Number(market.resolveAt);
  const canResolveNow = isOpen && pastDeadline && isResolver;

  const handleBet = async () => {
    if (!canBet) return;
    setShowBetConfirm(false);
    try { await placeBet(address, side === 'yes', amountRaw); setAmount(''); setSide(null); refresh(); } catch {}
  };

  const handleClaim = async () => {
    setShowClaimConfirm(false);
    try { await claim(address); refresh(); } catch {}
  };

  return (
    <section className="flex-1 px-4 sm:px-5 pt-6 sm:pt-8 pb-20">
      <div className="mx-auto max-w-[960px]">
        <Link href={`/rooms/${market.roomId.toString()}`} className="inline-flex items-center gap-1.5 label hover:text-ink transition-colors mb-6 sm:mb-8">
          <ArrowLeft className="h-3 w-3" /> Back to room
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 sm:mb-10">
          <div className="flex items-center gap-2 label mb-3 flex-wrap">
            {isOpen ? <><span className="dot-live" /> live</> : <span className="text-ink-muted">{market.outcome ? 'yes won' : 'no won'}</span>}
            <span className="text-ink-muted">·</span>
            <Clock className="h-3 w-3" /> {isOpen ? relativeTime(market.resolveAt) : 'settled'}
          </div>
          <h1 className="font-display tracking-crunch leading-[0.95] mb-5 text-3xl sm:text-4xl md:text-stat">
            {market.question}
          </h1>
          <div className="flex items-end justify-between gap-4 mb-4">
            <div className="flex items-baseline gap-3">
              <span className={cn('font-mono tabular font-bold tracking-tightest text-5xl sm:text-6xl', isUp ? 'text-up' : 'text-down')}>
                {market.yesPrice.toFixed(1)}%
              </span>
              <span className="label">yes</span>
            </div>
            <Sparkline
              seed={address}
              currentValue={market.yesPrice}
              width={100}
              height={40}
              className="hidden sm:block"
            />
          </div>
          <ProbabilityBar yesPercent={market.yesPrice} size="lg" />
        </motion.div>

        {/* Resolve banner — only when past deadline AND user is the resolver */}
        {canResolveNow && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border-2 border-volt/40 bg-gradient-to-r from-volt/10 via-volt/5 to-transparent p-5 flex items-center justify-between gap-4 flex-wrap shadow-[0_0_40px_-12px_rgba(217,255,60,0.4)]"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-volt/20 grid place-items-center text-volt">
                <Gavel className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-display text-lg tracking-crunch text-volt">
                  Awaiting resolution
                </div>
                <div className="label text-ink-dim">
                  This market closed for new bets. You're the resolver — pick the answer.
                </div>
              </div>
            </div>
            <Button size="lg" onClick={() => setShowResolve(true)}>
              <Gavel className="h-4 w-4" /> Resolve now
            </Button>
          </motion.div>
        )}

        {/* Pre-deadline note for resolver */}
        {isOpen && !pastDeadline && isResolver && (
          <div className="mb-6 rounded-xl border border-line bg-canvas-raised px-4 py-3 flex items-center gap-2.5 text-ink-dim">
            <Gavel className="h-3.5 w-3.5 text-ink-ghost" />
            <span className="label">
              You're the resolver. Resolution opens after the deadline ({relativeTime(market.resolveAt)}).
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bet Panel */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-7">
            {isOpen ? (
              <div
                className={cn(
                  'relative rounded-3xl border-2 overflow-hidden',
                  'transition-all duration-300',
                  side === 'yes' && 'border-up/40 shadow-[0_0_60px_-20px_rgba(0,255,127,0.3)]',
                  side === 'no' && 'border-down/40 shadow-[0_0_60px_-20px_rgba(255,92,92,0.3)]',
                  !side && 'border-line bg-canvas-elevated',
                )}
                style={{
                  background: side === 'yes'
                    ? 'linear-gradient(180deg, rgba(0,255,127,0.04) 0%, rgba(0,0,0,0) 60%)'
                    : side === 'no'
                    ? 'linear-gradient(180deg, rgba(255,92,92,0.04) 0%, rgba(0,0,0,0) 60%)'
                    : undefined,
                }}
              >
                <div className="p-6 space-y-5 bg-canvas-elevated/40">
                  {/* Section header — bolder */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-volt" />
                      <span className="font-display text-lg tracking-crunch">Take a side</span>
                    </div>
                    <span className="label text-ink-ghost">
                      pick · stake · win
                    </span>
                  </div>

                  {/* Big YES / NO pickers — clearer with full labels */}
                  <div className="grid grid-cols-2 gap-3">
                    {(['yes', 'no'] as const).map((s) => {
                      const active = side === s;
                      const isYes = s === 'yes';
                      const price = isYes ? market.yesPrice : 100 - market.yesPrice;
                      return (
                        <motion.button
                          key={s}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSide(s)}
                          className={cn(
                            'group relative flex flex-col items-start justify-between p-4 h-28 rounded-2xl border-2',
                            'transition-all duration-200 overflow-hidden',
                            active
                              ? isYes
                                ? 'border-up bg-up-dim shadow-[0_0_30px_-10px_rgba(0,255,127,0.5)]'
                                : 'border-down bg-down-dim shadow-[0_0_30px_-10px_rgba(255,92,92,0.5)]'
                              : 'border-line hover:border-line-strong bg-canvas-raised',
                          )}
                        >
                          {/* Decorative arrow icon, top-right */}
                          <div
                            className={cn(
                              'absolute top-3 right-3 h-6 w-6 rounded-lg grid place-items-center transition-all duration-200',
                              active
                                ? isYes ? 'bg-up text-canvas' : 'bg-down text-white'
                                : 'bg-canvas border border-line text-ink-ghost group-hover:text-ink-dim',
                            )}
                          >
                            {isYes
                              ? <TrendingUp className="h-3.5 w-3.5" />
                              : <TrendingDown className="h-3.5 w-3.5" />}
                          </div>

                          <span
                            className={cn(
                              'font-display text-3xl tracking-crunch font-semibold',
                              active
                                ? isYes ? 'text-up' : 'text-down'
                                : 'text-ink-dim group-hover:text-ink',
                            )}
                          >
                            {s.toUpperCase()}
                          </span>

                          <div className="flex flex-col items-start">
                            <span className="label text-ink-ghost">implied probability</span>
                            <span className={cn(
                              'font-mono text-lg tabular tracking-tight',
                              active ? isYes ? 'text-up' : 'text-down' : 'text-ink',
                            )}>
                              {price.toFixed(1)}%
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="label">How much (PREDQ)</span>
                      <div className="flex gap-1.5">
                        {[10, 50, 100, 250].map((q) => (
                          <button
                            key={q}
                            onClick={() => setAmount(q.toString())}
                            className={cn(
                              'px-2.5 py-1 rounded-md font-mono text-[11px] tabular',
                              'bg-canvas-raised border border-line text-ink-dim',
                              'hover:border-volt/40 hover:text-volt transition-colors',
                              amount === q.toString() && 'border-volt/60 text-volt bg-volt/5',
                            )}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0"
                        min="1"
                        step="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="font-mono text-3xl tabular h-16 pr-20 font-semibold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-ghost tracking-wider">
                        PREDQ
                      </span>
                    </div>
                  </div>

                  {est && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'rounded-2xl p-4 space-y-3 border',
                        side === 'yes' ? 'bg-up-dim border-up/30' : 'bg-down-dim border-down/30',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className={cn('label flex items-center gap-1.5 font-medium', side === 'yes' ? 'text-up' : 'text-down')}>
                          <Sparkles className="h-3 w-3" /> If you're right
                        </div>
                        <span className={cn(
                          'font-mono text-xs tabular px-2 py-0.5 rounded-md',
                          est.multiplier >= 2
                            ? (side === 'yes' ? 'bg-up text-canvas' : 'bg-down text-white')
                            : 'bg-canvas border border-line',
                        )}>
                          {est.multiplier.toFixed(2)}×
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          'font-mono text-3xl tabular font-bold tracking-tightest',
                          side === 'yes' ? 'text-up' : 'text-down',
                        )}>
                          +{est.profit.toFixed(1)}
                        </span>
                        <span className="font-mono text-sm tabular text-ink-dim">
                          PREDQ profit
                        </span>
                      </div>
                      <div className="flex items-center justify-between label text-ink-ghost">
                        <span>{est.payout.toFixed(1)} PREDQ payout</span>
                        <span>{est.shares.toFixed(1)} shares</span>
                      </div>
                    </motion.div>
                  )}

                  <Button
                    size="xl"
                    className="w-full"
                    variant={side === 'no' ? 'danger' : 'primary'}
                    disabled={!canBet}
                    onClick={() => setShowBetConfirm(true)}
                  >
                    {side
                      ? `Stake ${amountPredq || 0} on ${side.toUpperCase()}`
                      : 'Pick YES or NO to continue'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="surface p-8 text-center space-y-5">
                <div className={cn('inline-flex h-14 w-14 items-center justify-center rounded-full mx-auto', market.outcome ? 'bg-up-dim' : 'bg-down-dim')}>
                  {market.outcome ? <TrendingUp className="h-6 w-6 text-up" /> : <TrendingDown className="h-6 w-6 text-down" />}
                </div>
                <h3 className="font-display text-2xl tracking-crunch">
                  Resolved: <span className={market.outcome ? 'text-up' : 'text-down'}>{market.outcome ? 'YES' : 'NO'}</span>
                </h3>

                {/* Winner — claim button (or already claimed) */}
                {won && !hasClaimed && (
                  <Button size="lg" onClick={() => setShowClaimConfirm(true)} loading={claimBusy}>
                    <Gift className="h-4 w-4" /> Claim payout
                  </Button>
                )}
                {won && hasClaimed && (
                  <div className="label text-up flex items-center justify-center gap-1.5">
                    <Gift className="h-3.5 w-3.5" /> payout claimed
                  </div>
                )}

                {/* Loser — no claim, just an honest message */}
                {lost && (
                  <div className="space-y-1.5 max-w-xs mx-auto">
                    <div className="font-mono text-sm tabular text-down">
                      You picked {market.outcome ? 'NO' : 'YES'}.
                    </div>
                    <div className="label text-ink-muted">
                      Bets are non-refundable. Better luck on the next one.
                    </div>
                  </div>
                )}

                {/* No position at all */}
                {!hasPosition && (
                  <div className="label text-ink-ghost">You did not bet on this market.</div>
                )}
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <aside className="lg:col-span-5 space-y-4">
            <div className="surface p-5 space-y-3">
              <div className="label">Stats</div>
              <div className="grid grid-cols-2 gap-2">
                <StatCell label="Pool" value={`${formatPredq(market.totalDeposited, { compact: true })}`} />
                <StatCell label="Bettors" value={market.totalBettors.toString()} />
                <StatCell label="YES" value={`${market.yesPrice.toFixed(1)}%`} color="text-up" />
                <StatCell label="NO" value={`${(100 - market.yesPrice).toFixed(1)}%`} color="text-down" />
              </div>
            </div>
            {hasPosition && (
              <div className="surface border-volt/20 p-5 space-y-2">
                <div className="label text-volt">Your position</div>
                {userYes > 0n && <div className="flex justify-between"><span className="label">yes shares</span><span className="font-mono text-sm tabular text-up"><EncryptedReveal value={formatPredq(userYes, { compact: true })} duration={600} /></span></div>}
                {userNo > 0n && <div className="flex justify-between"><span className="label">no shares</span><span className="font-mono text-sm tabular text-down"><EncryptedReveal value={formatPredq(userNo, { compact: true })} duration={600} /></span></div>}
              </div>
            )}
            <AgentPositionsPanel marketAddress={address} />
            <div className="surface p-5 space-y-2">
              <div className="label">Contract</div>
              <a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noreferrer"
                className="font-mono text-[11px] tabular text-volt hover:underline flex items-center gap-1">
                {shortAddr(address, 8, 6)} <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </aside>
        </div>

        {/* ── Resolve dialog ── */}
        <Dialog open={showResolve} onOpenChange={(o) => !o && setShowResolve(false)}>
          <DialogContent className="max-w-md">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 label text-volt">
                <Gavel className="h-3 w-3" />
                Resolution
              </div>
              <DialogTitle>Did this happen?</DialogTitle>
              <DialogDescription>
                Pick the answer that came true in the real world. This pays winners
                and is final — there is no appeal.
              </DialogDescription>
            </div>

            <div className="my-5 rounded-2xl border border-line bg-canvas-raised p-4">
              <div className="label-micro mb-1.5">The question</div>
              <p className="font-display text-lg tracking-crunch text-ink leading-snug">
                {market.question}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                disabled={resolveBusy}
                onClick={() => resolve(address, true).then(() => { setShowResolve(false); refresh(); })}
                className={cn(
                  'group flex items-center gap-3 p-4 rounded-2xl border-2',
                  'border-up/30 hover:border-up bg-up-dim/40 hover:bg-up-dim',
                  'transition-all duration-200 text-left',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <div className="h-10 w-10 rounded-xl bg-up text-canvas grid place-items-center shrink-0 font-display text-lg font-bold">
                  Y
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg tracking-crunch text-up leading-tight">
                    Yes — it happened
                  </div>
                  <div className="label text-ink-muted mt-0.5 truncate">
                    YES bettors win their share of the pool
                  </div>
                </div>
                <TrendingUp className="h-5 w-5 text-up shrink-0" />
              </button>

              <button
                disabled={resolveBusy}
                onClick={() => resolve(address, false).then(() => { setShowResolve(false); refresh(); })}
                className={cn(
                  'group flex items-center gap-3 p-4 rounded-2xl border-2',
                  'border-down/30 hover:border-down bg-down-dim/40 hover:bg-down-dim',
                  'transition-all duration-200 text-left',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <div className="h-10 w-10 rounded-xl bg-down text-white grid place-items-center shrink-0 font-display text-lg font-bold">
                  N
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg tracking-crunch text-down leading-tight">
                    No — it didn't happen
                  </div>
                  <div className="label text-ink-muted mt-0.5 truncate">
                    NO bettors win their share of the pool
                  </div>
                </div>
                <TrendingDown className="h-5 w-5 text-down shrink-0" />
              </button>
            </div>

            {resolveBusy && (
              <div className="mt-4 label text-ink-ghost text-center">
                <span className="dot-live mr-1.5" /> submitting on-chain…
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Bet confirmation ── */}
        <ConfirmDialog
          open={showBetConfirm}
          onClose={() => setShowBetConfirm(false)}
          onConfirm={handleBet}
          loading={betBusy}
          icon={side === 'yes' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          title={`Bet ${(side ?? '').toUpperCase()} on this market?`}
          description="This submits an on-chain transaction. Your PREDQ will be transferred to the market contract."
          details={[
            { label: 'Side', value: (side ?? '').toUpperCase(), accent: side === 'yes' ? 'up' : 'down' },
            { label: 'Amount', value: `${amountPredq} PREDQ`, accent: 'volt' },
            { label: 'Current price', value: `${side === 'yes' ? market.yesPrice : 100 - market.yesPrice}%` },
            ...(est ? [
              { label: 'Est. return', value: `${est.payout.toFixed(1)} PREDQ (${est.multiplier.toFixed(2)}x)`, accent: 'up' as const },
            ] : []),
          ]}
          confirmLabel={`Bet ${(side ?? '').toUpperCase()}`}
          confirmVariant={side === 'no' ? 'danger' : 'primary'}
        />

        {/* ── Claim confirmation ── */}
        <ConfirmDialog
          open={showClaimConfirm}
          onClose={() => setShowClaimConfirm(false)}
          onConfirm={handleClaim}
          loading={claimBusy}
          icon={<Gift className="h-5 w-5" />}
          title="Claim your payout?"
          description="Your winnings will be transferred to your wallet."
          details={[
            { label: 'Outcome', value: market.outcome ? 'YES won' : 'NO won', accent: market.outcome ? 'up' : 'down' },
            { label: 'Your YES shares', value: formatPredq(userYes, { compact: true }) },
            { label: 'Your NO shares', value: formatPredq(userNo, { compact: true }) },
          ]}
          confirmLabel="Claim"
        />
      </div>
    </section>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-canvas-raised border border-line p-3">
      <div className="label mb-1">{label}</div>
      <div className={cn('font-mono text-lg tabular font-medium', color)}>{value}</div>
    </div>
  );
}

// ── Return estimate ──
// Standard prediction market formula: at probability P, your return = amount / P.
// This is how Polymarket, Kalshi, and Manifold display estimated returns.
// The AMM handles pricing; this shows what you'd win at fair odds.
function estimateReturn(market: MarketInfo, betYes: boolean, amountPredq: number) {
  // Current probability of the chosen side
  const prob = betYes
    ? market.yesPrice / 100
    : (100 - market.yesPrice) / 100;

  if (prob <= 0 || prob >= 1) return { payout: 0, profit: 0, multiplier: 0, shares: 0 };

  // Theoretical return at current odds
  const payout = amountPredq / prob;
  const profit = payout - amountPredq;
  const multiplier = 1 / prob;

  // Shares from AMM (for display)
  const SCALE = 1_000_000;
  const yR = Number(market.yesReserve) / SCALE;
  const nR = Number(market.noReserve) / SCALE;
  const k = yR * nR;
  let shares: number;
  if (betYes) {
    shares = yR - k / (nR + amountPredq);
  } else {
    shares = nR - k / (yR + amountPredq);
  }

  return { payout, profit, multiplier, shares: Math.max(0, shares) };
}
