import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
    'transition-all duration-200 ease-out',
    'disabled:pointer-events-none disabled:opacity-40',
    'ring-focus relative overflow-hidden',
    'font-mono text-[11px] uppercase tracking-[0.12em]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-volt text-canvas-sunken',
          'hover:bg-volt-bright hover:shadow-glow-sm active:scale-[0.98]',
          'shadow-sm',
        ].join(' '),
        secondary: [
          'bg-canvas-elevated text-ink border border-line',
          'hover:border-line-strong hover:bg-canvas-raised',
        ].join(' '),
        outline: [
          'border border-line text-ink-secondary',
          'hover:border-volt/40 hover:text-volt',
        ].join(' '),
        ghost: [
          'text-ink-muted hover:text-ink hover:bg-canvas-elevated',
        ].join(' '),
        danger: [
          'bg-down text-white',
          'hover:bg-red-600 active:scale-[0.98]',
        ].join(' '),
      },
      size: {
        sm: 'h-8 px-3 rounded-lg text-[10px]',
        md: 'h-10 px-5 rounded-xl',
        lg: 'h-12 px-6 rounded-xl',
        xl: 'h-14 px-8 rounded-2xl text-xs',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? (
          <>
            <span className="inline-block w-3 h-3 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" />
            <span>working…</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
