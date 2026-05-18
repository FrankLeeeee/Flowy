import { useCallback, useEffect, useState } from 'react';
import { Runner, Task, RunnerCliLog, AiProvider } from '../../types';
import { fetchRunnerTasks, fetchRunnerCliLogs } from '../../api/client';
import { resolveDrawerRunner } from './runnerDrawerState';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AppDialogBody,
  AppDialogContent,
  AppDialogEyebrow,
  AppDialogHeader,
  AppDialogSection,
} from '@/components/ui/app-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import RunnerStatusBadge from './RunnerStatusBadge';
import { AI_LABELS, STATUS_CONFIG } from '@/lib/taskConstants';
import { cn, formatLocalDateTime, timeAgo } from '@/lib/utils';
import { getAiHarnessPillStyle, getTaskStatusStyles } from '@/lib/semanticColors';
import { Activity, ArrowUpCircle, ListChecks, RefreshCw, ScanLine } from 'lucide-react';

const CLI_LOG_ICON = {
  refresh_requested: RefreshCw,
  update_requested: ArrowUpCircle,
  scan_completed: ScanLine,
} as const;

function providerLabel(provider: string): string {
  return AI_LABELS[provider as AiProvider] ?? provider;
}

/** Turn a raw CLI log row into a human-readable title + detail line. */
function describeCliLog(log: RunnerCliLog): { title: string; detail: string } {
  if (log.event === 'refresh_requested') {
    return { title: 'CLI re-check requested', detail: 'Manual request from dashboard' };
  }
  if (log.event === 'update_requested') {
    return { title: 'CLI update requested', detail: 'Manual request from dashboard' };
  }

  const sourceLabel =
    log.source === 'update'
      ? 'After manual update'
      : log.source === 'refresh'
        ? 'After manual re-check'
        : 'Periodic / startup check';

  let providerSummary = 'No CLIs detected';
  try {
    const parsed = JSON.parse(log.data || '{}') as {
      providers?: string[];
      versions?: Record<string, string>;
    };
    const providers = parsed.providers ?? [];
    if (providers.length > 0) {
      providerSummary = providers
        .map((p) => {
          const version = parsed.versions?.[p];
          return version ? `${providerLabel(p)} v${version}` : providerLabel(p);
        })
        .join(', ');
    }
  } catch {
    /* keep the fallback summary */
  }

  return { title: 'CLI scan completed', detail: `${sourceLabel} · ${providerSummary}` };
}

export default function RunnerDetailDrawer({
  open,
  runner,
  onClose,
}: {
  open: boolean;
  runner: Runner | null;
  onClose: () => void;
}) {
  // Keep painting the last runner while the drawer animates closed; the parent
  // drops its selection (runner -> null) the instant it starts closing.
  const [displayRunner, setDisplayRunner] = useState<Runner | null>(runner);
  useEffect(() => {
    setDisplayRunner((prev) => resolveDrawerRunner(prev, runner));
  }, [runner]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [cliLogs, setCliLogs] = useState<RunnerCliLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const runnerId = displayRunner?.id;

  const loadActivity = useCallback(async () => {
    if (!runnerId) return;
    try {
      const [t, logs] = await Promise.all([
        fetchRunnerTasks(runnerId, 10),
        fetchRunnerCliLogs(runnerId, 20),
      ]);
      setTasks(t);
      setCliLogs(logs);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runner activity');
    } finally {
      setLoading(false);
    }
  }, [runnerId]);

  // Drop cached activity when the drawer targets a different runner so one
  // runner's tasks never flash under another's header. `runnerId` is retained
  // (not nulled) while closing, so this leaves the content intact mid-animation.
  useEffect(() => {
    setTasks([]);
    setCliLogs([]);
  }, [runnerId]);

  // Fetch when the drawer (re)opens or points at a different runner.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadActivity();
  }, [open, loadActivity]);

  // Runner activity is live — refresh only while the drawer stays open.
  useEffect(() => {
    if (!open) return;
    const iv = setInterval(loadActivity, 10_000);
    return () => clearInterval(iv);
  }, [open, loadActivity]);

  if (!displayRunner) return null;

  const providers: AiProvider[] = JSON.parse(displayRunner.ai_providers || '[]');
  const versions: Record<string, string> = JSON.parse(displayRunner.cli_versions || '{}');

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <AppDialogContent
        variant="drawer"
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.75rem)] max-h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.75rem)] min-w-0 max-w-[100vw] flex-col gap-0 overflow-hidden rounded-none sm:h-full sm:max-h-none sm:min-h-0 sm:max-w-[520px]"
      >
        <AppDialogHeader className="shrink-0">
          <DialogTitle className="sr-only">{displayRunner.name} activity</DialogTitle>
          <DialogDescription className="sr-only">
            Recent tasks and CLI check activity for this runner
          </DialogDescription>
          <AppDialogEyebrow>Runner activity</AppDialogEyebrow>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[15px] font-semibold leading-snug text-foreground">{displayRunner.name}</span>
            <RunnerStatusBadge status={displayRunner.status} />
          </div>
          {displayRunner.device_info && (
            <p className="mt-1 text-[12px] text-muted-foreground/80">{displayRunner.device_info}</p>
          )}
        </AppDialogHeader>

        <AppDialogBody className="flex min-h-0 flex-1 flex-col space-y-0 overflow-hidden px-0 py-0 sm:px-0 sm:py-0">
          <ScrollArea className="min-h-0 min-w-0 flex-1">
            <div className="flex min-w-0 flex-col gap-5 px-4 py-5 sm:px-6">
              {/* Overview */}
              <AppDialogSection className="rounded-lg bg-foreground/[0.02] p-4">
                {providers.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {providers.map((p) => (
                      <span
                        key={p}
                        className="ai-harness-pill inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
                        style={getAiHarnessPillStyle(p)}
                      >
                        {AI_LABELS[p] ?? p}
                        {versions[p] && <span className="font-normal opacity-60">v{versions[p]}</span>}
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground/75">
                  <div>Heartbeat: {timeAgo(displayRunner.last_heartbeat)}</div>
                  <div>CLI scan: {displayRunner.last_cli_scan_at ? timeAgo(displayRunner.last_cli_scan_at) : 'never'}</div>
                  <div>Registered: {formatLocalDateTime(displayRunner.created_at)}</div>
                  <div>Updated: {formatLocalDateTime(displayRunner.updated_at)}</div>
                </div>
              </AppDialogSection>

              {error && (
                <p className="text-[12px] text-destructive">{error}</p>
              )}

              {/* Recent tasks */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground/85">
                  <ListChecks className="h-3.5 w-3.5" />
                  Recent tasks
                </h3>
                {loading && tasks.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground/65">Loading…</p>
                ) : tasks.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground/65">No tasks handled by this runner yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {tasks.map((task) => {
                      const statusStyles = getTaskStatusStyles(task.status);
                      const statusConfig = STATUS_CONFIG[task.status];
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 rounded-lg border border-border/40 bg-foreground/[0.01] px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] tracking-wide text-muted-foreground/70">
                                {task.task_key}
                              </span>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1',
                                  statusStyles.pill,
                                )}
                              >
                                {statusConfig.icon}
                                {statusConfig.label}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[13px] text-foreground">{task.title}</p>
                          </div>
                          <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground/65">
                            {timeAgo(task.updated_at)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CLI activity */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground/85">
                  <Activity className="h-3.5 w-3.5" />
                  CLI check & update activity
                </h3>
                {loading && cliLogs.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground/65">Loading…</p>
                ) : cliLogs.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground/65">
                    No CLI checks recorded yet. Periodic and manual checks will appear here.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {cliLogs.map((log) => {
                      const { title, detail } = describeCliLog(log);
                      const Icon = CLI_LOG_ICON[log.event];
                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 rounded-lg border border-border/40 bg-foreground/[0.01] px-3 py-2"
                        >
                          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium text-foreground">{title}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground/75 break-words">{detail}</p>
                          </div>
                          <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground/65">
                            {timeAgo(log.created_at)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </AppDialogBody>
      </AppDialogContent>
    </Dialog>
  );
}
