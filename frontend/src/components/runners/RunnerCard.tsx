import { Runner, Task, AiProvider } from '../../types';
import { Button } from '@/components/ui/button';
import RunnerStatusBadge from './RunnerStatusBadge';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';

const AI_LABELS: Record<AiProvider, string> = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
  'cursor-agent': 'Cursor Agent',
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
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-soft hover:shadow-elevated transition-all duration-150 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-foreground truncate">{runner.name}</h3>
          {runner.device_info && (
            <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{runner.device_info}</p>
          )}
        </div>
        <RunnerStatusBadge status={runner.status} />
      </div>

      {/* Providers */}
      {providers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {providers.map((p) => (
            <span key={p} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-foreground/[0.04] text-muted-foreground">
              {AI_LABELS[p] ?? p}
            </span>
          ))}
        </div>
      )}

      {/* Current task */}
      {currentTask && runner.status === 'busy' && (
        <div className="bg-yellow-500/[0.06] rounded-md px-3 py-2">
          <p className="text-[11px] text-yellow-600 font-medium">Running task</p>
          <p className="text-[13px] text-foreground font-mono mt-0.5 truncate">
            {currentTask.task_key}: {currentTask.title}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
        <div className="min-w-0">
          <span className="block text-[11px] text-muted-foreground/50">
            Heartbeat {timeAgo(runner.last_heartbeat)}
          </span>
          {runner.last_cli_scan_at && (
            <span className="block text-[10px] text-muted-foreground/40">
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
            className="h-7 w-7 text-muted-foreground/40"
            onClick={() => onRefresh(runner.id)}
            disabled={refreshing || runner.status === 'offline'}
            title={runner.status === 'offline' ? 'Runner must be online to refresh CLIs' : 'Re-check installed CLIs'}
          >
            {refreshing || cliRefreshPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-destructive transition-colors duration-150"
            onClick={() => onDelete(runner.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
