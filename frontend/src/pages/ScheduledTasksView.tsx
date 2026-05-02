import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types';
import { fetchTasks, updateTask } from '../api/client';
import { STATUS_CONFIG } from '@/lib/taskConstants';
import { getTaskStatusStyles, getToneStyles } from '@/lib/semanticColors';
import { cn } from '@/lib/utils';
import { CalendarDays, CalendarRange, Layers, ChevronDown, Check } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { Skeleton } from '@/components/ui/skeleton';
import { getTodayDateString, getWeekRange } from '@/lib/dateFilter';

type ViewMode = 'today' | 'week' | 'all';

function TodoRow({
  task,
  onCheck,
  checked = false,
}: {
  task: Task;
  onCheck?: () => void;
  checked?: boolean;
}) {
  const showStatus = task.status === 'in_progress' || task.status === 'failed';
  const statusStyles = getTaskStatusStyles(task.status);
  const [optimistic, setOptimistic] = useState(false);

  const handleClick = () => {
    if (checked || !onCheck) return;
    setOptimistic(true);
    onCheck();
  };

  const isChecked = checked || optimistic;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-100',
        'hover:bg-foreground/[0.03] group',
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={isChecked}
        aria-label={isChecked ? 'Completed' : 'Mark as complete'}
        className={cn(
          'shrink-0 h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-150',
          isChecked
            ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'border-border/60 hover:border-primary/50 hover:bg-primary/[0.06] cursor-pointer',
        )}
      >
        {isChecked && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
      </button>

      <span
        className={cn(
          'flex-1 min-w-0 text-[13px] font-medium leading-snug',
          isChecked ? 'line-through text-muted-foreground/50' : 'text-foreground',
        )}
      >
        {task.title}
      </span>

      {showStatus && !isChecked && (
        <span
          className={cn(
            'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
            statusStyles.pill,
          )}
        >
          {STATUS_CONFIG[task.status].icon}
          {STATUS_CONFIG[task.status].label}
        </span>
      )}

      {task.scheduled_at && !isChecked && (
        <span className="shrink-0 text-[11px] text-muted-foreground/60">
          {formatScheduleDate(task.scheduled_at)}
        </span>
      )}

      <span className="shrink-0 text-[11px] font-mono text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors">
        {task.task_key}
      </span>
    </div>
  );
}

function formatScheduleDate(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getLocalDateString(scheduledAt: string): string {
  if (scheduledAt.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(scheduledAt)) {
    const d = new Date(scheduledAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return scheduledAt.slice(0, 10);
}

const VIEW_CONFIG: Record<ViewMode, { title: string; subtitle: string; icon: typeof CalendarDays }> = {
  today: { title: 'Today', subtitle: 'Tasks scheduled for today', icon: CalendarDays },
  week: { title: 'This Week', subtitle: 'Tasks scheduled this week', icon: CalendarRange },
  all: { title: 'All Tasks', subtitle: 'All tasks across all lists', icon: Layers },
};

export default function ScheduledTasksView({ mode }: { mode: ViewMode }) {
  const config = VIEW_CONFIG[mode];
  const neutralTone = getToneStyles('neutral');
  const successTone = getToneStyles('success');
  const warningTone = getToneStyles('warning');
  const dangerTone = getToneStyles('danger');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);

  const filterTasks = useCallback((all: Task[]): Task[] => {
    const nonCancelled = all.filter((t) => t.status !== 'cancelled');

    if (mode === 'all') return nonCancelled;

    if (mode === 'today') {
      const today = getTodayDateString();
      return nonCancelled.filter((t) => {
        if (!t.scheduled_at) return false;
        return getLocalDateString(t.scheduled_at) === today;
      });
    }

    // week
    const { start, end } = getWeekRange();
    return nonCancelled.filter((t) => {
      if (!t.scheduled_at) return false;
      const taskDate = getLocalDateString(t.scheduled_at);
      return taskDate >= start && taskDate <= end;
    });
  }, [mode]);

  const loadData = useCallback(async () => {
    try {
      const all = await fetchTasks();
      setTasks(filterTasks(all));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filterTasks]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const iv = setInterval(loadData, 10_000);
    return () => clearInterval(iv);
  }, [loadData]);

  const handleCheck = async (task: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'done' } : t)));
    try {
      await updateTask(task.id, { status: 'done' });
    } catch {
      loadData();
    }
  };

  const uncompleted = tasks.filter((t) => t.status !== 'done');
  const completed = tasks.filter((t) => t.status === 'done');

  const inProgressCount = uncompleted.filter((t) => t.status === 'in_progress').length;
  const failedCount = uncompleted.filter((t) => t.status === 'failed').length;

  if (loading) {
    return (
      <div className="p-6 space-y-5 motion-section" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 min-h-screen">
      <div
        className="motion-section mb-6 flex shrink-0 flex-wrap items-start justify-between gap-3"
        style={{ '--motion-delay': '80ms' } as React.CSSProperties}
      >
        <div>
          <PageTitle icon={config.icon} title={config.title} />
          <p className="mt-1.5 text-[12px] text-muted-foreground/85">{config.subtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', neutralTone.pill)}>
              {uncompleted.length} active
            </span>
            {inProgressCount > 0 && (
              <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', warningTone.pill)}>
                {inProgressCount} in progress
              </span>
            )}
            {failedCount > 0 && (
              <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', dangerTone.pill)}>
                {failedCount} failed
              </span>
            )}
            {completed.length > 0 && (
              <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', successTone.pill)}>
                {completed.length} completed
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className={cn('mb-4 rounded-md px-3 py-2 text-[13px] ring-1', dangerTone.panel, dangerTone.text)}>
          {error}
        </div>
      )}

      <div
        className="motion-section space-y-6"
        style={{ '--motion-delay': '140ms' } as React.CSSProperties}
      >
        <section>
          <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/70">
            Uncompleted
            <span className="ml-2 rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80">
              {uncompleted.length}
            </span>
          </h2>
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {uncompleted.length === 0 ? (
              <div className="px-3 py-8 text-center text-[13px] text-muted-foreground/60">
                {mode === 'today' ? 'No tasks scheduled for today' : mode === 'week' ? 'No tasks scheduled this week' : 'No tasks'}
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {uncompleted.map((task) => (
                  <TodoRow key={task.id} task={task} onCheck={() => handleCheck(task)} />
                ))}
              </div>
            )}
          </div>
        </section>

        {completed.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setCompletedOpen((v) => !v)}
              className="interactive-lift mb-2 flex w-full items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200 ease-[var(--ease-out-quart)]',
                  completedOpen ? 'rotate-0' : '-rotate-90',
                )}
              />
              Completed
              <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80">
                {completed.length}
              </span>
            </button>

            <div
              className={cn(
                'grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-quart)]',
                completedOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
                  <div className="divide-y divide-border/30">
                    {completed.map((task) => (
                      <TodoRow key={task.id} task={task} checked />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
