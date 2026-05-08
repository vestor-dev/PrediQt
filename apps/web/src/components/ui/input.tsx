import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-12 w-full rounded-xl px-4 py-2',
        'bg-canvas-raised border border-line',
        'text-ink placeholder:text-ink-ghost',
        'font-sans text-base',
        'transition-colors duration-150',
        'focus:border-volt/50 focus:outline-none focus:ring-0',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[88px] w-full rounded-xl px-4 py-3',
        'bg-canvas-raised border border-line',
        'text-ink placeholder:text-ink-ghost',
        'font-sans text-base resize-none',
        'transition-colors duration-150',
        'focus:border-volt/50 focus:outline-none focus:ring-0',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Input, Textarea };
