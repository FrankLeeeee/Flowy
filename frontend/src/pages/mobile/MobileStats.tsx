import { useState, useEffect, useCallback } from 'react';
import { fetchStats } from '../../api/client';
import { Stats } from '../../types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AI_LABELS, STATUS_CONFIG } from '@/lib/taskConstants';
import {
  getToneStyles, getTaskStatusStyles, getAiProviderStyles,
  getRunnerStatusStyles, LABEL_COLORS,
} from '@/lib/semanticColors';
import { AiProvider, LabelColor, RunnerStatus, TaskStatus } from '../../types';
import { CheckCircle2, TrendingUp, Clock, AlertTriangle, Target, Activity, Bot, Zap, BarChart2 } from 'lucide-react';

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low', none: 'None',
};

function StatPill({ label, value, tone }: { label: string; value: string | number; tone?: 'success' | 'danger' | 'warning' | 'brand' | 'neutral' }) {
  const styles = getToneStyles(tone ?? 'neutral');
  return (
    <div className={cn('flex flex-col items-center rounded-xl px-3 py-3 ring-1 flex-1', styles.panel)}>
      <span className={cn('text-[22px] font-bold tracking-tight leading-none', styles.emphasis)}>{value}</span>
      <span className={cn('mt-1 text-[10px] font-medium text-center leading-tight', styles.text)}>{label}</span>
    </div>
  );
}

function MiniBar({ label, count, max, dotClass }: { label: string; count: number; max: number; dotClass?: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      {dotClass && <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClass)} />}
      <span className="min-w-[90px] shrink-0 truncate text-[12px] text-muted-foreground/85">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground/80">{count}</span>
    </div>
  );
}

function ActivityChart({ days }: { days: Array<{ date: string; count: number }> }) {
  const max = Math.max(...days.map((d) => d.count), 1);
  const grid: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const found = days.find((r) => r.date === dateStr);
    grid.push({ date: dateStr, count: found?.count ?? 0 });
  }
  return (
    <div className="flex items-end gap-0.5 h-12">
      {grid.map(({ date, count }) => {
        const heightPct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 10 : 5) : 5;
        return (
          <div key={date} className="flex-1" style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <div
              className={cn('w-full rounded-[2px]', count > 0 ? 'bg-primary' : 'bg-foreground/[0.06]')}
              style={{ height: `${heightPct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function MobileStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setStats(await fetchStats());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-16" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 flex-1 rounded-xl" />)}
        </div>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
      </div>
    );
  }

  if (error) {
    const dangerStyles = getToneStyles('danger');
    return (
      <div className="p-4">
        <div className={cn('rounded-xl px-4 py-3 text-[13px] ring-1', dangerStyles.panel, dangerStyles.text)}>{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const { totals, runnerCounts, tasksByStatus, tasksByProject, tasksByProvider, tasksByPriority, tasksByRunner, avgCompletionMinutes, dailyCompleted, topLabels } = stats;

  const successRate = (totals.done + totals.failed) > 0
    ? Math.round((totals.done / (totals.done + totals.failed)) * 100)
    : null;

  const avgTimeLabel = avgCompletionMinutes == null
    ? '—'
    : avgCompletionMinutes < 60
      ? `${Math.round(avgCompletionMinutes)}m`
      : `${Math.round(avgCompletionMinutes / 60 * 10) / 10}h`;

  const maxStatusCount = Math.max(...tasksByStatus.map((s) => s.count), 1);
  const maxProjectCount = Math.max(...tasksByProject.map((p) => p.total), 1);
  const maxProviderCount = Math.max(...tasksByProvider.map((p) => p.count), 1);
  const maxPriorityCount = Math.max(...tasksByPriority.map((p) => p.count), 1);
  const maxRunnerCount = Math.max(...tasksByRunner.map((r) => r.count), 1);
  const maxLabelCount = Math.max(...topLabels.map((l) => l.count), 1);

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-lg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <h1 className="text-[18px] font-bold tracking-tight text-foreground">Stats</h1>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">Productivity overview</p>
      </div>

      <div className="p-4 space-y-4 pb-6">

        {/* Summary pills row 1 */}
        <div className="flex gap-2">
          <StatPill label="Total Tasks" value={totals.total} tone="neutral" />
          <StatPill label="Completed" value={totals.done} tone="success" />
          <StatPill
            label="Success Rate"
            value={successRate != null ? `${successRate}%` : '—'}
            tone={successRate == null ? 'neutral' : successRate >= 80 ? 'success' : successRate >= 50 ? 'warning' : 'danger'}
          />
        </div>

        {/* Summary pills row 2 */}
        <div className="flex gap-2">
          <StatPill label="Avg. Time" value={avgTimeLabel} tone="brand" />
          <StatPill label="Active Runners" value={runnerCounts.online + runnerCounts.busy} tone="success" />
          <StatPill label="Failed" value={totals.failed} tone={totals.failed > 0 ? 'danger' : 'neutral'} />
        </div>

        {/* Activity chart */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Activity className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[13px] font-semibold text-foreground">Daily Completions (30d)</span>
          </div>
          {dailyCompleted.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/60 py-4 text-center">No completed tasks yet.</p>
          ) : (
            <>
              <ActivityChart days={dailyCompleted} />
              <p className="mt-2 text-[10px] text-muted-foreground/50 text-right">
                {dailyCompleted.reduce((s, d) => s + d.count, 0)} total
              </p>
            </>
          )}
        </div>

        {/* Task status */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <BarChart2 className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[13px] font-semibold text-foreground">Tasks by Status</span>
          </div>
          <div className="space-y-2.5">
            {tasksByStatus.length === 0 ? (
              <p className="text-[12px] text-muted-foreground/60">No tasks yet.</p>
            ) : tasksByStatus.map(({ status, count }) => {
              const cfg = STATUS_CONFIG[status as TaskStatus];
              const styles = getTaskStatusStyles(status as TaskStatus);
              return (
                <MiniBar
                  key={status}
                  label={cfg?.label ?? status}
                  count={count}
                  max={maxStatusCount}
                  dotClass={styles.dot}
                />
              );
            })}
          </div>
        </div>

        {/* Tasks by project */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <BarChart2 className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[13px] font-semibold text-foreground">Tasks by Project</span>
          </div>
          <div className="space-y-3">
            {tasksByProject.length === 0 ? (
              <p className="text-[12px] text-muted-foreground/60">No projects yet.</p>
            ) : tasksByProject.map(({ project_name, total, done }) => (
              <div key={project_name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground/85 truncate max-w-[160px]">{project_name}</span>
                  <span className="text-[10px] text-muted-foreground/60">{done}/{total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
                  <div className="flex h-full rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${maxProjectCount > 0 ? (done / maxProjectCount) * 100 : 0}%` }} />
                    <div className="h-full bg-primary/30" style={{ width: `${maxProjectCount > 0 ? ((total - done) / maxProjectCount) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {tasksByProject.length > 0 && (
            <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground/60">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Done</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary/30 inline-block" /> Remaining</span>
            </div>
          )}
        </div>

        {/* AI Provider preference */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Zap className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[13px] font-semibold text-foreground">AI Provider Preference</span>
          </div>
          {tasksByProvider.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/60">No tasks assigned to a provider yet.</p>
          ) : (
            <div className="space-y-2.5">
              {tasksByProvider.map(({ ai_provider, count }) => {
                const styles = getAiProviderStyles(ai_provider as AiProvider);
                const label = AI_LABELS[ai_provider as AiProvider] ?? ai_provider;
                return (
                  <MiniBar key={ai_provider} label={label} count={count} max={maxProviderCount} dotClass={styles.dot} />
                );
              })}
            </div>
          )}
        </div>

        {/* Priority distribution */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[13px] font-semibold text-foreground">Priority Distribution</span>
          </div>
          {tasksByPriority.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/60">No tasks yet.</p>
          ) : (
            <div className="space-y-2.5">
              {tasksByPriority.map(({ priority, count }) => (
                <MiniBar
                  key={priority}
                  label={PRIORITY_LABELS[priority] ?? priority}
                  count={count}
                  max={maxPriorityCount}
                />
              ))}
            </div>
          )}
        </div>

        {/* Runner usage */}
        {tasksByRunner.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Bot className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-[13px] font-semibold text-foreground">Tasks per Runner</span>
            </div>
            <div className="space-y-2.5">
              {tasksByRunner.map(({ runner_name, count, runner_status }) => {
                const statusStyles = getRunnerStatusStyles(runner_status as RunnerStatus);
                return (
                  <MiniBar
                    key={runner_name}
                    label={runner_name}
                    count={count}
                    max={maxRunnerCount}
                    dotClass={statusStyles.dot}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Top labels */}
        {topLabels.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Target className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-[13px] font-semibold text-foreground">Most Used Labels</span>
            </div>
            <div className="space-y-2.5">
              {topLabels.map(({ name, color, count }) => {
                const colorStyles = LABEL_COLORS[color as LabelColor] ?? LABEL_COLORS['gray'];
                return (
                  <MiniBar
                    key={name}
                    label={name}
                    count={count}
                    max={maxLabelCount}
                    dotClass={colorStyles.dot}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Runner health summary */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Bot className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[13px] font-semibold text-foreground">Runner Fleet</span>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Online', value: runnerCounts.online, tone: 'success' as const },
              { label: 'Busy', value: runnerCounts.busy, tone: 'warning' as const },
              { label: 'Offline', value: runnerCounts.offline, tone: 'neutral' as const },
            ].map(({ label, value, tone }) => {
              const s = getToneStyles(tone);
              return (
                <div key={label} className={cn('flex flex-col items-center rounded-xl px-3 py-2.5 ring-1 flex-1', s.panel)}>
                  <span className={cn('text-[18px] font-bold leading-none', s.emphasis)}>{value}</span>
                  <span className={cn('mt-0.5 text-[10px] font-medium', s.text)}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
