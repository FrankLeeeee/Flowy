import { RunnerStatus } from '../../types';
import { cn } from '@/lib/utils';
import { getRunnerStatusStyles } from '@/lib/semanticColors';

export default function RunnerStatusBadge({ status }: { status: RunnerStatus }) {
  const styles = getRunnerStatusStyles(status);
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold capitalize ring-1', styles.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full status-glow', styles.dot)} />
      <span>{status}</span>
    </span>
  );
}
