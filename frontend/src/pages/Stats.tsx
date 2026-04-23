import { useState, useEffect, useCallback } from 'react';
import { fetchStats } from '../api/client';
import { Stats } from '../types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import PageTitle from '@/components/PageTitle';
import { AI_LABELS, STATUS_CONFIG } from '@/lib/taskConstants';
import {
  AI_PROVIDER_TONES,
  LABEL_COLORS,
  RUNNER_STATUS_TONES,
  TASK_PRIORITY_TONES,
  TASK_STATUS_TONES,
  getRunnerStatusStyles,
  getToneStyles,
} from '@/lib/semanticColors';
import { AiProvider, LabelColor, RunnerStatus, TaskPriority, TaskStatus } from '../types';
import {
  BarChart2, CheckCircle2, Zap, Bot, TrendingUp,
  Clock, AlertTriangle, Target, Activity, FolderOpen, Terminal,
} from 'lucide-react';

type StatTone = 'success' | 'danger' | 'warning' | 'brand' | 'neutral';

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low', none: 'None',
};

function SummaryCard({
  label, value, sub, tone, icon: Icon, delay,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: StatTone;
  icon: React.ComponentType<{ className?: string }>;
  delay?: number;
}) {
  const styles = getToneStyles(tone ?? 'neutral');
  return (
    <div
      className="motion-card flex min-h-[112px] flex-col justify-between rounded-lg border border-border/80 bg-card p-4 shadow-soft"
      style={{ '--motion-delay': `${delay ?? 0}ms` } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted-foreground/85">{label}</span>
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-md ring-1', styles.panel)}>
          <Icon className={cn('h-3.5 w-3.5', styles.icon)} />
        </span>
      </div>
      <div>
        <p className="text-[24px] font-semibold text-foreground leading-none tabular-nums">{value}</p>
        {sub && <p className="mt-1.5 text-[11px] text-muted-foreground/75">{sub}</p>}
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
  tone?: StatTone;
  suffix?: string;
}) {
  const styles = getToneStyles(tone ?? 'neutral');
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-[110px] shrink-0 truncate text-[12px] text-muted-foreground/85">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/[0.05]">
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

function WorkloadRow({
  label,
  count,
  max,
  minutes,
  tone,
  dotClassName,
}: {
  label: string;
  count: number;
  max: number;
  minutes: number | null | undefined;
  tone?: StatTone;
  dotClassName?: string;
}) {
  const styles = getToneStyles(tone ?? 'neutral');
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {dotClassName && <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClassName)} />}
          <span className="truncate text-[12px] text-muted-foreground/85">{label}</span>
        </div>
        <div className="shrink-0 text-right text-[11px] text-muted-foreground/70">
          <span className="font-semibold tabular-nums text-foreground/80">{count}</span>
          <span className="ml-1">tasks</span>
          <span className="mx-1.5 text-foreground/25">/</span>
          <span className="font-medium tabular-nums text-foreground/75">{formatDuration(minutes)}</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-foreground/[0.05]">
        <div
          className={cn('h-full rounded-full transition-all duration-500', styles.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground/65" />
      <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
    </div>
  );
}

function StatPanel({
  title,
  icon,
  children,
  className,
  delay,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={cn('motion-card rounded-lg border border-border/80 bg-card p-5 shadow-soft', className)}
      style={{ '--motion-delay': `${delay ?? 0}ms` } as React.CSSProperties}
    >
      <SectionHeader title={title} icon={icon} />
      {children}
    </section>
  );
}

function StatsSection({
  title,
  icon: Icon,
  description,
  children,
  delay,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="motion-section space-y-4 border-t border-border/70 pt-5"
      style={{ '--motion-delay': `${delay ?? 0}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground/65" />
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/85">{title}</h2>
          </div>
          {description && (
            <p className="mt-1 text-[12px] text-muted-foreground/70">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function formatDuration(minutes: number | null | undefined) {
  const safeMinutes = Math.max(0, Math.round(minutes ?? 0));
  if (safeMinutes === 0) return '0m';
  if (safeMinutes < 60) return `${safeMinutes}m`;

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
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
      <div className="w-full space-y-6 p-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error) {
    const dangerTone = getToneStyles('danger');
    return (
      <div className="w-full p-6">
        <div className={cn('rounded-md px-3 py-2 text-[13px] ring-1', dangerTone.panel, dangerTone.text)}>
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
  const activeRunners = runnerCounts.online + runnerCounts.busy;
  const completedLast30 = dailyCompleted.reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="w-full space-y-6 p-6">
      <div
        className="motion-section flex flex-wrap items-start justify-between gap-3"
        style={{ '--motion-delay': '80ms' } as React.CSSProperties}
      >
        <div>
          <PageTitle icon={BarChart2} title="Stats" />
          <p className="mt-1.5 text-[12px] text-muted-foreground/85">
            Productivity, completion health, and runner usage across your workspace
          </p>
        </div>
      </div>

      <StatsSection
        title="Projects"
        icon={FolderOpen}
        description="Task volume, completion health, priority mix, and project distribution"
        delay={120}
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard
            label="Total Tasks"
            value={totals.total}
            sub={`${totals.in_progress} in progress`}
            tone="neutral"
            icon={Target}
            delay={150}
          />
          <SummaryCard
            label="Completed"
            value={totals.done}
            sub={`${totals.cancelled} cancelled`}
            tone="success"
            icon={CheckCircle2}
            delay={180}
          />
          <SummaryCard
            label="Success Rate"
            value={successRate != null ? `${successRate}%` : '—'}
            sub={`${totals.failed} failed`}
            tone={successRate == null ? 'neutral' : successRate >= 80 ? 'success' : successRate >= 50 ? 'warning' : 'danger'}
            icon={TrendingUp}
            delay={210}
          />
          <SummaryCard
            label="Avg. Completion"
            value={avgTimeLabel}
            sub="per completed task"
            tone="brand"
            icon={Clock}
            delay={240}
          />
        </div>

        <StatPanel title="Daily Completed Tasks (Last 30 Days)" icon={Activity} delay={270}>
          {dailyCompleted.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/60 py-6 text-center">No completed tasks yet.</p>
          ) : (
            <ActivityChart days={dailyCompleted} />
          )}
          <p className="mt-3 text-[11px] text-muted-foreground/50 text-right">
            {completedLast30} total in last 30 days
          </p>
        </StatPanel>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <StatPanel title="Tasks by Status" icon={BarChart2} delay={300}>
            <div className="space-y-3">
              {tasksByStatus.length === 0 ? (
                <p className="text-[12px] text-muted-foreground/60">No tasks yet.</p>
              ) : tasksByStatus.map(({ status, count }) => {
                const cfg = STATUS_CONFIG[status as TaskStatus];
                return (
                  <HorizontalBar
                    key={status}
                    label={cfg?.label ?? status}
                    count={count}
                    max={maxStatusCount}
                    tone={TASK_STATUS_TONES[status as TaskStatus] ?? 'neutral'}
                  />
                );
              })}
            </div>
          </StatPanel>

          <StatPanel title="Tasks by Project" icon={BarChart2} delay={330}>
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
          </StatPanel>

          <StatPanel title="Priority Distribution" icon={AlertTriangle} delay={360}>
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
                    tone={TASK_PRIORITY_TONES[priority as TaskPriority] ?? 'neutral'}
                  />
                ))}
              </div>
            )}
          </StatPanel>

          {topLabels.length > 0 && (
            <StatPanel title="Most Used Labels" icon={Target} delay={390}>
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
            </StatPanel>
          )}
        </div>
      </StatsSection>

      <StatsSection
        title="Runners"
        icon={Bot}
        description="Runner availability, handled tasks, and elapsed task time"
        delay={420}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Runners"
            value={runnerCounts.total}
            sub={`${activeRunners} active`}
            tone="neutral"
            icon={Bot}
            delay={450}
          />
          <SummaryCard
            label="Online / Busy"
            value={activeRunners}
            sub={`${runnerCounts.online} online, ${runnerCounts.busy} busy`}
            tone="success"
            icon={Zap}
            delay={480}
          />
          <SummaryCard
            label="Failed Tasks"
            value={totals.failed}
            sub={`${totals.backlog} in backlog`}
            tone={totals.failed > 0 ? 'danger' : 'neutral'}
            icon={AlertTriangle}
            delay={510}
          />
        </div>

        {tasksByRunner.length > 0 && (
          <StatPanel title="Runner Workload" icon={Bot} delay={540}>
            <div className="space-y-3">
              {tasksByRunner.map(({ runner_name, count, runner_status, total_minutes }) => {
                const statusStyles = getRunnerStatusStyles(runner_status as RunnerStatus);
                return (
                  <WorkloadRow
                    key={runner_name}
                    label={runner_name}
                    count={count}
                    max={maxRunnerCount}
                    minutes={total_minutes}
                    tone={RUNNER_STATUS_TONES[runner_status as RunnerStatus] ?? 'neutral'}
                    dotClassName={statusStyles.dot}
                  />
                );
              })}
            </div>
          </StatPanel>
        )}
      </StatsSection>

      <StatsSection
        title="CLI"
        icon={Terminal}
        description="Provider usage and elapsed task time by CLI"
        delay={570}
      >
        <StatPanel title="CLI Provider Workload" icon={Zap} delay={600}>
          {tasksByProvider.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/60">No tasks assigned to an AI provider yet.</p>
          ) : (
            <div className="space-y-3">
              {tasksByProvider.map(({ ai_provider, count, total_minutes }) => {
                const label = AI_LABELS[ai_provider as AiProvider] ?? ai_provider;
                return (
                  <WorkloadRow
                    key={ai_provider}
                    label={label}
                    count={count}
                    max={maxProviderCount}
                    minutes={total_minutes}
                    tone={AI_PROVIDER_TONES[ai_provider as AiProvider] ?? 'neutral'}
                  />
                );
              })}
            </div>
          )}
        </StatPanel>
      </StatsSection>
    </div>
  );
}
