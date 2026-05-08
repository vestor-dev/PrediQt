'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';
import { isAddress } from 'ethers';

import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { AuthGate } from '@/components/auth-gate';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { useCreatePrivateRoom } from '@/hooks/use-rooms';
import { useAuth } from '@/hooks/use-auth';
import { shortAddr } from '@/lib/utils';

export default function NewRoomPage() {
  return (
    <main className="relative min-h-screen flex flex-col">
      <Nav />
      <AuthGate>
        <NewRoomContent />
      </AuthGate>
      <Footer />
    </main>
  );
}

function NewRoomContent() {
  const router = useRouter();
  const { address } = useAuth();
  const { create, busy } = useCreatePrivateRoom();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteText, setInviteText] = useState('');

  const invitees = inviteText
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const validInvitees = invitees.filter((s) => isAddress(s));
  const invalidInvitees = invitees.filter((s) => !isAddress(s));

  const canSubmit = name.trim().length > 0 && name.trim().length <= 48;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const result = await create(name.trim(), description.trim(), validInvitees);
      if (result.id !== null) {
        router.push(`/rooms/${result.id.toString()}`);
      } else {
        router.push('/pulse');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="flex-1 px-6 pt-16 pb-24">
      <div className="mx-auto max-w-[1080px]">
        <Link
          href="/pulse"
          className="inline-flex items-center gap-2 label-micro hover:text-ink mb-12"
        >
          <ArrowLeft className="h-3 w-3" />
          back to pulse
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-12 gap-y-10">
          {/* Left: editorial intro */}
          <div className="md:col-span-5 space-y-6">
            <div className="label-micro flex items-center gap-2">
              <Lock className="h-3 w-3" />
              New private room
            </div>
            <h1 className="heading-display text-mega">
              Spin up a <span className="italic text-volt">space</span> for your bets.
            </h1>
            <div className="space-y-4 text-ink-dim text-sm leading-relaxed">
              <p>
                Private rooms are invite-only. Members can post markets and bet on
                anything they want — internal forecasts, friend-group bets, niche topics.
              </p>
              <p>
                Aggregate prices are visible to members.{' '}
                <span className="text-ink">Individual positions stay encrypted</span> on
                Zama&apos;s FHEVM, even from you as creator.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-canvas-raised p-4 space-y-2">
              <div className="label-micro">You&apos;ll be added as creator</div>
              <div className="font-mono text-sm tabular text-ink">
                {shortAddr(address ?? '', 6, 6)}
              </div>
            </div>
          </div>

          {/* Right: form */}
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onSubmit={onSubmit}
            className="md:col-span-7 space-y-7 rounded-3xl border border-line bg-canvas-raised p-8"
          >
            <Field
              label="Room name"
              hint={`${name.length}/48`}
            >
              <Input
                placeholder="e.g. Acme Corp · Engineering"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 48))}
                autoFocus
                required
              />
            </Field>

            <Field
              label="Description"
              hint={`${description.length}/240`}
            >
              <Textarea
                placeholder="What kind of markets live here? (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 240))}
              />
            </Field>

            <Field
              label="Invite members"
              hint={
                validInvitees.length === 0
                  ? 'optional'
                  : `${validInvitees.length} valid${invalidInvitees.length ? ` · ${invalidInvitees.length} skipped` : ''}`
              }
            >
              <Textarea
                placeholder="0xabc…&#10;0xdef…&#10;(one wallet address per line)"
                value={inviteText}
                onChange={(e) => setInviteText(e.target.value)}
                className="min-h-[110px] font-mono text-sm"
              />
              {validInvitees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3">
                  {validInvitees.map((addr) => (
                    <span
                      key={addr}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-volt/10 border border-volt/20 font-mono text-xs tabular text-volt"
                    >
                      {shortAddr(addr, 4, 4)}
                    </span>
                  ))}
                </div>
              )}
            </Field>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-line">
              <span className="label-micro">
                Submitting writes a tx to RoomRegistry on Sepolia.
              </span>
              <Button
                type="submit"
                size="lg"
                disabled={!canSubmit || busy}
                loading={busy}
              >
                Create room
              </Button>
            </div>
          </motion.form>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <label className="label-micro">{label}</label>
        {hint && <span className="label-micro text-ink-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
