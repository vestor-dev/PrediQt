'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button, type ButtonProps } from './ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  /** Key-value pairs shown in a summary card */
  details?: { label: string; value: string; accent?: 'volt' | 'up' | 'down' }[];
  confirmLabel?: string;
  confirmVariant?: ButtonProps['variant'];
  cancelLabel?: string;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  details,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  cancelLabel = 'Cancel',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 4 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'pointer-events-auto relative',
                'w-[92vw] max-w-[380px]',
                'rounded-2xl border border-line bg-canvas-elevated',
                'shadow-elevated overflow-hidden',
              )}
            >
              {/* Top accent line */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-volt/40 to-transparent" />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute right-3 top-3 rounded-full p-1.5 text-ink-ghost hover:text-ink hover:bg-canvas-raised transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start gap-3.5 pr-6">
                  {icon && (
                    <div className="shrink-0 h-10 w-10 rounded-xl bg-canvas-raised border border-line flex items-center justify-center text-volt">
                      {icon}
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="font-sans font-semibold text-[15px] text-ink leading-tight">
                      {title}
                    </h3>
                    {description && (
                      <p className="text-ink-muted text-sm leading-relaxed">{description}</p>
                    )}
                  </div>
                </div>

                {/* Details card */}
                {details && details.length > 0 && (
                  <div className="rounded-xl bg-canvas-raised border border-line divide-y divide-line">
                    {details.map((d) => (
                      <div key={d.label} className="flex items-center justify-between px-4 py-2.5">
                        <span className="label">{d.label}</span>
                        <span
                          className={cn(
                            'font-mono text-sm tabular font-medium',
                            d.accent === 'volt' && 'text-volt',
                            d.accent === 'up' && 'text-up',
                            d.accent === 'down' && 'text-down',
                            !d.accent && 'text-ink',
                          )}
                        >
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="md"
                    className="flex-1"
                    onClick={onClose}
                    disabled={loading}
                  >
                    {cancelLabel}
                  </Button>
                  <Button
                    variant={confirmVariant}
                    size="md"
                    className="flex-1"
                    onClick={handleConfirm}
                    loading={loading}
                  >
                    {confirmLabel}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
