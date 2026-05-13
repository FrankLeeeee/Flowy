import * as React from 'react';
import { formatIsoDate } from 'flowy-shared';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { parseIsoDate } from '@/lib/datePickerHelpers';
import { cn } from '@/lib/utils';

function formatDisplay(value: string | null | undefined): string {
  const d = parseIsoDate(value);
  if (!d) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  align?: 'start' | 'center' | 'end';
  ariaLabel?: string;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Pick a date',
  disabled,
  required,
  className,
  align = 'start',
  ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const display = value ? formatDisplay(value) : '';

  const handleSelect = (date: Date) => {
    onChange(formatIsoDate(date));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-required={required}
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
        <Calendar
          value={parseIsoDate(value) ?? undefined}
          onChange={handleSelect}
          min={parseIsoDate(min) ?? undefined}
          max={parseIsoDate(max) ?? undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
