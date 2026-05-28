import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWheelScroll } from '@/hooks/useWheelScroll';
import { formatTimeValue, parseTimeValue } from '@/lib/datePickerHelpers';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_STEP = 5;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  align?: 'start' | 'center' | 'end';
  ariaLabel?: string;
  allowClear?: boolean;
}

export function TimePicker({
  value,
  onChange,
  placeholder = '--:--',
  disabled,
  className,
  align = 'start',
  ariaLabel,
  allowClear,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const parsed = parseTimeValue(value);
  const display = parsed ? formatTimeValue(parsed.hour, parsed.minute) : '';

  const selectHour = (h: number) => {
    const minute = parsed?.minute ?? 0;
    onChange(formatTimeValue(h, minute));
  };

  const selectMinute = (m: number) => {
    const hour = parsed?.hour ?? 0;
    onChange(formatTimeValue(hour, m));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          data-empty={!value || undefined}
          className={cn(
            'inline-flex items-center justify-start whitespace-nowrap bg-transparent text-left text-foreground outline-none transition-colors',
            'data-[empty]:text-muted-foreground/70',
            'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          {display || placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-2">
        <div className="flex gap-2">
          <TimeColumn
            label="Hour"
            values={HOURS}
            selected={parsed?.hour ?? null}
            onSelect={selectHour}
          />
          <TimeColumn
            label="Min"
            values={MINUTES}
            selected={parsed?.minute ?? null}
            onSelect={selectMinute}
          />
        </div>
        {allowClear && value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface TimeColumnProps {
  label: string;
  values: number[];
  selected: number | null;
  onSelect: (v: number) => void;
}

function TimeColumn({ label, values, selected, onSelect }: TimeColumnProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (selected == null) return;
    const container = scrollRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLButtonElement>(`[data-value="${selected}"]`);
    if (target) {
      const offset = target.offsetTop - container.clientHeight / 2 + target.clientHeight / 2;
      container.scrollTop = Math.max(0, offset);
    }
  }, [selected]);

  useWheelScroll(scrollRef);

  return (
    <div className="flex flex-col">
      <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </div>
      <div
        ref={scrollRef}
        className="h-44 w-12 overflow-y-auto rounded-md scroll-smooth"
      >
        <div className="flex flex-col gap-0.5 px-1 py-1">
          {values.map((v) => {
            const isSelected = selected === v;
            return (
              <button
                key={v}
                type="button"
                data-value={v}
                onClick={() => onSelect(v)}
                className={cn(
                  'flex h-7 items-center justify-center rounded-md text-[12px] font-medium tabular-nums transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent',
                )}
              >
                {pad(v)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
