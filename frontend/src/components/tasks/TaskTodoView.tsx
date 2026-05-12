import { memo, useState, useMemo } from 'react';
import { Label, Runner, Task, TaskStatus } from '@/types';
import { ChevronDown, Check, Circle, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, PRIORITY_ICON, PRIORITY_LABEL } from '@/lib/taskConstants';
import { getAiHarnessPillStyle, getLabelColorStyles, getTaskStatusStyles, getTaskPriorityStyles } from '@/lib/semanticColors';
import { useAnimatedList } from '@/hooks/useAnimatedList';
import AnimatedListItem from '@/components/AnimatedListItem';

const TodoRow = memo(function TodoRow({
  task,
  onCheck,
  onUncheck,
  onRowClick,
  allLabels,
  runner,
  checked = false,
}: {
  task: Task;
  onCheck?: () => void;
  onUncheck?: () => void;
  onRowClick?: () => void;
  allLabels: Label[];
  runner?: Runner;
  checked?: boolean;
}) {
  const statusStyles = getTaskStatusStyles(task.status);
  const priorityStyles = getTaskPriorityStyles(task.priority);
  const showPriority = !checked && task.priority !== 'none';
  const labels: string[] = useMemo(() => JSON.parse(task.labels || '[]'), [task.labels]);
  const [optimistic, setOptimistic] = useState(false);
  const [optimisticUncheck, setOptimisticUncheck] = useState(false);

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (checked) {
      if (optimisticUncheck || !onUncheck) return;
      setOptimisticUncheck(true);
      onUncheck();
      return;
    }
    if (optimistic || !onCheck) return;
    setOptimistic(true);
    onCheck();
  };

  const isChecked = (checked && !optimisticUncheck) || optimistic;
  const isRecurring = !!task.recurrence_rule;
  const hasMetadata = true;

  return (
    <div
      className={cn(
        'flex w-full min-w-0 items-start gap-2.5 overflow-hidden px-3 py-2.5 rounded-lg border transition-all duration-150 group cursor-pointer',
        isChecked
          ? 'border-border/25 bg-card/40 hover:bg-card/60'
          : 'border-border/45 bg-card shadow-soft hover:border-border/75 hover:shadow-elevated motion-safe:hover:-translate-y-px',
      )}
      onClick={onRowClick}
    >
      <button
        type="button"
        onClick={handleCheck}
        aria-label={isChecked ? 'Mark as backlog' : 'Mark as complete'}
        className={cn(
          'shrink-0 mt-0.5 h-[18px] w-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all duration-150 cursor-pointer',
          isChecked
            ? 'border-emerald-500/60 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/6'
            : 'border-foreground/20 hover:border-primary/50 hover:bg-primary/[0.06]',
        )}
      >
        {isChecked && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 text-[13px] font-medium leading-snug truncate',
              isChecked ? 'line-through text-muted-foreground/40' : 'text-foreground',
            )}
          >
            {task.title}
          </span>
        </div>

        {hasMetadata && (
          <div className={cn('flex min-w-0 flex-wrap items-center gap-1', isChecked && 'opacity-50')}>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1', statusStyles.pill)}>
              {STATUS_CONFIG[task.status].icon}
              {STATUS_CONFIG[task.status].label}
            </span>
            {showPriority && (
              <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 [&>svg]:h-2.5 [&>svg]:w-2.5', priorityStyles.pill)}>
                {PRIORITY_ICON[task.priority]}
                {PRIORITY_LABEL[task.priority]}
              </span>
            )}
            {labels.map((label) => {
              const colorStyles = getLabelColorStyles(label, allLabels);
              return (
                <span key={label} className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1', colorStyles.pill)}>
                  {label}
                </span>
              );
            })}
            {runner && (
              <span className="inline-flex items-center rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-foreground/8">
                {runner.name}
              </span>
            )}
            {task.ai_provider && (
              <span
                className="ai-harness-pill inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={getAiHarnessPillStyle(task.ai_provider)}
              >
                {task.ai_provider}
              </span>
            )}
            {isRecurring && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/15">
                <Repeat className="h-2.5 w-2.5" />
                Recurring
              </span>
            )}
          </div>
        )}
      </div>

      <span className="hidden shrink-0 text-[11px] font-mono text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors md:inline">
        {task.task_key}
      </span>
    </div>
  );
});

interface TaskTodoViewProps {
  tasks: Task[];
  allLabels?: Label[];
  runners?: Runner[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

export default function TaskTodoView({ tasks, allLabels = [], runners = [], onTaskClick, onStatusChange }: TaskTodoViewProps) {
  const runnerMap = new Map(runners.map((r) => [r.id, r]));
  const [completedOpen, setCompletedOpen] = useState(false);

  const uncompleted = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const completed = tasks.filter((t) => t.status === 'done');
  const uncompletedAnimated = useAnimatedList(uncompleted);
  const completedAnimated = useAnimatedList(completed);

  return (
    <div className="space-y-4">
      <section>
        <div className="mb-1.5 flex items-center justify-between px-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60">
            Open
          </h2>
          <span className="text-[11px] tabular-nums font-medium text-muted-foreground/45">
            {uncompleted.length}
          </span>
        </div>
        {uncompletedAnimated.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/45 px-3 py-10 gap-2 motion-section">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/8">
              <Circle className="h-4 w-4 text-emerald-500/50" />
            </div>
            <p className="text-[13px] text-muted-foreground/50">No open tasks</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {uncompletedAnimated.map(({ item: task, leaving }) => (
              <AnimatedListItem key={task.id} leaving={leaving} gapClassName="pb-1.5 last:pb-0">
                <TodoRow
                  task={task}
                  allLabels={allLabels}
                  runner={task.runner_id ? runnerMap.get(task.runner_id) : undefined}
                  onCheck={() => onStatusChange(task.id, 'done')}
                  onRowClick={() => onTaskClick(task)}
                  checked={leaving}
                />
              </AnimatedListItem>
            ))}
          </div>
        )}
      </section>

      {completedAnimated.length > 0 && (
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
              <div className="flex flex-col">
                {completedAnimated.map(({ item: task, leaving }) => (
                  <AnimatedListItem key={task.id} leaving={leaving} gapClassName="pb-1 last:pb-0">
                    <TodoRow
                      task={task}
                      allLabels={allLabels}
                      runner={task.runner_id ? runnerMap.get(task.runner_id) : undefined}
                      checked
                      onUncheck={() => onStatusChange(task.id, 'backlog')}
                      onRowClick={() => onTaskClick(task)}
                    />
                  </AnimatedListItem>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
