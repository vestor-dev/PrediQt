'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ──────────────────────────────────────────────────────────
   Logo concepts — second pass.

   Constraints:
   • One coherent silhouette per mark (no outer frames with
     stuff inside — that's what made the previous batch read
     as search/input fields).
   • Two tones max: volt + ink.
   • Each must hold up at 16×16 favicon size.
   ────────────────────────────────────────────────────────── */

interface LogoProps {
  size?: number;
  className?: string;
  variant?: 'volt' | 'mono-light' | 'mono-dark';
}

function colors(v: LogoProps['variant'] = 'volt') {
  if (v === 'mono-light') return { brand: '#FAFAFA', dim: 'rgba(250,250,250,0.18)' };
  if (v === 'mono-dark') return { brand: '#09090B', dim: 'rgba(9,9,11,0.18)' };
  return { brand: '#CAFF3C', dim: 'rgba(250,250,250,0.14)' };
}

/* — 1. HALF MOON ——————————————————————————————————————
   A solid circle bisected vertically: left half volt,
   right half dim. Reads as a binary outcome — half-on,
   half-off. Unowned in this market. */
function HalfMoon({ size = 64, variant }: LogoProps) {
  const { brand, dim } = colors(variant);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <clipPath id="hm-l"><rect x="0" y="0" width="24" height="48" /></clipPath>
        <clipPath id="hm-r"><rect x="24" y="0" width="24" height="48" /></clipPath>
      </defs>
      <circle cx="24" cy="24" r="18" fill={brand} clipPath="url(#hm-l)" />
      <circle cx="24" cy="24" r="18" fill={dim} clipPath="url(#hm-r)" />
    </svg>
  );
}

/* — 2. BLOCK STACK ——————————————————————————————————
   Two horizontal bars stacked tight. The top bar (volt)
   is YES, the lower bar (dim) is NO. No frame around
   them. */
function BlockStack({ size = 64, variant }: LogoProps) {
  const { brand, dim } = colors(variant);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="8" y="13" width="32" height="9" rx="2" fill={brand} />
      <rect x="8" y="26" width="22" height="9" rx="2" fill={dim} />
    </svg>
  );
}

/* — 3. THE TAG ————————————————————————————————————————
   A solid rounded square with one corner sliced off, like
   a paper ticket. A single solid shape — the market itself,
   tear-off-able. */
function Tag({ size = 64, variant }: LogoProps) {
  const { brand } = colors(variant);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M 8 6 Q 8 6 8 6 L 32 6 L 42 16 L 42 40 Q 42 42 40 42 L 10 42 Q 8 42 8 40 Z"
        fill={brand}
      />
    </svg>
  );
}

/* — 4. SLASH ——————————————————————————————————————————
   A single thick diagonal stroke, top half volt, bottom
   half dim. Resolves as "one or the other". */
function Slash({ size = 64, variant }: LogoProps) {
  const { brand, dim } = colors(variant);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <clipPath id="sl-t"><polygon points="0,0 48,0 48,24 0,24" /></clipPath>
        <clipPath id="sl-b"><polygon points="0,24 48,24 48,48 0,48" /></clipPath>
      </defs>
      <line x1="10" y1="38" x2="38" y2="10" stroke={brand} strokeWidth="8" strokeLinecap="round" clipPath="url(#sl-t)" />
      <line x1="10" y1="38" x2="38" y2="10" stroke={dim} strokeWidth="8" strokeLinecap="round" clipPath="url(#sl-b)" />
    </svg>
  );
}

/* — 5. BLOCK P ————————————————————————————————————————
   A bold geometric P, single fill. The wordmark's first
   letter, owned. */
function BlockP({ size = 64, variant }: LogoProps) {
  const { brand } = colors(variant);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M 10 6
           L 10 42
           L 18 42
           L 18 30
           L 28 30
           Q 40 30 40 18
           Q 40 6 28 6
           Z
           M 18 13
           L 28 13
           Q 32 13 32 18
           Q 32 23 28 23
           L 18 23
           Z"
        fill={brand}
        fillRule="evenodd"
      />
    </svg>
  );
}

/* — 6. ECLIPSE ——————————————————————————————————————
   Two overlapping circles. The crescent of negative space
   between them is the brand. Two outcomes resolving into
   one. */
function Eclipse({ size = 64, variant }: LogoProps) {
  const { brand, dim } = colors(variant);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="20" cy="24" r="14" fill={brand} />
      <circle cx="28" cy="24" r="14" fill={dim} />
    </svg>
  );
}

/* — 7. CARET ——————————————————————————————————————————
   A single chunky right-pointing chevron. Forward, decided. */
function Caret({ size = 64, variant }: LogoProps) {
  const { brand } = colors(variant);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M 14 8 L 36 24 L 14 40 L 14 30 L 24 24 L 14 18 Z"
        fill={brand}
      />
    </svg>
  );
}

/* — 8. PULSE ——————————————————————————————————————————
   A thick volt dot with a smaller volt arc above-right of
   it — a heartbeat for live markets. */
function Pulse({ size = 64, variant }: LogoProps) {
  const { brand, dim } = colors(variant);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="22" cy="26" r="8" fill={brand} />
      <path
        d="M 30 22 Q 36 14 42 18"
        stroke={dim}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

interface Concept {
  id: string;
  name: string;
  tagline: string;
  Logo: React.ComponentType<LogoProps>;
  rationale: string;
  recommendation?: 'pick' | 'runner-up';
}

const CONCEPTS: Concept[] = [
  {
    id: 'half-moon',
    name: 'Half Moon',
    tagline: 'half-on, half-off',
    Logo: HalfMoon,
    rationale:
      'A solid circle bisected. The simplest possible mark for "binary outcome". Reads at every size, unique in this category, pairs perfectly with the volt accent. No outline, no frame — just one shape.',
    recommendation: 'pick',
  },
  {
    id: 'block-stack',
    name: 'Block Stack',
    tagline: 'YES over NO',
    Logo: BlockStack,
    rationale:
      'Two solid bars, no frame. The top bar (volt) is bigger and brighter — YES. The lower bar (dim) is shorter — NO. A probability bar reduced to its essence. Strong silhouette without looking like UI.',
    recommendation: 'runner-up',
  },
  {
    id: 'tag',
    name: 'Tag',
    tagline: 'a market is a ticket',
    Logo: Tag,
    rationale:
      'A solid filled square with one corner sliced off. Reads as a paper ticket, a stake, a claim. Single shape, brutally simple, scales to any size. Risk: looks more "ticketing" than "prediction".',
  },
  {
    id: 'eclipse',
    name: 'Eclipse',
    tagline: 'two outcomes, one resolution',
    Logo: Eclipse,
    rationale:
      'Two overlapping circles — the volt foreground and a dim background — form a crescent of negative space. Conceptually rich (resolution = collision), graphically clean.',
  },
  {
    id: 'block-p',
    name: 'Block P',
    tagline: 'wordmark, owned',
    Logo: BlockP,
    rationale:
      "A geometric capital P with a tightly cut bowl. Pure letterform — Polymarket and Robinhood both went this route for a reason. Risk: less iconic than abstract marks.",
  },
  {
    id: 'slash',
    name: 'Slash',
    tagline: 'one stroke, decided',
    Logo: Slash,
    rationale:
      'A single thick diagonal, top half volt, bottom half dim. A market resolving in real time. Unique and bold; reads slightly editorial / type-driven.',
  },
  {
    id: 'caret',
    name: 'Caret',
    tagline: 'forward, decisive',
    Logo: Caret,
    rationale:
      "A chunky `>` chevron. Single shape, instantly recognizable. Risk: too generic — every fintech and Web3 brand has a chevron variant.",
  },
  {
    id: 'pulse',
    name: 'Pulse',
    tagline: 'live signal',
    Logo: Pulse,
    rationale:
      'A solid volt dot with a small arc above. Heartbeat for live markets. Risk: too literal, looks like a status indicator instead of a brand.',
  },
];

export function LogosClient() {
  const [variant, setVariant] = useState<'volt' | 'mono-light' | 'mono-dark'>('volt');
  const [pickedId, setPickedId] = useState<string | null>(null);

  return (
    <section className="flex-1 px-6 pt-12 pb-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-12 max-w-2xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted mb-3">
            brand exploration · v2
          </div>
          <h1 className="font-display text-mega tracking-crunch leading-[0.95] mb-4">
            Eight directions.
            <br />
            <span className="italic text-volt">One shape each.</span>
          </h1>
          <p className="text-ink-secondary text-base leading-relaxed">
            Stricter rules this round: no outer frames, no outlines-with-content,
            no shapes that read as search inputs. Each mark is a single coherent
            silhouette that survives at favicon size.
          </p>
        </div>

        <div className="mb-8 inline-flex items-center gap-1 bg-canvas-elevated border border-line rounded-full p-1">
          {(['volt', 'mono-light', 'mono-dark'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              className={cn(
                'px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.14em] transition-colors',
                variant === v
                  ? 'bg-volt text-canvas-sunken'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {v.replace('-', ' ')}
            </button>
          ))}
        </div>

        <RecommendationBanner />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
          {CONCEPTS.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ConceptCard
                concept={c}
                variant={variant}
                picked={pickedId === c.id}
                onPick={() => setPickedId(pickedId === c.id ? null : c.id)}
              />
            </motion.div>
          ))}
        </div>

        {pickedId && (
          <ConceptDetail
            concept={CONCEPTS.find((c) => c.id === pickedId)!}
            variant={variant}
          />
        )}
      </div>
    </section>
  );
}

function RecommendationBanner() {
  return (
    <div className="rounded-2xl border-2 border-volt/30 bg-gradient-to-br from-volt/[0.06] to-transparent p-6 flex items-start gap-4">
      <div className="h-10 w-10 rounded-xl bg-volt/15 grid place-items-center text-volt shrink-0">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-volt">
            recommendation
          </span>
          <span className="font-display text-lg tracking-crunch">Half Moon</span>
        </div>
        <p className="text-ink-secondary text-sm leading-relaxed max-w-2xl">
          Solid filled circle, vertically bisected — half volt, half dim. The
          simplest possible visual for "two outcomes, one resolves". Owns its
          silhouette in this category, scales perfectly, and pairs with any
          color treatment. Nothing else on the page is fewer than one shape.
        </p>
      </div>
    </div>
  );
}

function ConceptCard({
  concept,
  variant,
  picked,
  onPick,
}: {
  concept: Concept;
  variant: 'volt' | 'mono-light' | 'mono-dark';
  picked: boolean;
  onPick: () => void;
}) {
  const { Logo, name, tagline, recommendation } = concept;
  return (
    <button
      onClick={onPick}
      className={cn(
        'group w-full text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden bg-canvas-elevated',
        picked ? 'border-volt' : 'border-line hover:border-line-strong',
        recommendation === 'pick' && !picked && 'ring-1 ring-volt/30',
      )}
    >
      <div
        className={cn(
          'h-44 grid place-items-center relative transition-colors',
          variant === 'mono-light' && 'bg-canvas-sunken',
          variant === 'mono-dark' && 'bg-volt',
          variant === 'volt' && 'bg-canvas-raised',
        )}
      >
        <Logo size={88} variant={variant} />

        {recommendation === 'pick' && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[9px] uppercase tracking-[0.14em] bg-volt text-canvas-sunken font-bold">
            <Check className="h-2.5 w-2.5" /> pick
          </span>
        )}
        {recommendation === 'runner-up' && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[9px] uppercase tracking-[0.14em] bg-canvas-elevated text-ink-secondary border border-line">
            runner-up
          </span>
        )}
      </div>

      <div className="p-4 space-y-1.5 border-t border-line">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg tracking-crunch text-ink">{name}</h3>
          <span className="font-mono text-[10px] tabular text-ink-muted">
            {String(CONCEPTS.findIndex((c) => c.id === concept.id) + 1).padStart(2, '0')}
          </span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
          {tagline}
        </p>
      </div>
    </button>
  );
}

function ConceptDetail({
  concept,
  variant,
}: {
  concept: Concept;
  variant: 'volt' | 'mono-light' | 'mono-dark';
}) {
  const { Logo, name, rationale } = concept;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-10 rounded-3xl border border-line bg-canvas-elevated overflow-hidden"
    >
      <div className="grid grid-cols-1 md:grid-cols-12">
        <div
          className={cn(
            'md:col-span-7 grid place-items-center py-20 px-12 transition-colors',
            variant === 'mono-light' && 'bg-canvas-sunken',
            variant === 'mono-dark' && 'bg-volt',
            variant === 'volt' && 'bg-canvas',
          )}
        >
          <Logo size={220} variant={variant} />
        </div>
        <div className="md:col-span-5 p-10 space-y-6 border-l border-line">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-volt mb-2">
              selected · {String(CONCEPTS.findIndex((c) => c.id === concept.id) + 1).padStart(2, '0')}
            </div>
            <h3 className="font-display text-3xl tracking-crunch">{name}</h3>
          </div>
          <p className="text-ink-secondary text-sm leading-relaxed">{rationale}</p>

          <div className="space-y-4 pt-4 border-t border-line">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              wordmark lock-up
            </div>
            <div className="flex items-center gap-3">
              <Logo size={36} variant={variant} />
              <span className="font-display text-3xl tracking-crunch text-ink">
                Prediqt
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-line">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              favicon scale (16 → 24 → 32 → 48)
            </div>
            <div className="flex items-end gap-4">
              {[16, 24, 32, 48].map((s) => (
                <div key={s} className="flex flex-col items-center gap-1.5">
                  <div className="grid place-items-center" style={{ height: 48, width: 48 }}>
                    <Logo size={s} variant={variant} />
                  </div>
                  <span className="font-mono text-[9px] tabular text-ink-muted">{s}px</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
