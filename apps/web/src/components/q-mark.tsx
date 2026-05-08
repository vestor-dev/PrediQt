import { cn } from '@/lib/utils';

/**
 * The Prediqt mark — "Eclipse".
 *
 * Two overlapping circles. The volt circle is the YES outcome; the dim
 * circle is the NO. The crescent of volt visible between them is the
 * resolution — one outcome eclipsed by the other.
 *
 * One coherent silhouette, no outlines, scales from favicon to billboard.
 */
export function QMark({
  className,
  size = 32,
  monochrome = false,
}: {
  className?: string;
  size?: number;
  monochrome?: boolean;
}) {
  const brand = monochrome ? '#FAFAFA' : '#CAFF3C';
  // Higher-contrast "dim" half so the eclipse reads on dark backgrounds.
  // Solid pale fill + a clearer stroke gives a crisp edge at every size.
  const dimFill = monochrome ? 'rgba(250,250,250,0.30)' : 'rgba(250,250,250,0.28)';
  const dimStroke = monochrome ? 'rgba(250,250,250,0.55)' : 'rgba(250,250,250,0.50)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="Prediqt"
    >
      <circle cx="20" cy="24" r="14" fill={brand} />
      <circle cx="28" cy="24" r="14" fill={dimFill} stroke={dimStroke} strokeWidth="1.4" />
    </svg>
  );
}

/** Wordmark — Eclipse mark + "prediqt" type lockup */
export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <QMark size={28} />
      <span className="font-display text-2xl tracking-crunch text-ink leading-none">
        predi <span className='text-volt font-semibold'>Q</span>t
      </span>
    </div>
  );
}
