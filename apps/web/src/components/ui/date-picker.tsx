'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { format, setHours, setMinutes, addHours, addDays, addMonths, subMonths } from 'date-fns';
import * as Popover from '@radix-ui/react-popover';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/**
 * Tiny scrollable dropdown — used for hour / minute / year pickers inside the
 * date picker. Native `<select>` is unconstrained on macOS; this gives us a
 * fixed `max-h` with overflow scroll.
 */
function ScrollSelect<T extends string | number>({
  value,
  options,
  onChange,
  format: fmt,
  width = 'auto',
  align = 'center',
  ariaLabel,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
  width?: string;
  align?: 'start' | 'center' | 'end';
  ariaLabel: string;
}) {
  const [open, setOpen] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const display = fmt ? fmt(value) : String(value);

  // Scroll the selected item into view when the popover opens.
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const el = listRef.current?.querySelector<HTMLButtonElement>('[data-selected="true"]');
      el?.scrollIntoView({ block: 'center' });
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          style={{ minWidth: width }}
          className={cn(
            'rounded px-1.5 py-0.5 font-mono text-[12px] tabular text-white',
            'cursor-pointer focus:outline-none hover:bg-[#2a2a30] transition-colors',
            'flex items-center justify-center',
          )}
        >
          {display}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          className={cn(
            'z-[80] rounded-lg border border-[rgba(255,255,255,0.10)]',
            'bg-[#1B1B22] shadow-[0_18px_60px_-12px_rgba(0,0,0,0.95)]',
            'data-[state=open]:animate-fade-up p-1',
          )}
        >
          <div
            ref={listRef}
            className="max-h-[200px] overflow-y-auto overscroll-contain"
            onWheel={(e) => {
              // Nested-popover gotcha: the outer date-picker Popover swallows
              // wheel events. Manually drive scrollTop so the user's wheel
              // actually moves the list.
              e.stopPropagation();
              e.currentTarget.scrollTop += e.deltaY;
            }}
          >
            {options.map((opt) => {
              const selected = opt === value;
              const label = fmt ? fmt(opt) : String(opt);
              return (
                <button
                  key={String(opt)}
                  type="button"
                  data-selected={selected || undefined}
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={cn(
                    'flex items-center justify-between w-full px-2.5 py-1.5 rounded-md',
                    'font-mono text-[12px] tabular text-left',
                    'transition-colors duration-100',
                    selected
                      ? 'bg-volt/15 text-volt'
                      : 'text-[#bbb] hover:bg-[#28282F] hover:text-white',
                  )}
                >
                  <span>{label}</span>
                  {selected && <Check className="h-3 w-3 ml-3" />}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** 5 years back, current, 10 years forward — adjustable. */
function yearOptions(centerYear: number): number[] {
  const out: number[] = [];
  for (let y = centerYear - 5; y <= centerYear + 10; y++) out.push(y);
  return out;
}

interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  placeholder?: string;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  minDate,
  placeholder = 'Pick a date & time',
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hours, setH] = React.useState(value ? value.getHours() : 18);
  const [mins, setM] = React.useState(value ? value.getMinutes() : 0);
  const [month, setMonth] = React.useState<Date>(value ?? new Date());

  React.useEffect(() => {
    if (value) setMonth(value);
  }, [value]);

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    onChange(setMinutes(setHours(day, hours), mins));
  };

  const handleTimeChange = (h: number, m: number) => {
    setH(h);
    setM(m);
    if (value) onChange(setMinutes(setHours(value, h), m));
  };

  const handlePreset = (d: Date) => {
    setH(d.getHours());
    setM(0);
    onChange(d);
    setMonth(d);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-3 h-12 w-full rounded-xl px-4',
            'bg-[#1A1A20] border border-[rgba(255,255,255,0.08)]',
            'text-left transition-all duration-150',
            'hover:border-[rgba(255,255,255,0.14)] focus:border-volt/50 focus:outline-none',
            !value && 'text-[#555]',
            value && 'text-white',
            className,
          )}
        >
          <Calendar className="h-4 w-4 text-[#888] shrink-0" />
          <span className="flex-1 font-sans text-sm">
            {value ? format(value, 'EEE, MMM d, yyyy') : placeholder}
          </span>
          {value && (
            <span className="font-mono text-xs tabular text-volt">
              {format(value, 'HH:mm')}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
          avoidCollisions
          className={cn(
            'z-[70] rounded-2xl border border-[rgba(255,255,255,0.08)]',
            'bg-[#1E1E24] shadow-[0_24px_80px_-16px_rgba(0,0,0,0.9)]',
            'data-[state=open]:animate-fade-up',
            'w-[340px] overflow-hidden',
          )}
        >
          {/* Quick presets */}
          <div className="px-3 pt-3 pb-2.5 grid grid-cols-6 gap-1">
            {[
              { label: '1h', fn: () => addHours(new Date(), 1) },
              { label: '6h', fn: () => addHours(new Date(), 6) },
              { label: '24h', fn: () => addDays(new Date(), 1) },
              { label: '3d', fn: () => addDays(new Date(), 3) },
              { label: '1w', fn: () => addDays(new Date(), 7) },
              { label: '1mo', fn: () => addDays(new Date(), 30) },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p.fn())}
                className={cn(
                  'px-1 py-1.5 rounded-md font-mono text-[10px] uppercase tracking-wider',
                  'bg-[#28282F] text-[#999] border border-transparent',
                  'hover:bg-volt/10 hover:text-volt hover:border-volt/20',
                  'transition-all duration-150',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Month header — prev | month-select + year-select | next */}
          <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-1 border-t border-[rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={() => setMonth(subMonths(month, 1))}
              className="h-7 w-7 rounded-md flex items-center justify-center text-[#888] hover:text-white hover:bg-[#2a2a30] transition-colors shrink-0"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-0.5 bg-[#28282F] rounded-md p-0.5">
              <ScrollSelect
                ariaLabel="Month"
                value={month.getMonth()}
                options={Array.from({ length: 12 }, (_, i) => i)}
                format={(i) => MONTHS[i]}
                onChange={(i) => {
                  const next = new Date(month);
                  next.setMonth(i);
                  setMonth(next);
                }}
                width="44px"
              />
              <ScrollSelect
                ariaLabel="Year"
                value={month.getFullYear()}
                options={yearOptions(month.getFullYear())}
                onChange={(y) => {
                  const next = new Date(month);
                  next.setFullYear(y);
                  setMonth(next);
                }}
                width="44px"
              />
            </div>
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, 1))}
              className="h-7 w-7 rounded-md flex items-center justify-center text-[#888] hover:text-white hover:bg-[#2a2a30] transition-colors shrink-0"
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="px-3 pb-2">
            <DayPicker
              mode="single"
              month={month}
              onMonthChange={setMonth}
              selected={value ?? undefined}
              onSelect={handleDaySelect}
              disabled={minDate ? { before: minDate } : undefined}
              hideNavigation
              classNames={{
                root: 'w-full',
                months: 'w-full',
                month: 'w-full',
                month_caption: 'hidden',
                month_grid: 'w-full table-fixed border-collapse',
                weekdays: '',
                weekday: 'text-center font-mono text-[10px] uppercase tracking-wider text-[#555] py-2 font-normal',
                weeks: '',
                week: '',
                day: 'p-0.5 text-center align-middle',
                day_button: cn(
                  'h-10 w-full rounded-lg font-mono text-[14px] tabular text-[#ccc]',
                  'inline-flex items-center justify-center',
                  'transition-all duration-150',
                  'hover:bg-volt/15 hover:text-volt',
                  'focus:outline-none',
                ),
                selected: '!bg-volt !text-[#09090B] font-bold !rounded-lg',
                today: 'ring-1 ring-inset ring-volt/40 text-volt rounded-lg',
                disabled: 'text-[#333] !cursor-not-allowed hover:!bg-transparent hover:!text-[#333]',
                outside: 'text-[#2a2a2a]',
              }}
            />
          </div>

          {/* Time + Done */}
          <div className="px-3 py-2.5 border-t border-[rgba(255,255,255,0.06)] bg-[#16161B] flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5 bg-[#28282F] rounded-md p-0.5">
              <ScrollSelect
                ariaLabel="Hour"
                value={hours}
                options={Array.from({ length: 24 }, (_, i) => i)}
                format={(i) => i.toString().padStart(2, '0')}
                onChange={(h) => handleTimeChange(h, mins)}
                width="28px"
              />
              <span className="text-[#555] font-mono text-xs">:</span>
              <ScrollSelect
                ariaLabel="Minute"
                value={mins}
                options={Array.from({ length: 60 }, (_, m) => m)}
                format={(i) => i.toString().padStart(2, '0')}
                onChange={(m) => handleTimeChange(hours, m)}
                width="28px"
              />
            </div>

            <span className="flex-1 font-mono text-[10px] uppercase tracking-wider text-[#666] truncate text-right">
              {value ? format(value, 'EEE, MMM d') : 'pick a day'}
            </span>

            <Button
              type="button"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={!value}
            >
              Done
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
