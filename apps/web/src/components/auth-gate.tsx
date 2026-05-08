'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { QMark } from './q-mark';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, signIn } = useAuth();

  if (status === 'authenticated') return <>{children}</>;

  if (status === 'initializing') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <QMark size={32} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="text-center space-y-6 max-w-xs">
        <QMark size={40} className="mx-auto" />
        <h2 className="font-display text-2xl tracking-crunch">Sign in to continue</h2>
        <p className="text-ink-muted text-sm">Email, social, or wallet. No passwords.</p>
        <Button size="lg" onClick={signIn} loading={status === 'connecting'}>
          Sign in <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
