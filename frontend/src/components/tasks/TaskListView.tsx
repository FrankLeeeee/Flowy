import { useState } from 'react';
import { Task, Runner, TaskStatus, TaskPriority } from '../../types';
import { cn } from '@/lib/utils';
import { SignalHigh, SignalMedium, SignalLow, AlertTriangle, Minus, Circle, CheckCircle2, XCircle, Clock, Archive, GripVertical } from 'lucide-react';

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'failed', 'done', 'cancelled'];

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; label: string; color: string; pill: string }> = {
  backlog:     { icon: <Archive className="h-3.5 w-3.5" />,      label: 'Backlog',     color: 'text-slate-600 dark:text-slate-400', pill: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/15' },
  todo:        { icon: <Circle className="h-3.5 w-3.5" />,       label: 'Todo',        color: 'text-sky-600 dark:text-sky-400', pill: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/15' },
  in_progress: { icon: <Clock className="h-3.5 w-3.5" />,        label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/15' },
  failed:      { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Failed',     color: 'text-rose-600 dark:text-rose-400', pill: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/15' },
  done:        { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Done',        color: 'text-emerald-600 dark:text-emerald-400', pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/15' },
  cancelled:   { icon: <XCircle className="h-3.5 w-3.5" />,      label: 'Cancelled',   color: 'text-zinc-500 dark:text-zinc-400', pill: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 ring-zinc-500/15' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { icon: React.ReactNode; color: string }> = {
  urgent: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-rose-600 dark:text-rose-400' },
  high:   { icon: <SignalHigh className="h-3.5 w-3.5" />,    color: 'text-orange-600 dark:text-orange-400' },
  medium: { icon: <SignalMedium className="h-3.5 w-3.5" />,  color: 'text-amber-600 dark:text-amber-400' },
  low:    { icon: <SignalLow className="h-3.5 w-3.5" />,     color: 'text-sky-600 dark:text-sky-400' },
  none:   { icon: <Minus className="h-3.5 w-3.5" />,         color: 'text-foreground/20' },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso + 'Z').getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

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
        <span className={cn(config.color)}>{config.icon}</span>
        <span className="text-[12px] font-semibold text-foreground">{config.label}</span>
        <span className={cn('ml-auto inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ring-1', config.pill)}>{tasks.length}</span>
      </div>

      {/* Rows */}
      {tasks.map((task, index) => {
        const runner = task.runner_id ? runnerMap.get(task.runner_id) : undefined;
        const priority = PRIORITY_CONFIG[task.priority];

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
            <div className={cn('flex items-center', priority.color)}>
              {priority.icon}
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
  for (const s of STATUSES) grouped.set(s, []);
  for (const t of tasks) {
    const list = grouped.get(t.status);
    if (list) list.push(t);
  }

  // Only show statuses that have tasks, or all if dragging is enabled
  const visibleStatuses = STATUSES.filter(
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
