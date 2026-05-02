import { useState } from 'react';
import { Task, TaskStatus } from '@/types';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG } from '@/lib/taskConstants';
import { getTaskStatusStyles } from '@/lib/semanticColors';

function TodoRow({
  task,
  onCheck,
  onRowClick,
  checked = false,
}: {
  task: Task;
  onCheck?: () => void;
  onRowClick?: () => void;
  checked?: boolean;
}) {
  const showStatus = task.status === 'in_progress' || task.status === 'failed';
  const statusStyles = getTaskStatusStyles(task.status);
  const [optimistic, setOptimistic] = useState(false);

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (checked || optimistic || !onCheck) return;
    setOptimistic(true);
    onCheck();
  };

  const isChecked = checked || optimistic;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 transition-colors duration-100 hover:bg-foreground/[0.03] group cursor-pointer"
      onClick={onRowClick}
    >
      <button
        type="button"
        onClick={handleCheck}
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

      <span className="shrink-0 text-[11px] font-mono text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors">
        {task.task_key}
      </span>
    </div>
  );
}

interface TaskTodoViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

export default function TaskTodoView({ tasks, onTaskClick, onStatusChange }: TaskTodoViewProps) {
  const [completedOpen, setCompletedOpen] = useState(false);

  const uncompleted = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const completed = tasks.filter((t) => t.status === 'done');

  return (
    <div className="space-y-6">
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
              All tasks completed
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {uncompleted.map((task) => (
                <TodoRow
                  key={task.id}
                  task={task}
                  onCheck={() => onStatusChange(task.id, 'done')}
                  onRowClick={() => onTaskClick(task)}
                />
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
                    <TodoRow
                      key={task.id}
                      task={task}
                      checked
                      onRowClick={() => onTaskClick(task)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
