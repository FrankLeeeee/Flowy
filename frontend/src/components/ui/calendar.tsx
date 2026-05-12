import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildCalendarGrid, isSameDay } from '@/lib/datePickerHelpers';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export interface CalendarProps {
  value?: Date;
  onChange: (date: Date) => void;
  min?: Date;
  max?: Date;
  className?: string;
}

export function Calendar({ value, onChange, min, max, className }: CalendarProps) {
  const [viewMonth, setViewMonth] = React.useState<Date>(() => startOfMonth(value ?? new Date()));

  React.useEffect(() => {
    if (value) setViewMonth(startOfMonth(value));
  }, [value]);

  const today = React.useMemo(() => stripTime(new Date()), []);
  const minDay = React.useMemo(() => (min ? stripTime(min) : null), [min]);
  const maxDay = React.useMemo(() => (max ? stripTime(max) : null), [max]);

  const monthLabel = viewMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const cells = React.useMemo(() => buildCalendarGrid(viewMonth), [viewMonth]);

  const handleSelect = (d: Date) => {
    if (minDay && d < minDay) return;
    if (maxDay && d > maxDay) return;
    onChange(d);
  };

  return (
    <div className={cn('select-none', className)}>
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-[12px] font-semibold text-foreground">{monthLabel}</div>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 px-1 pb-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="flex h-6 items-center justify-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 px-1 pb-1">
        {cells.map((cell, idx) => {
          const inMonth = cell.getMonth() === viewMonth.getMonth();
          const isToday = isSameDay(cell, today);
          const isSelected = value ? isSameDay(cell, value) : false;
          const disabled = (minDay && cell < minDay) || (maxDay && cell > maxDay);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(cell)}
              disabled={!!disabled}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-medium transition-colors',
                !inMonth && 'text-muted-foreground/40',
                inMonth && !isSelected && !isToday && 'text-foreground hover:bg-accent',
                inMonth && isToday && !isSelected && 'text-primary ring-1 ring-primary/30 hover:bg-primary/10',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary/92',
                disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
              )}
            >
              {cell.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
