import { RunnerStatus } from '../../types';
import { cn } from '@/lib/utils';

const styles: Record<RunnerStatus, { dot: string; text: string }> = {
  online:  { dot: 'bg-emerald-500', text: 'text-emerald-600' },
  busy:    { dot: 'bg-yellow-500',  text: 'text-yellow-600' },
  offline: { dot: 'bg-foreground/20', text: 'text-muted-foreground' },
};

export default function RunnerStatusBadge({ status }: { status: RunnerStatus }) {
  const s = styles[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium capitalize">
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      <span className={cn(s.text)}>{status}</span>
    </span>
  );
}
