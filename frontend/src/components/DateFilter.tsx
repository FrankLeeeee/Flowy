import { useState } from 'react';
import { DateFilterState, DateFilterMode, getTodayDateString, formatDateFilterLabel } from '@/lib/dateFilter';
import { cn } from '@/lib/utils';
import { CalendarDays, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DateFilterProps {
  value: DateFilterState;
  onChange: (next: DateFilterState) => void;
  className?: string;
}

export default function DateFilter({ value, onChange, className }: DateFilterProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.startDate);
  const [customEnd, setCustomEnd] = useState(value.endDate);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handlePreset = (mode: DateFilterMode) => {
    const today = getTodayDateString();
    onChange({ mode, startDate: today, endDate: today });
    setCustomOpen(false);
    setDropdownOpen(false);
  };

  const handleCustomApply = () => {
    const start = customStart || getTodayDateString();
    const end = customEnd && customEnd >= start ? customEnd : start;
    onChange({ mode: 'custom', startDate: start, endDate: end });
    setCustomOpen(false);
    setDropdownOpen(false);
  };

  const isActive = (mode: DateFilterMode) => value.mode === mode;

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 text-[11px] font-medium text-foreground shadow-soft transition-colors hover:bg-muted/50 focus:outline-none',
            className,
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          {formatDateFilterLabel(value)}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52 rounded-xl border-border/60 bg-popover p-1 shadow-none">
        <DropdownMenuItem
          onClick={() => handlePreset('today')}
          className={cn('rounded-lg py-2 text-[12px] font-medium', isActive('today') && !customOpen && 'bg-primary/10 text-primary')}
        >
          Today
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handlePreset('week')}
          className={cn('rounded-lg py-2 text-[12px] font-medium', isActive('week') && !customOpen && 'bg-primary/10 text-primary')}
        >
          This week
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            setCustomOpen((prev) => !prev);
            setCustomStart(value.startDate);
            setCustomEnd(value.endDate);
          }}
          className={cn('rounded-lg py-2 text-[12px] font-medium', isActive('custom') && 'bg-primary/10 text-primary')}
        >
          Custom range…
        </DropdownMenuItem>

        {customOpen && (
          <div className="mt-1 flex flex-col gap-2 px-2 pb-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/75">From</label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 rounded-lg border-border/60 text-[12px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/75">To</label>
              <Input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 rounded-lg border-border/60 text-[12px]"
              />
            </div>
            <Button size="sm" onClick={handleCustomApply} className="h-7 rounded-full px-3 text-[11px]">
              Apply
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
