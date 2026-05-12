import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  combineDurationMinutes,
  getDurationHourOptions,
  getDurationMinuteOptions,
  splitDurationMinutes,
} from '@/lib/taskDuration';

type Variant = 'pill' | 'inline';

const TRIGGER_VARIANTS: Record<Variant, string> = {
  pill: 'h-5 w-auto gap-0.5 border-0 bg-transparent p-0 text-[11px] font-medium shadow-none focus:ring-0 focus:ring-offset-0',
  inline: 'h-auto w-auto gap-0.5 border-0 bg-transparent p-0 text-[13px] font-medium text-foreground shadow-none focus:ring-0 focus:ring-offset-0',
};

export default function DurationPicker({
  value,
  onChange,
  variant = 'pill',
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  variant?: Variant;
}) {
  const { hours, minutes } = splitDurationMinutes(value);
  const hourOptions = getDurationHourOptions();
  const minuteOptions = getDurationMinuteOptions();
  const triggerClass = TRIGGER_VARIANTS[variant];

  const handleHoursChange = (next: string) => {
    onChange(combineDurationMinutes(Number(next), minutes));
  };
  const handleMinutesChange = (next: string) => {
    onChange(combineDurationMinutes(hours, Number(next)));
  };

  return (
    <div className="inline-flex items-center gap-0.5">
      <Select value={String(hours)} onValueChange={handleHoursChange}>
        <SelectTrigger
          aria-label="Duration hours"
          className={cn(triggerClass, '[&>svg]:hidden')}
        >
          <SelectValue>{`${hours}h`}</SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none max-h-60">
          {hourOptions.map((h) => (
            <SelectItem key={h} value={String(h)} className="rounded-lg py-1.5 pl-7 pr-3 text-[11px] font-medium">
              {h}h
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(minutes)} onValueChange={handleMinutesChange}>
        <SelectTrigger
          aria-label="Duration minutes"
          className={cn(triggerClass, '[&>svg]:hidden')}
        >
          <SelectValue>{`${minutes}m`}</SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none max-h-60">
          {minuteOptions.map((m) => (
            <SelectItem key={m} value={String(m)} className="rounded-lg py-1.5 pl-7 pr-3 text-[11px] font-medium">
              {m}m
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
