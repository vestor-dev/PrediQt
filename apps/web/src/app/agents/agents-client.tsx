'use client';

import { useState, useTransition, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Play, ExternalLink, AlertTriangle, CheckCircle2, Activity,
  TrendingUp, TrendingDown, Zap, Radio, Cpu, Target, Wind,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tickAction, type TickActionResult } from './actions';
import { shortAddr, cn } from '@/lib/utils';
import type { AgentsStatus, AgentRow } from './page';
import type { ActivityRecord } from '@/lib/agent-activity';

const PALETTE: Record<string, {
  primary: string; bg: string; border: string; glyph: string; tagline: string;
  Icon: typeof Cpu;
}> = {
  Quanta: {
    primary: '#D9FF3C', bg: 'rgba(217,255,60,0.10)', border: 'rgba(217,255,60,0.30)',
    glyph: 'Q', tagline: 'the analyst', Icon: Cpu,
  },
  Hawk: {
    primary: '#FF8B3C', bg: 'rgba(255,139,60,0.10)', border: 'rgba(255,139,60,0.30)',
    glyph: 'H', tagline: 'the chaser', Icon: Target,
  },
  Doubt: {
    primary: '#7BD0FF', bg: 'rgba(123,208,255,0.10)', border: 'rgba(123,208,255,0.30)',
    glyph: 'D', tagline: 'the contrarian', Icon: Wind,
  },
};

function paletteFor(name: string) {
  return PALETTE[name] ?? {
    primary: '#888', bg: 'rgba(136,136,136,0.10)', border: 'rgba(136,136,136,0.30)',
    glyph: '?', tagline: 'agent', Icon: Bot,
  };
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

export function AgentsClient({ status }: { status: AgentsStatus }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TickActionResult | null>(null);
  const [recent, setRecent] = useState<ActivityRecord[]>(status.recent);

  // Periodically refresh activity feed
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch('/api/agent-activity?limit=40');
        const data = await res.json();
        setRecent(data.recent ?? []);
      } catch {}
    }, 12_000);
    return () => clearInterval(t);
  }, []);

  const handleTick = () =>
    startTransition(async () => {
      const r = await tickAction();
      setResult(r);
      // Refresh activity right after tick completes
      try {
        const res = await fetch('/api/agent-activity?limit=40');
        const data = await res.json();
        setRecent(data.recent ?? []);
      } catch {}
    });

  return (
    <section className="flex-1 px-4 sm:px-6 pt-8 sm:pt-10 pb-20 sm:pb-24">
      <div className="mx-auto max-w-[1280px]">
        {/* ─── HERO ─── */}
        <Hero status={status} pending={pending} onTick={handleTick} />

        {/* ─── Agent roster ─── */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {status.agents.map((a, i) => (
            <AgentCard key={a.id} agent={a} index={i} />
          ))}
        </div>

        {/* ─── Live feed + tick result ─── */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ActivityFeed records={recent} />
          </div>
          <div className="lg:col-span-5 space-y-4">
            {result && <TickResultPanel result={result} />}
            <SystemStatus status={status} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── HERO ───────────────────────────── */

function Hero({
  status,
  pending,
  onTick,
}: {
  status: AgentsStatus;
  pending: boolean;
  onTick: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-canvas-elevated">
      {/* background grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      {/* pulsing volt orb */}
      <motion.div
        className="absolute -top-32 -right-32 h-80 w-80 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(217,255,60,0.15) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative p-6 sm:p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center gap-2 label">
            <Radio className="h-3 w-3 text-volt" />
            <span className="text-volt">autonomous traders · running</span>
          </div>
          <h1 className="font-display tracking-crunch leading-[0.95] text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
            Three traders.
            <br />
            <span className="text-volt italic">Your competition.</span>
          </h1>
          <p className="text-ink-secondary text-base md:text-lg max-w-[560px] leading-relaxed">
            Each one reads every market on Sepolia, asks GPT to weigh it through their
            persona, and bets real PREDQ. They lose when wrong. Same as you.
          </p>
          <div className="flex items-center gap-3 flex-wrap pt-2">
            <Button size="lg" onClick={onTick} loading={pending} disabled={pending}>
              <Play className="h-4 w-4" /> Run tick now
            </Button>
            <span className="label text-volt/80 flex items-center gap-1.5">
              <Activity className="h-3 w-3" />
              cron runs every 10 min
            </span>
          </div>
        </div>

        {/* Agent avatar tower */}
        <div className="lg:col-span-5 flex items-center justify-center gap-3 flex-wrap">
          {status.agents.map((a, i) => {
            const pal = paletteFor(a.name);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex flex-col items-center gap-2"
              >
                <motion.div
                  whileHover={{ scale: 1.05, rotate: -2 }}
                  className="relative h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-2xl grid place-items-center font-display text-3xl sm:text-4xl md:text-5xl font-bold"
                  style={{
                    background: pal.bg,
                    color: pal.primary,
                    border: `2px solid ${pal.border}`,
                    boxShadow: `0 0 40px -10px ${pal.primary}40`,
                  }}
                >
                  {pal.glyph}
                  {a.active && a.hasKey && (
                    <motion.div
                      className="absolute -top-1 -right-1 h-3 w-3 rounded-full"
                      style={{ background: pal.primary }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    />
                  )}
                </motion.div>
                <div className="text-center">
                  <div
                    className="font-display text-sm tracking-crunch"
                    style={{ color: pal.primary }}
                  >
                    {a.name}
                  </div>
                  <div className="font-mono text-[9px] tabular text-ink-muted mt-0.5">
                    {a.totalBets} bet{a.totalBets === 1 ? '' : 's'}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── AGENT CARD ─────────────────────────── */

function AgentCard({ agent, index }: { agent: AgentRow; index: number }) {
  const pal = paletteFor(agent.name);
  const Icon = pal.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative rounded-3xl overflow-hidden bg-canvas-elevated border-2 group hover:-translate-y-1 transition-transform duration-300"
      style={{ borderColor: pal.border }}
    >
      {/* Hairline gradient at top */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${pal.primary}, transparent)` }} />

      {/* Soft tinted bg */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle at 70% 0%, ${pal.bg}, transparent 60%)` }}
      />

      <div className="relative p-6 space-y-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-xl grid place-items-center font-display text-2xl font-bold"
              style={{ background: pal.bg, color: pal.primary, border: `1px solid ${pal.border}` }}
            >
              {pal.glyph}
            </div>
            <div>
              <div
                className="font-display text-2xl tracking-crunch leading-none"
                style={{ color: pal.primary }}
              >
                {agent.name}
              </div>
              <div className="label text-ink-muted mt-1 flex items-center gap-1">
                <Icon className="h-3 w-3" /> {pal.tagline}
              </div>
            </div>
          </div>
          {agent.active && agent.hasKey ? (
            <span className="flex items-center gap-1 label text-up">
              <span className="dot-live" /> live
            </span>
          ) : (
            <span className="label text-ink-muted">paused</span>
          )}
        </div>

        {/* Persona */}
        <p className="text-ink-secondary text-[13px] leading-relaxed line-clamp-3">
          {agent.persona}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Stat label="Bets" value={agent.totalBets.toString()} accent={pal.primary} />
          <Stat label="Wagered" value={`${agent.totalWagered}`} suffix="P" accent={pal.primary} />
          <Stat
            label="Last"
            value={agent.lastBet ? timeAgo(agent.lastBet) : '—'}
            accent={pal.primary}
          />
        </div>

        {/* Wallet link */}
        <a
          href={`https://sepolia.etherscan.io/address/${agent.wallet}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between font-mono text-[10px] tabular text-ink-muted hover:text-ink transition-colors pt-3 border-t border-line"
        >
          <span>{shortAddr(agent.wallet, 10, 6)}</span>
          <span className="flex items-center gap-1">
            view txs <ExternalLink className="h-2.5 w-2.5" />
          </span>
        </a>
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg bg-canvas-raised border border-line p-2.5">
      <div className="label text-[9px] mb-1">{label}</div>
      <div className="font-mono tabular text-base font-medium leading-none flex items-baseline gap-0.5" style={{ color: accent }}>
        {value}
        {suffix && <span className="text-[10px] text-ink-muted ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

/* ────────────────────────── ACTIVITY FEED ────────────────────────── */

function ActivityFeed({ records }: { records: ActivityRecord[] }) {
  return (
    <div className="surface p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-volt" />
          <h2 className="font-display text-xl tracking-crunch">Live feed</h2>
        </div>
        <span className="label text-ink-muted">last {records.length} events</span>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-muted">
          <Bot className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Waiting for the first tick.</p>
          <p className="label mt-1">Click "Run tick now" or wait for the cron.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {records.map((r, i) => (
              <FeedItem key={`${r.timestamp}-${i}`} record={r} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function FeedItem({ record }: { record: ActivityRecord }) {
  if (record.kind === 'resolve') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 rounded-xl bg-canvas-raised border border-line p-3"
      >
        <div className="h-8 w-8 rounded-lg bg-volt/15 text-volt grid place-items-center shrink-0">
          <Zap className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-ink text-sm truncate">
            <span className="text-volt font-medium">resolved</span>{' '}
            "<span className="text-ink-secondary">{record.question}</span>"
          </div>
          <div className="label text-ink-muted mt-0.5">
            outcome: <span className={record.outcome === 'yes' ? 'text-up' : 'text-down'}>
              {record.outcome.toUpperCase()}
            </span>
            <span className="text-ink-muted ml-2">{timeAgo(record.timestamp)}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const pal = paletteFor(record.agent);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 rounded-xl bg-canvas-raised border border-line p-3 hover:border-line-strong transition-colors"
    >
      <div
        className="h-8 w-8 rounded-lg grid place-items-center font-mono text-xs font-bold shrink-0"
        style={{ background: pal.bg, color: pal.primary, border: `1px solid ${pal.border}` }}
      >
        {pal.glyph}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-sm flex items-center gap-2 flex-wrap">
          <span className="font-display tracking-crunch font-medium" style={{ color: pal.primary }}>
            {record.agent}
          </span>
          <span className="text-ink-secondary">staked</span>
          <span className={cn(
            'font-mono text-xs tabular px-1.5 py-0.5 rounded uppercase tracking-wider',
            record.side === 'yes' ? 'bg-up-dim text-up' : 'bg-down-dim text-down',
          )}>
            {record.amount} {record.side}
          </span>
        </div>
        <div className="text-ink-secondary text-xs truncate">
          on "<span className="text-ink">{record.question}</span>"
        </div>
        {record.reason && (
          <div className="text-ink-muted text-[11px] italic leading-snug line-clamp-2">
            "{record.reason}"
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="label text-ink-muted">{timeAgo(record.timestamp)}</span>
          {record.txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="label text-ink-muted hover:text-ink flex items-center gap-1"
            >
              tx <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────── TICK RESULT PANEL ──────────────────────── */

function TickResultPanel({ result }: { result: TickActionResult }) {
  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-down/30 bg-down-dim p-4 space-y-1">
        <div className="label text-down flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" /> tick failed
        </div>
        <code className="font-mono text-[11px] break-all text-down">{result.error}</code>
      </div>
    );
  }
  const r = result.report;
  const total = r.bets.length + r.skipped.length + r.resolved.length;
  return (
    <div className="surface p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="label flex items-center gap-1.5 text-volt">
          <CheckCircle2 className="h-3 w-3" /> last tick
        </div>
        <span className="font-mono text-[10px] tabular text-ink-muted">
          {r.ms}ms · {total} actions
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Mini label="bets" value={r.bets.length} accent="text-up" />
        <Mini label="skipped" value={r.skipped.length} />
        <Mini label="resolved" value={r.resolved.length} accent="text-volt" />
      </div>
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg bg-canvas-raised border border-line p-2.5 text-center">
      <div className={cn('font-mono text-2xl tabular font-bold leading-none', accent ?? 'text-ink')}>
        {value}
      </div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}

/* ──────────────────────── SYSTEM STATUS ──────────────────────── */

function SystemStatus({ status }: { status: AgentsStatus }) {
  const items = [
    { label: 'OpenAI', ok: status.openAiConfigured, value: status.openAiConfigured ? 'configured' : 'missing' },
    { label: 'Agent keys', ok: status.agents.every((a) => a.hasKey), value: `${status.agents.filter((a) => a.hasKey).length}/${status.agents.length}` },
    { label: 'Auto-resolve', ok: status.operatorIsOracleOwner, value: status.operatorIsOracleOwner ? 'enabled' : 'disabled' },
  ];
  return (
    <div className="surface p-5 space-y-3">
      <div className="label flex items-center gap-1.5">
        <Activity className="h-3 w-3" /> system
      </div>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between py-1.5 border-b border-line last:border-0">
            <span className="label">{it.label}</span>
            <span className={cn(
              'font-mono text-xs tabular flex items-center gap-1.5',
              it.ok ? 'text-up' : 'text-down',
            )}>
              {it.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {it.value}
            </span>
          </div>
        ))}
      </div>
      {!status.operatorIsOracleOwner && status.agentOperator && (
        <details className="rounded-lg bg-canvas-raised border border-line p-3 text-[11px] font-sans text-ink-secondary">
          <summary className="label cursor-pointer text-down">enable auto-resolve</summary>
          <div className="mt-2 space-y-1.5">
            <div>From the wallet that currently owns the oracle, run:</div>
            <code className="block p-2 bg-canvas-elevated rounded text-[10px] break-all font-mono">
              oracle.transferOwnership({status.agentOperator})
            </code>
          </div>
        </details>
      )}
    </div>
  );
}
