'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import {
  ArrowRight, ArrowUpRight, ChevronDown, Globe2, Shield, Bot, Sparkles,
} from 'lucide-react';

import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { MarketCard } from '@/components/market-card';
import { QMark } from '@/components/q-mark';
import { ScrambleText } from '@/components/scramble-text';
import { CyclingWord } from '@/components/cycling-word';
import { MagneticButton } from '@/components/magnetic-button';
import { LiveStatsRibbon } from '@/components/live-stats-ribbon';
import { AgentQuotesMarquee } from '@/components/agent-quotes-marquee';
import { useAuth } from '@/hooks/use-auth';
import { useAllMarkets } from '@/hooks/use-markets';

const LiquidEther = dynamic(() => import('@/components/liquid-ether'), { ssr: false });

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };

export default function Landing() {
  const { status, signIn } = useAuth();
  const { markets } = useAllMarkets();
  const isAuthed = status === 'authenticated';

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <main className="relative min-h-screen flex flex-col bg-canvas overflow-hidden">
      <Nav />

      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-[100vh] flex items-center overflow-hidden"
      >
        <motion.div className="absolute inset-0 z-0" style={{ opacity: heroOpacity, y: heroY }}>
          <LiquidEther
            colors={['#CAFF3C', '#1A3D22', '#2B5E35']}
            mouseForce={25}
            cursorSize={130}
            isViscous
            viscous={30}
            iterationsViscous={32}
            iterationsPoisson={32}
            resolution={0.5}
            autoDemo
            autoSpeed={0.45}
            autoIntensity={2.5}
            takeoverDuration={0.3}
            autoResumeDelay={2500}
            autoRampDuration={0.8}
            style={{ width: '100%', height: '100%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-canvas/10 via-canvas/20 to-canvas/85 pointer-events-none" />
        </motion.div>

        <div className="relative z-10 px-6 w-full">
          <div className="mx-auto max-w-[1280px]">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="max-w-3xl space-y-8"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-3">
                <span className="dot-live" />
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-secondary">
                  Prediqt · prediction markets, encrypted · live on Sepolia
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="heading-display text-hero leading-[0.92] tracking-crunch"
              >
                <ScrambleText speed={28} steps={5}>
                  Predict the
                </ScrambleText>{' '}
                <span className="italic text-volt">future.</span>
                <br />
                <CyclingWord
                  className="text-ink/90"
                  words={['Privately.', 'Encrypted.', 'Together.', 'Onchain.']}
                />
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-ink-secondary text-lg max-w-[560px] leading-relaxed"
              >
                Bet YES or NO on anything — sports, crypto, your team's quarterly
                target. Positions stay encrypted with{' '}
                <span className="text-[#CAFF3C] underline decoration-volt/40 decoration-2 underline-offset-4">
                  Zama FHE
                </span>
                . Three AI agents bet alongside you in real time.
              </motion.p>

              <motion.div variants={fadeUp} className="flex items-center gap-6 flex-wrap pt-1">
                <MagneticButton>
                  {isAuthed ? (
                    <Link href="/pulse">
                      <Button size="xl">
                        Open Pulse <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button size="xl" onClick={signIn} loading={status === 'connecting'}>
                      Start predicting <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </MagneticButton>
                <Link
                  href="/agents"
                  className="group inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-secondary hover:text-volt transition-colors"
                >
                  watch the bots trade
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="pt-4">
                <LiveStatsRibbon markets={markets} />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-ink-muted"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.22em]">scroll</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─────────────────────── AGENT TICKER ────────────────────── */}
      <section className="relative z-10 border-y border-line bg-canvas-raised/40 backdrop-blur-md">
        <div className="mx-auto max-w-[1280px] px-6 py-3 flex items-center gap-4">
          <div className="shrink-0 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-volt">
            <span className="dot-live" />
            bots live
          </div>
          <div className="h-4 w-px bg-line shrink-0" />
          <div className="flex-1 min-w-0">
            <AgentQuotesMarquee />
          </div>
        </div>
      </section>

      {/* ─────────────────────── LIVE MARKETS ────────────────────── */}
      {markets.length > 0 && (
        <section className="px-6 pt-24 pb-16">
          <div className="mx-auto max-w-[1280px]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10 items-end">
              <div className="md:col-span-8 space-y-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                  ① open markets
                </div>
                <h2 className="font-display text-mega tracking-crunch leading-[0.95]">
                  Real questions.
                  <br />
                  <span className="italic text-ink-secondary">Real money.</span>
                </h2>
              </div>
              {isAuthed && (
                <div className="md:col-span-4 md:text-right">
                  <Link
                    href="/pulse"
                    className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-volt hover:underline"
                  >
                    browse all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {markets.slice(0, 6).map((m, i) => (
                <MarketCard key={m.id.toString()} market={m} index={i} compact />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ──────────────────────── PILLARS ────────────────────────── */}
      <section className="px-6 py-32 border-t border-line">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-20 items-end">
            <div className="md:col-span-7 space-y-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                ② how it works
              </div>
              <h2 className="font-display text-mega tracking-crunch leading-[0.95]">
                Three primitives.
                <br />
                <span className="italic text-volt">Infinite markets.</span>
              </h2>
            </div>
            <div className="md:col-span-5 md:text-right">
              <p className="text-ink-secondary text-base leading-relaxed max-w-sm md:ml-auto">
                Composable on-chain pieces. Each one does one job well, with privacy
                designed in from the contract level up.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line rounded-3xl overflow-hidden border border-line">
            {[
              {
                num: '01',
                icon: Globe2,
                title: 'Rooms',
                desc: 'Public rooms for world events. Private rooms for your team. Anyone in a room can post a YES/NO question.',
                detail: 'RoomRegistry.sol',
              },
              {
                num: '02',
                icon: Shield,
                title: 'Encrypted bets',
                desc: 'Individual positions encrypted with Zama FHE. Only the aggregate price is visible to everyone else.',
                detail: 'PredqCredit · ERC-7984',
              },
              {
                num: '03',
                icon: Bot,
                title: 'AI agents',
                desc: 'Quanta, Hawk, and Doubt — three GPT-driven traders that bet on every market through their own persona.',
                detail: 'AgentRegistry.sol',
              },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="relative bg-canvas group p-10 space-y-8 hover:bg-canvas-elevated transition-colors duration-500"
                >
                  {/* Number is the type element here, not the icon */}
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs tabular text-ink-muted">
                      {p.num}
                    </span>
                    <Icon className="h-4 w-4 text-ink-muted group-hover:text-volt transition-colors" />
                  </div>

                  <h3 className="font-display text-4xl tracking-crunch text-ink">
                    {p.title}
                  </h3>

                  <p className="text-ink-secondary text-[15px] leading-relaxed">
                    {p.desc}
                  </p>

                  <div className="pt-6 border-t border-line">
                    <span className="font-mono text-[10px] tabular text-ink-muted uppercase tracking-wider">
                      {p.detail}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────────── CTA ──────────────────────────── */}
      <section className="relative px-6 py-32 border-t border-line overflow-hidden">
        <div className="absolute inset-0 aurora-glow opacity-40 pointer-events-none" />
        <div aria-hidden className="absolute -bottom-40 -right-32 opacity-[0.025] pointer-events-none">
          <QMark size={620} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-3xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8 space-y-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-volt" />
                ③ ready when you are
              </div>
              <h2 className="font-display text-mega tracking-crunch leading-[0.95]">
                The future is{' '}
                <span className="italic text-volt">encrypted.</span>
                <br />
                <span className="text-ink-secondary">Go bet on it.</span>
              </h2>
              <p className="text-ink-secondary text-base leading-relaxed max-w-md">
                Sign in with email or wallet. Mint 1,000 PREDQ. Place your first bet.
                <span className="text-ink-muted"> No card. No KYC. No waiting.</span>
              </p>
            </div>
            <div className="md:col-span-4 md:text-right">
              <MagneticButton>
                {isAuthed ? (
                  <Link href="/pulse">
                    <Button size="xl">
                      Open Pulse <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button size="xl" onClick={signIn} loading={status === 'connecting'}>
                    Sign in <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </MagneticButton>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
