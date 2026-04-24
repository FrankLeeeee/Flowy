import { Runner, Task, AiProvider } from '../../types';
import { AI_LABELS } from '@/lib/taskConstants';
import { Button } from '@/components/ui/button';
import RunnerStatusBadge from './RunnerStatusBadge';
import { cn, timeAgo } from '@/lib/utils';
import { getAiProviderStyles, getRunnerStatusStyles } from '@/lib/semanticColors';
import { ArrowUpCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react';

export default function RunnerCard({
  runner, currentTask, onDelete, onRefresh, onUpdate, refreshing, updating,
}: {
  runner: Runner;
  currentTask?: Task;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onUpdate: (id: string) => void;
  refreshing: boolean;
  updating: boolean;
}) {
  const providers: AiProvider[] = JSON.parse(runner.ai_providers || '[]');
  const versions: Record<string, string> = JSON.parse(runner.cli_versions || '{}');
  const busyStyles = getRunnerStatusStyles('busy');
  const cliRefreshPending = Boolean(
    runner.cli_refresh_requested_at &&
    (!runner.last_cli_scan_at || new Date(runner.cli_refresh_requested_at).getTime() > new Date(runner.last_cli_scan_at).getTime())
  );
  const cliUpdatePending = Boolean(
    runner.cli_update_requested_at &&
    (!runner.last_cli_scan_at || new Date(runner.cli_update_requested_at).getTime() > new Date(runner.last_cli_scan_at).getTime())
  );

  return (
    <div className="motion-card interactive-lift surface-tint relative rounded-[18px] border border-border/40 dark:border-border/60 p-4 shadow-soft hover:shadow-elevated motion-safe:hover:-translate-y-1 flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-foreground truncate">{runner.name}</h3>
          {runner.device_info && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">{runner.device_info}</p>
          )}
        </div>
        <RunnerStatusBadge status={runner.status} />
      </div>

      {/* Providers */}
      {providers.length > 0 && (
        <div className="relative flex flex-wrap gap-1.5">
          {providers.map((p) => (
            <span key={p} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ring-1', getAiProviderStyles(p).pill)}>
              {AI_LABELS[p] ?? p}
              {versions[p] && <span className="font-normal opacity-60">v{versions[p]}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Current task */}
      {currentTask && runner.status === 'busy' && (
        <div className={cn('relative overflow-hidden rounded-xl border px-3 py-2', busyStyles.panel)}>
          <p className={cn('text-[11px] font-semibold', busyStyles.text)}>Running task</p>
          <p className="text-[13px] text-foreground font-mono mt-0.5 truncate">
            {currentTask.task_key}: {currentTask.title}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
        <div className="min-w-0">
          <span className="block text-[11px] text-muted-foreground/75">
            Heartbeat {timeAgo(runner.last_heartbeat)}
          </span>
          {runner.last_cli_scan_at && (
            <span className="block text-[10px] text-muted-foreground/65">
              CLI scan {timeAgo(runner.last_cli_scan_at)}
            </span>
          )}
          {cliRefreshPending && (
            <span className={cn('block text-[10px]', busyStyles.emphasis)}>
              Refresh requested
            </span>
          )}
          {cliUpdatePending && (
            <span className={cn('block text-[10px]', busyStyles.emphasis)}>
              Update requested
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 transition-colors duration-150',
              updating || cliUpdatePending ? 'text-primary' : 'text-muted-foreground/70',
            )}
            onClick={() => onUpdate(runner.id)}
            disabled={updating || cliUpdatePending || runner.status === 'offline'}
            title={runner.status === 'offline' ? 'Runner must be online to update CLIs' : 'Update installed CLIs to latest versions'}
          >
            <ArrowUpCircle className={cn('h-3.5 w-3.5', (updating || cliUpdatePending) && 'animate-bounce')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/70"
            onClick={() => onRefresh(runner.id)}
            disabled={refreshing || runner.status === 'offline'}
            title={runner.status === 'offline' ? 'Runner must be online to refresh CLIs' : 'Re-check installed CLIs'}
          >
            {refreshing || cliRefreshPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/70 transition-colors duration-150 hover:text-destructive"
            onClick={() => onDelete(runner.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
