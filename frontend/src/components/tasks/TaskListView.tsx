import { useState } from 'react';
import { Task, Runner, TaskStatus } from '../../types';
import { STATUS_CONFIG, PRIORITY_ICON, TASK_STATUSES } from '@/lib/taskConstants';
import { cn, timeAgo } from '@/lib/utils';
import { getTaskPriorityStyles, getTaskStatusStyles } from '@/lib/semanticColors';
import { GripVertical } from 'lucide-react';

function StatusGroup({
  status, tasks, runnerMap, onTaskClick, onDrop,
}: {
  status: TaskStatus;
  tasks: Task[];
  runnerMap: Map<string, Runner>;
  onTaskClick: (task: Task) => void;
  onDrop?: (taskId: string, newStatus: TaskStatus) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const config = STATUS_CONFIG[status];
  const tone = getTaskStatusStyles(status);

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/task-id')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData('application/task-id');
    if (taskId && onDrop) onDrop(taskId, status);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'transition-colors duration-150',
        dragOver && 'bg-primary/[0.03]',
      )}
    >
      {/* Group header */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/50',
        dragOver && 'border-primary/20',
      )}>
        <span className={cn(tone.icon)}>{config.icon}</span>
        <span className="text-[12px] font-semibold text-foreground">{config.label}</span>
        <span className={cn('ml-auto inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ring-1', tone.pill)}>{tasks.length}</span>
      </div>

      {/* Rows */}
      {tasks.map((task, index) => {
        const runner = task.runner_id ? runnerMap.get(task.runner_id) : undefined;
        const priorityTone = getTaskPriorityStyles(task.priority);

        return (
          <div
            key={task.id}
            draggable
            style={{ '--motion-delay': `${index * 28 + 80}ms` } as React.CSSProperties}
            onDragStart={(e) => {
              e.dataTransfer.setData('application/task-id', task.id);
              e.dataTransfer.effectAllowed = 'move';
              requestAnimationFrame(() => {
                const target = e.currentTarget;
                target.style.opacity = '0.45';
                target.dataset.dragging = 'true';
              });
            }}
            onDragEnd={(e) => {
              e.currentTarget.style.opacity = '1';
              delete e.currentTarget.dataset.dragging;
            }}
            onClick={() => onTaskClick(task)}
            className="motion-card interactive-row grid grid-cols-[20px_1fr_80px_100px_80px] gap-2 px-4 py-2.5 items-center cursor-grab active:cursor-grabbing hover:bg-primary/[0.035] motion-safe:hover:translate-x-0.5 data-[dragging=true]:scale-[0.995] border-b border-border/30 last:border-b-0"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/45 transition-colors hover:text-muted-foreground/75" />
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 text-[11px] font-mono text-muted-foreground/75">{task.task_key}</span>
              <span className="text-[13px] font-medium text-foreground truncate">{task.title}</span>
            </div>
            <div className={cn('flex items-center', priorityTone.icon)}>
              {PRIORITY_ICON[task.priority]}
            </div>
            <span className="text-[12px] text-muted-foreground truncate">{runner?.name ?? '-'}</span>
            <span className="text-right text-[11px] text-muted-foreground/75">{timeAgo(task.updated_at)}</span>
          </div>
        );
      })}

      {/* Empty drop target */}
      {tasks.length === 0 && (
        <div className={cn(
          'px-4 py-4 text-center text-[12px] text-muted-foreground/65 transition-colors duration-150',
          dragOver && 'text-primary/50',
        )}>
          {dragOver ? 'Drop here' : 'No tasks'}
        </div>
      )}
    </div>
  );
}

export default function TaskListView({
  tasks, runners, onTaskClick, onStatusChange,
}: {
  tasks: Task[];
  runners: Runner[];
  onTaskClick: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}) {
  const runnerMap = new Map(runners.map((r) => [r.id, r]));

  // Group tasks by status
  const grouped = new Map<TaskStatus, Task[]>();
  for (const s of TASK_STATUSES) grouped.set(s, []);
  for (const t of tasks) {
    const list = grouped.get(t.status);
    if (list) list.push(t);
  }

  // Only show statuses that have tasks, or all if drag-and-drop is enabled
  const visibleStatuses = TASK_STATUSES.filter(
    (s) => (grouped.get(s)?.length ?? 0) > 0 || onStatusChange
  );

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    onStatusChange?.(taskId, newStatus);
  };

  return (
    <div className="surface-tint rounded-[20px] border border-border/40 dark:border-border/60 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[20px_1fr_80px_100px_80px] gap-2 border-b border-border/60 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground/80">
        <span />
        <span>Issue</span>
        <span>Priority</span>
        <span>Runner</span>
        <span className="text-right">Updated</span>
      </div>

      {/* Grouped rows */}
      <div>
        {visibleStatuses.map((status) => (
          <StatusGroup
            key={status}
            status={status}
            tasks={grouped.get(status) ?? []}
            runnerMap={runnerMap}
            onTaskClick={onTaskClick}
            onDrop={handleDrop}
          />
        ))}
        {tasks.length === 0 && (
          <div className="px-4 py-16 text-center text-[13px] text-muted-foreground/75">No tasks found</div>
        )}
      </div>
    </div>
  );
}
