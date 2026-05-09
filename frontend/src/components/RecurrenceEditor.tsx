import { useState } from 'react';
import { RecurrenceRule, RecurrenceFrequency } from '../types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Repeat, X } from 'lucide-react';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface RecurrenceEditorProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

function defaultRule(): RecurrenceRule {
  const today = new Date().getDay();
  return { frequency: 'week', interval: 1, daysOfWeek: [today], time: null, endDate: null };
}

export default function RecurrenceEditor({ value, onChange }: RecurrenceEditorProps) {
  const [expanded, setExpanded] = useState(!!value);

  const handleEnable = () => {
    setExpanded(true);
    if (!value) onChange(defaultRule());
  };

  const handleDisable = () => {
    setExpanded(false);
    onChange(null);
  };

  const update = (patch: Partial<RecurrenceRule>) => {
    onChange({ ...(value ?? defaultRule()), ...patch });
  };

  const toggleDay = (day: number) => {
    const current = value?.daysOfWeek ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    if (next.length === 0) return;
    update({ daysOfWeek: next });
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={handleEnable}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-soft transition-colors hover:text-foreground hover:border-border"
      >
        <Repeat className="h-3.5 w-3.5" />
        Repeat
      </button>
    );
  }

  const rule = value ?? defaultRule();

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary/80">
          <Repeat className="h-3 w-3" />
          Recurring
        </span>
        <button
          type="button"
          onClick={handleDisable}
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Every N frequency */}
      <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
        <span className="text-muted-foreground">Every:</span>
        <Input
          type="number"
          min={1}
          max={99}
          value={rule.interval}
          onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
          className="h-7 w-14 border-border/60 bg-card text-center text-[12px] shadow-soft"
        />
        <Select value={rule.frequency} onValueChange={(v) => update({ frequency: v as RecurrenceFrequency })}>
          <SelectTrigger className="h-7 w-[88px] gap-1 border-border/60 bg-card text-[12px] shadow-soft focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/60 p-1">
            <SelectItem value="day" className="rounded-lg text-[12px]">day{rule.interval > 1 ? 's' : ''}</SelectItem>
            <SelectItem value="week" className="rounded-lg text-[12px]">week{rule.interval > 1 ? 's' : ''}</SelectItem>
            <SelectItem value="month" className="rounded-lg text-[12px]">month{rule.interval > 1 ? 's' : ''}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Days of week (only for weekly) */}
      {rule.frequency === 'week' && (
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-muted-foreground font-medium">On:</span>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, i) => {
              const selected = rule.daysOfWeek?.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold transition-all duration-100',
                    selected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card text-muted-foreground ring-1 ring-border/60 hover:ring-border hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Time */}
      <div className="flex items-center gap-2 text-[12px]">
        <span className="text-muted-foreground font-medium">Time:</span>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={!!rule.time}
            onChange={(e) => update({ time: e.target.checked ? '09:00' : null })}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-foreground/10 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-muted-foreground/60 after:transition-all after:content-[''] peer-checked:bg-primary/20 peer-checked:after:translate-x-full peer-checked:after:bg-primary" />
        </label>
        {rule.time && (
          <Input
            type="time"
            step={60}
            value={rule.time}
            onChange={(e) => update({ time: e.target.value || null })}
            className="h-7 w-[100px] border-border/60 bg-card text-[12px] shadow-soft"
          />
        )}
      </div>

      {/* End date */}
      <div className="flex items-center gap-2 text-[12px]">
        <span className="text-muted-foreground font-medium">End:</span>
        <Select
          value={rule.endDate ? 'date' : 'never'}
          onValueChange={(v) => {
            if (v === 'never') update({ endDate: null });
            else {
              const d = new Date();
              d.setMonth(d.getMonth() + 3);
              update({ endDate: d.toISOString().slice(0, 10) });
            }
          }}
        >
          <SelectTrigger className="h-7 w-[88px] gap-1 border-border/60 bg-card text-[12px] shadow-soft focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/60 p-1">
            <SelectItem value="never" className="rounded-lg text-[12px]">Never</SelectItem>
            <SelectItem value="date" className="rounded-lg text-[12px]">On date</SelectItem>
          </SelectContent>
        </Select>
        {rule.endDate && (
          <Input
            type="date"
            value={rule.endDate}
            onChange={(e) => update({ endDate: e.target.value || null })}
            className="h-7 w-[130px] border-border/60 bg-card text-[12px] shadow-soft"
          />
        )}
      </div>
    </div>
  );
}
