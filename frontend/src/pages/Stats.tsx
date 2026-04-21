import { useState, useEffect, useCallback } from 'react';
import { fetchStats } from '../api/client';
import { Stats } from '../types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AI_LABELS, STATUS_CONFIG } from '@/lib/taskConstants';
import { getToneStyles, getTaskStatusStyles, getAiProviderStyles, getRunnerStatusStyles, LABEL_COLORS } from '@/lib/semanticColors';
import { AiProvider, LabelColor, RunnerStatus, TaskStatus } from '../types';
import {
  BarChart2, CheckCircle2, Zap, Bot, TrendingUp,
  Clock, AlertTriangle, Target, Activity,
} from 'lucide-react';

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low', none: 'None',
};

function SummaryCard({
  label, value, sub, tone, icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'success' | 'danger' | 'warning' | 'brand' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
}) {
  const styles = getToneStyles(tone ?? 'neutral');
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted-foreground/80">{label}</span>
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', styles.panel)}>
          <Icon className={cn('h-3.5 w-3.5', styles.icon)} />
        </span>
      </div>
      <div>
        <p className="text-[28px] font-bold tracking-[-0.03em] text-foreground leading-none">{value}</p>
        {sub && <p className="mt-1 text-[11px] text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  );
}

function HorizontalBar({
  label, count, max, tone, suffix,
}: {
  label: string;
  count: number;
  max: number;
  tone?: 'success' | 'danger' | 'warning' | 'brand' | 'neutral';
  suffix?: string;
}) {
  const styles = getToneStyles(tone ?? 'neutral');
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-[110px] shrink-0 truncate text-[12px] text-muted-foreground/85">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-foreground/[0.05] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', styles.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[12px] font-semibold tabular-nums text-foreground/80">
        {count}{suffix}
      </span>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 text-muted-foreground/60" />
      <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
    </div>
  );
}

function ActivityChart({ days }: { days: Array<{ date: string; count: number }> }) {
  const max = Math.max(...days.map((d) => d.count), 1);

  // Build a full 30-day grid (most recent on the right)
  const grid: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const found = days.find((r) => r.date === dateStr);
    grid.push({ date: dateStr, count: found?.count ?? 0 });
  }

  return (
    <div className="flex items-end gap-1 h-16">
      {grid.map(({ date, count }) => {
        const heightPct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 8 : 4) : 4;
        return (
          <div
            key={date}
            className="flex-1 relative group"
            style={{ height: '100%' }}
          >
            <div
              className={cn(
                'absolute bottom-0 w-full rounded-sm transition-all duration-300',
                count > 0 ? 'bg-primary' : 'bg-foreground/[0.06]',
              )}
              style={{ height: `${heightPct}%` }}
            />
            {count > 0 && (
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap rounded bg-foreground/90 px-1.5 py-0.5 text-[10px] text-background">
                {date}: {count}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
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
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="space-y-1">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className={cn('rounded-xl px-4 py-3 text-[13px] ring-1', getToneStyles('danger').panel, getToneStyles('danger').text)}>
          {error}
        </div>
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
  const maxPriorityCount = Math.max(...tasksByPriority.map((p) => p.count), 1);
  const maxRunnerCount = Math.max(...tasksByRunner.map((r) => r.count), 1);
  const maxProviderCount = Math.max(...tasksByProvider.map((p) => p.count), 1);
  const maxLabelCount = Math.max(...topLabels.map((l) => l.count), 1);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.025em] text-foreground">Stats</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground/75">Your productivity overview across all projects and runners.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Total Tasks"
          value={totals.total}
          sub={`${totals.in_progress} in progress`}
          tone="neutral"
          icon={Target}
        />
        <SummaryCard
          label="Completed"
          value={totals.done}
          sub={`${totals.cancelled} cancelled`}
          tone="success"
          icon={CheckCircle2}
        />
        <SummaryCard
          label="Success Rate"
          value={successRate != null ? `${successRate}%` : '—'}
          sub={`${totals.failed} failed`}
          tone={successRate == null ? 'neutral' : successRate >= 80 ? 'success' : successRate >= 50 ? 'warning' : 'danger'}
          icon={TrendingUp}
        />
        <SummaryCard
          label="Avg. Completion"
          value={avgTimeLabel}
          sub="per completed task"
          tone="brand"
          icon={Clock}
        />
      </div>

      {/* Runner summary */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          label="Total Runners"
          value={runnerCounts.total}
          sub={`${runnerCounts.online + runnerCounts.busy} active`}
          tone="neutral"
          icon={Bot}
        />
        <SummaryCard
          label="Online / Busy"
          value={runnerCounts.online + runnerCounts.busy}
          sub={`${runnerCounts.online} online, ${runnerCounts.busy} busy`}
          tone="success"
          icon={Zap}
        />
        <SummaryCard
          label="Failed Tasks"
          value={totals.failed}
          sub={`${totals.backlog} in backlog`}
          tone={totals.failed > 0 ? 'danger' : 'neutral'}
          icon={AlertTriangle}
        />
      </div>

      {/* Activity chart */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <SectionHeader title="Daily Completed Tasks (Last 30 Days)" icon={Activity} />
        {dailyCompleted.length === 0 ? (
          <p className="text-[12px] text-muted-foreground/60 py-6 text-center">No completed tasks yet.</p>
        ) : (
          <ActivityChart days={dailyCompleted} />
        )}
        <p className="mt-3 text-[11px] text-muted-foreground/50 text-right">
          {dailyCompleted.reduce((s, d) => s + d.count, 0)} total in last 30 days
        </p>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Task status distribution */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <SectionHeader title="Tasks by Status" icon={BarChart2} />
          <div className="space-y-3">
            {tasksByStatus.length === 0 ? (
              <p className="text-[12px] text-muted-foreground/60">No tasks yet.</p>
            ) : tasksByStatus.map(({ status, count }) => {
              const cfg = STATUS_CONFIG[status as TaskStatus];
              const styles = getTaskStatusStyles(status as TaskStatus);
              return (
                <HorizontalBar
                  key={status}
                  label={cfg?.label ?? status}
                  count={count}
                  max={maxStatusCount}
                  tone={styles === getToneStyles('neutral') ? 'neutral'
                    : styles === getToneStyles('success') ? 'success'
                    : styles === getToneStyles('danger') ? 'danger'
                    : styles === getToneStyles('warning') ? 'warning'
                    : 'brand'}
                />
              );
            })}
          </div>
        </div>

        {/* Tasks by project */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <SectionHeader title="Tasks by Project" icon={BarChart2} />
          <div className="space-y-3">
            {tasksByProject.length === 0 ? (
              <p className="text-[12px] text-muted-foreground/60">No projects yet.</p>
            ) : tasksByProject.map(({ project_name, total, done }) => (
              <div key={project_name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground/85 truncate max-w-[140px]">{project_name}</span>
                  <span className="text-[11px] text-muted-foreground/60">{done}/{total} done</span>
                </div>
                <div className="h-2 rounded-full bg-foreground/[0.05] overflow-hidden">
                  <div className="flex h-full rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${maxProjectCount > 0 ? (done / maxProjectCount) * 100 : 0}%` }}
                    />
                    <div
                      className="h-full bg-primary/30 transition-all duration-500"
                      style={{ width: `${maxProjectCount > 0 ? ((total - done) / maxProjectCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {tasksByProject.length > 0 && (
            <div className="mt-4 flex items-center gap-3 text-[11px] text-muted-foreground/60">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Done</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary/30 inline-block" /> Remaining</span>
            </div>
          )}
        </div>

        {/* AI provider preference */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <SectionHeader title="AI Provider Preference" icon={Zap} />
          {tasksByProvider.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/60">No tasks assigned to an AI provider yet.</p>
          ) : (
            <div className="space-y-3">
              {tasksByProvider.map(({ ai_provider, count }) => {
                const styles = getAiProviderStyles(ai_provider as AiProvider);
                const label = AI_LABELS[ai_provider as AiProvider] ?? ai_provider;
                return (
                  <HorizontalBar
                    key={ai_provider}
                    label={label}
                    count={count}
                    max={maxProviderCount}
                    tone={styles === getToneStyles('warning') ? 'warning'
                      : styles === getToneStyles('brand') ? 'brand'
                      : 'neutral'}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Priority distribution */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <SectionHeader title="Priority Distribution" icon={AlertTriangle} />
          {tasksByPriority.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/60">No tasks yet.</p>
          ) : (
            <div className="space-y-3">
              {tasksByPriority.map(({ priority, count }) => (
                <HorizontalBar
                  key={priority}
                  label={PRIORITY_LABELS[priority] ?? priority}
                  count={count}
                  max={maxPriorityCount}
                  tone={priority === 'urgent' ? 'danger' : priority === 'high' ? 'warning' : priority === 'medium' ? 'warning' : 'neutral'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Runner usage */}
        {tasksByRunner.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <SectionHeader title="Tasks per Runner" icon={Bot} />
            <div className="space-y-3">
              {tasksByRunner.map(({ runner_name, count, runner_status }) => {
                const statusStyles = getRunnerStatusStyles(runner_status as RunnerStatus);
                return (
                  <div key={runner_name} className="flex items-center gap-3">
                    <div className="w-[110px] shrink-0 flex items-center gap-1.5 min-w-0">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', statusStyles.dot)} />
                      <span className="truncate text-[12px] text-muted-foreground/85">{runner_name}</span>
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-foreground/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${maxRunnerCount > 0 ? (count / maxRunnerCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[12px] font-semibold tabular-nums text-foreground/80">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top labels */}
        {topLabels.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <SectionHeader title="Most Used Labels" icon={Target} />
            <div className="space-y-3">
              {topLabels.map(({ name, color, count }) => {
                const colorStyles = LABEL_COLORS[color as LabelColor] ?? LABEL_COLORS['gray'];
                return (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-[110px] shrink-0 flex items-center gap-1.5 min-w-0">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', colorStyles.dot)} />
                      <span className="truncate text-[12px] text-muted-foreground/85">{name}</span>
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-foreground/[0.05] overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', colorStyles.dot)}
                        style={{ width: `${maxLabelCount > 0 ? (count / maxLabelCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[12px] font-semibold tabular-nums text-foreground/80">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
