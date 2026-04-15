import { useState } from 'react';
import { Task, Runner, Label, TaskStatus } from '../../types';
import { STATUS_CONFIG, PRIORITY_ICON, TASK_STATUSES } from '@/lib/taskConstants';
import { cn, formatElapsedTime } from '@/lib/utils';
import { getAiProviderStyles, getLabelColorStyles, getTaskPriorityStyles, getTaskStatusStyles } from '@/lib/semanticColors';
import { ChevronRight, Clock3 } from 'lucide-react';

function MobileTaskCard({
  task, runner, allLabels, onClick,
}: {
  task: Task;
  runner?: Runner;
  allLabels: Label[];
  onClick: () => void;
}) {
  const labels: string[] = JSON.parse(task.labels || '[]');
  const priorityStyles = getTaskPriorityStyles(task.priority);
  const elapsed = formatElapsedTime(task.started_at, task.completed_at);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full overflow-hidden text-left border-b border-border/40 bg-card px-4 py-3.5 active:bg-muted/50 transition-colors duration-100"
    >
      <span className={cn('absolute inset-y-3 left-0.5 w-1 rounded-full opacity-80', priorityStyles.bar)} />

      <div className="flex items-center justify-between gap-2 mb-1 pl-1.5">
        <span className="text-[11px] font-mono tracking-wide text-muted-foreground/80">{task.task_key}</span>
        <span className={cn(priorityStyles.icon)}>{PRIORITY_ICON[task.priority]}</span>
      </div>

      <p className="pl-1.5 text-[14px] font-medium text-foreground leading-snug line-clamp-2">{task.title}</p>

      {(labels.length > 0 || runner || task.ai_provider || elapsed) && (
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap pl-1.5">
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
            <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1', getAiProviderStyles(task.ai_provider).pill)}>
              {task.ai_provider}
            </span>
          )}
          {elapsed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/80">
              <Clock3 className="h-3 w-3" />
              {elapsed}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function StatusGroup({
  status, tasks, runnerMap, allLabels, onTaskClick, defaultOpen,
}: {
  status: TaskStatus;
  tasks: Task[];
  runnerMap: Map<string, Runner>;
  allLabels: Label[];
  onTaskClick: (task: Task) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const config = STATUS_CONFIG[status];
  const tone = getTaskStatusStyles(status);

  if (tasks.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 active:bg-muted/40 transition-colors"
      >
        <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200', open && 'rotate-90')} />
        <span className={cn(tone.icon)}>{config.icon}</span>
        <span className="text-[13px] font-semibold text-foreground">{config.label}</span>
        <span className={cn('ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', tone.pill)}>
          {tasks.length}
        </span>
      </button>

      {open && (
        <div className="flex flex-col">
          {tasks.map((task) => (
            <MobileTaskCard
              key={task.id}
              task={task}
              runner={task.runner_id ? runnerMap.get(task.runner_id) : undefined}
              allLabels={allLabels}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MobileTaskList({
  tasks, runners, allLabels, onTaskClick,
}: {
  tasks: Task[];
  runners: Runner[];
  allLabels: Label[];
  onTaskClick: (task: Task) => void;
}) {
  const runnerMap = new Map(runners.map((r) => [r.id, r]));

  const grouped = new Map<TaskStatus, Task[]>();
  for (const s of TASK_STATUSES) grouped.set(s, []);
  for (const t of tasks) {
    const list = grouped.get(t.status);
    if (list) list.push(t);
  }

  const activeStatuses: TaskStatus[] = ['in_progress', 'todo', 'backlog'];
  const terminalStatuses: TaskStatus[] = ['failed', 'done', 'cancelled'];

  const hasAny = tasks.length > 0;

  return (
    <div>
      {!hasAny && (
        <div className="px-4 py-16 text-center text-[13px] text-muted-foreground/75">No tasks found</div>
      )}

      {/* Active statuses — expanded by default */}
      {activeStatuses.map((status) => (
        <StatusGroup
          key={status}
          status={status}
          tasks={grouped.get(status) ?? []}
          runnerMap={runnerMap}
          allLabels={allLabels}
          onTaskClick={onTaskClick}
          defaultOpen
        />
      ))}

      {/* Terminal statuses — collapsed by default */}
      {terminalStatuses.map((status) => (
        <StatusGroup
          key={status}
          status={status}
          tasks={grouped.get(status) ?? []}
          runnerMap={runnerMap}
          allLabels={allLabels}
          onTaskClick={onTaskClick}
          defaultOpen={false}
        />
      ))}
    </div>
  );
}
