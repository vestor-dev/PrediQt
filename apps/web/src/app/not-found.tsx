'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Home, Compass } from 'lucide-react';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { QMark } from '@/components/q-mark';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export default function NotFound() {
  return (
    <main className="relative min-h-screen flex flex-col bg-canvas overflow-hidden">
      <Nav />

      {/* Soft volt aurora behind everything */}
      <div className="absolute inset-0 aurora-glow opacity-30 pointer-events-none" />
      <div
        aria-hidden
        className="absolute -top-24 -right-24 opacity-[0.04] pointer-events-none"
      >
        <QMark size={520} />
      </div>

      <section className="flex-1 px-4 sm:px-6 pt-16 sm:pt-24 pb-24 relative">
        <div className="mx-auto max-w-[1100px]">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center"
          >
            {/* Big 404 type */}
            <motion.div variants={fadeUp} className="lg:col-span-7 space-y-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                error · 404
              </div>

              <h1 className="font-display tracking-crunch leading-[0.9] text-[clamp(4rem,12vw,9rem)]">
                <span className="block text-ink">Question</span>
                <span className="block italic text-volt">not found.</span>
              </h1>

              <p className="text-ink-secondary text-base sm:text-lg leading-relaxed max-w-md">
                Either this market doesn't exist yet, or you guessed a URL that's
                older than the protocol. Either way — there's no bet to take here.
              </p>

              <div className="flex items-center gap-4 pt-2 flex-wrap">
                <Link href="/">
                  <Button size="lg">
                    <Home className="h-4 w-4" /> Back home
                  </Button>
                </Link>
                <Link
                  href="/pulse"
                  className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-secondary hover:text-volt transition-colors"
                >
                  <Compass className="h-3.5 w-3.5" />
                  browse open markets
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* Animated eclipse — half-on, half-off, just like the brand */}
            <motion.div
              variants={fadeUp}
              className="lg:col-span-5 flex justify-center lg:justify-end"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                  className="relative"
                >
                  <QMark size={220} />
                </motion.div>
                <div className="absolute inset-0 -m-12 rounded-full aurora-glow blur-3xl pointer-events-none" />
              </div>
            </motion.div>
          </motion.div>

          {/* Suggested routes — mini grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {[
              {
                href: '/pulse',
                label: 'Pulse',
                desc: 'Every open market, every settled outcome!',
              },
              {
                href: '/agents',
                label: 'Agents',
                desc: 'Watch Quanta, Hawk, and Doubt trade live.',
              },
              {
                href: '/rooms/new',
                label: 'New room',
                desc: 'Start your own room. Post the first question.',
              },
            ].map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="group surface p-5 hover:border-volt/40 transition-colors duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xl tracking-crunch text-ink group-hover:text-volt transition-colors">
                    {r.label}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-ink-muted group-hover:text-volt group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-ink-secondary text-[13px] leading-relaxed">
                  {r.desc}
                </p>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
