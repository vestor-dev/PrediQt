'use client';

import * as React from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';

type ToastEntry = {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error';
  action?: { label: string; href?: string; onClick?: () => void };
};

let externalPush: ((t: Omit<ToastEntry, 'id'>) => void) | null = null;

export function toast(t: Omit<ToastEntry, 'id'>) {
  externalPush?.(t);
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastEntry[]>([]);

  React.useEffect(() => {
    externalPush = (t) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, ...t }]);
    };
    return () => {
      externalPush = null;
    };
  }, []);

  return (
    <ToastProvider duration={6000}>
      {toasts.map(({ id, title, description, variant, action }) => (
        <Toast
          key={id}
          variant={variant}
          onOpenChange={(open) => {
            if (!open) setToasts((prev) => prev.filter((t) => t.id !== id));
          }}
        >
          <div className="flex-1 space-y-1">
            <ToastTitle>{title}</ToastTitle>
            {description && <ToastDescription>{description}</ToastDescription>}
            {action && (
              action.href ? (
                <a
                  href={action.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-volt text-xs font-mono uppercase tracking-wider mt-2 inline-block hover:underline"
                >
                  {action.label} →
                </a>
              ) : (
                <button
                  onClick={action.onClick}
                  className="text-volt text-xs font-mono uppercase tracking-wider mt-2"
                >
                  {action.label}
                </button>
              )
            )}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
