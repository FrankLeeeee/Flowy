import { useState, useEffect, useCallback } from 'react';
import { Label, Task } from '../types';
import { fetchLabels, fetchTasks, updateTask } from '../api/client';
import { STATUS_CONFIG, PRIORITY_ICON } from '@/lib/taskConstants';
import { getLabelColorStyles, getTaskStatusStyles, getTaskPriorityStyles, getToneStyles } from '@/lib/semanticColors';
import { cn } from '@/lib/utils';
import { ListTodo, ChevronDown, Check, Circle } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { Skeleton } from '@/components/ui/skeleton';
import { getDesktopPageContainerClassName } from '@/lib/pageLayout';

function TodoRow({
  task,
  onCheck,
  allLabels,
  checked = false,
}: {
  task: Task;
  onCheck?: () => void;
  allLabels: Label[];
  checked?: boolean;
}) {
  const statusStyles = getTaskStatusStyles(task.status);
  const showPriority = !checked && (task.priority === 'urgent' || task.priority === 'high');
  const priorityStyles = getTaskPriorityStyles(task.priority);
  const labels: string[] = JSON.parse(task.labels || '[]');
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
        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-150 group',
        isChecked
          ? 'border-border/25 bg-card/40 hover:bg-card/60'
          : 'border-border/45 bg-card shadow-soft hover:border-border/75 hover:shadow-elevated motion-safe:hover:-translate-y-px',
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={isChecked}
        aria-label={isChecked ? 'Completed' : 'Mark as complete'}
        className={cn(
          'shrink-0 h-[18px] w-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all duration-150',
          isChecked
            ? 'border-emerald-500/60 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
            : 'border-foreground/20 hover:border-primary/50 hover:bg-primary/[0.06] cursor-pointer',
        )}
      >
        {isChecked && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
      </button>

      {showPriority && (
        <span className={cn('shrink-0 [&>svg]:h-3 [&>svg]:w-3', priorityStyles.icon)}>
          {PRIORITY_ICON[task.priority]}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        <span
          className={cn(
            'min-w-0 text-[13px] font-medium leading-snug truncate',
            isChecked ? 'line-through text-muted-foreground/40' : 'text-foreground',
          )}
        >
          {task.title}
        </span>

        {labels.length > 0 && (
          <div className={cn('flex min-w-0 flex-wrap items-center gap-1', isChecked && 'opacity-50')}>
            {labels.map((label) => {
              const colorStyles = getLabelColorStyles(label, allLabels);
              return (
                <span key={label} className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1', colorStyles.pill)}>
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <span
        className={cn(
          'hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 md:inline-flex',
          statusStyles.pill,
        )}
      >
        {STATUS_CONFIG[task.status].icon}
        {STATUS_CONFIG[task.status].label}
      </span>

      <span className="shrink-0 text-[11px] font-mono text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors">
        {task.task_key}
      </span>
    </div>
  );
}

export default function TodoView() {
  const neutralTone = getToneStyles('neutral');
  const successTone = getToneStyles('success');
  const warningTone = getToneStyles('warning');
  const dangerTone = getToneStyles('danger');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [all, labels] = await Promise.all([fetchTasks(), fetchLabels()]);
      setTasks(all.filter((t) => t.status !== 'cancelled'));
      setAllLabels(labels);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

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
    <div className={getDesktopPageContainerClassName()}>
      {/* Header */}
      <div
        className="motion-section mb-6 flex shrink-0 flex-wrap items-start justify-between gap-3"
        style={{ '--motion-delay': '80ms' } as React.CSSProperties}
      >
        <div>
          <PageTitle icon={ListTodo} title="Todo" />
          <p className="mt-1.5 text-[12px] text-muted-foreground/85">Tasks across all lists</p>
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
        className="motion-section space-y-4"
        style={{ '--motion-delay': '140ms' } as React.CSSProperties}
      >
        <section>
          <div className="mb-1.5 flex items-center justify-between px-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60">
              Open
            </h2>
            <span className="text-[11px] tabular-nums font-medium text-muted-foreground/45">
              {uncompleted.length}
            </span>
          </div>
          {uncompleted.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/45 px-3 py-10 gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/8">
                <Circle className="h-4 w-4 text-emerald-500/50" />
              </div>
              <p className="text-[13px] text-muted-foreground/50">No open tasks</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {uncompleted.map((task) => (
                <TodoRow key={task.id} task={task} allLabels={allLabels} onCheck={() => handleCheck(task)} />
              ))}
            </div>
          )}
        </section>

        {completed.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setCompletedOpen((v) => !v)}
              className="mb-1.5 flex w-full items-center justify-between px-3 transition-colors duration-100 hover:text-muted-foreground"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/50">
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-200 ease-[var(--ease-out-quart)]',
                    completedOpen ? 'rotate-0' : '-rotate-90',
                  )}
                />
                Completed
              </span>
              <span className="text-[11px] tabular-nums font-medium text-muted-foreground/35">
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
                <div className="space-y-1">
                  {completed.map((task) => (
                    <TodoRow key={task.id} task={task} allLabels={allLabels} checked />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
