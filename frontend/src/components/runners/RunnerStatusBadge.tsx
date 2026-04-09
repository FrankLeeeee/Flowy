import { RunnerStatus } from '../../types';
import { cn } from '@/lib/utils';

const styles: Record<RunnerStatus, { dot: string; text: string }> = {
  online:  { dot: 'bg-emerald-500 status-glow', text: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20' },
  busy:    { dot: 'bg-amber-500 status-glow', text: 'bg-amber-500/12 text-amber-700 dark:text-amber-400 ring-amber-500/20' },
  offline: { dot: 'bg-foreground/20', text: 'bg-foreground/[0.05] text-muted-foreground ring-foreground/10' },
};

export default function RunnerStatusBadge({ status }: { status: RunnerStatus }) {
  const s = styles[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold capitalize ring-1', s.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      <span>{status}</span>
    </span>
  );
}
