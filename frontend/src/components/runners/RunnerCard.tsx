import { Runner, Task, AiProvider } from '../../types';
import { Button } from '@/components/ui/button';
import RunnerStatusBadge from './RunnerStatusBadge';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';

const AI_LABELS: Record<AiProvider, string> = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
  'cursor-agent': 'Cursor Agent',
};

const PROVIDER_STYLES: Record<AiProvider, string> = {
  'claude-code': 'bg-[#F97316]/12 text-[#C2410C] dark:text-orange-400 ring-[#F97316]/15',
  'codex': 'bg-primary/12 text-primary ring-primary/15',
  'cursor-agent': 'bg-sky-500/12 text-sky-700 dark:text-sky-400 ring-sky-500/15',
};

const STATUS_SURFACE: Record<Runner['status'], string> = {
  online: 'from-emerald-500/12 via-transparent to-transparent',
  busy: 'from-amber-500/14 via-transparent to-transparent',
  offline: 'from-foreground/[0.05] via-transparent to-transparent',
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const normalized = /[zZ]$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const timestamp = new Date(normalized).getTime();
  if (Number.isNaN(timestamp)) return 'unknown';
  const ms = Date.now() - timestamp;
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

export default function RunnerCard({
  runner, currentTask, onDelete, onRefresh, refreshing,
}: {
  runner: Runner;
  currentTask?: Task;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  refreshing: boolean;
}) {
  const providers: AiProvider[] = JSON.parse(runner.ai_providers || '[]');
  const cliRefreshPending = Boolean(
    runner.cli_refresh_requested_at &&
    (!runner.last_cli_scan_at || new Date(runner.cli_refresh_requested_at).getTime() > new Date(runner.last_cli_scan_at).getTime())
  );

  return (
    <div className="motion-card interactive-lift surface-tint relative rounded-[18px] border border-border/40 dark:border-border/60 p-4 shadow-soft hover:shadow-elevated motion-safe:hover:-translate-y-1 flex flex-col gap-3 overflow-hidden">
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br', STATUS_SURFACE[runner.status])} />
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
            <span key={p} className={cn('inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ring-1', PROVIDER_STYLES[p] ?? 'bg-foreground/[0.04] text-muted-foreground ring-foreground/10')}>
              {AI_LABELS[p] ?? p}
            </span>
          ))}
        </div>
      )}

      {/* Current task */}
      {currentTask && runner.status === 'busy' && (
        <div className="relative overflow-hidden rounded-xl border border-amber-500/15 bg-amber-500/[0.08] px-3 py-2">
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">Running task</p>
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
            <span className="block text-[10px] text-amber-600">
              Refresh requested
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
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
