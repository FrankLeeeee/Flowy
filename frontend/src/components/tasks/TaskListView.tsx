import { useState } from 'react';
import { Task, Runner, TaskStatus, TaskPriority } from '../../types';
import { cn } from '@/lib/utils';
import { SignalHigh, SignalMedium, SignalLow, AlertTriangle, Minus, Circle, CheckCircle2, XCircle, Clock, Archive, GripVertical } from 'lucide-react';

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'failed', 'done', 'cancelled'];

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; label: string; color: string }> = {
  backlog:     { icon: <Archive className="h-3.5 w-3.5" />,      label: 'Backlog',     color: 'text-foreground/30' },
  todo:        { icon: <Circle className="h-3.5 w-3.5" />,       label: 'Todo',        color: 'text-foreground/40' },
  in_progress: { icon: <Clock className="h-3.5 w-3.5" />,        label: 'In Progress', color: 'text-yellow-500' },
  failed:      { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Failed',     color: 'text-red-500' },
  done:        { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Done',        color: 'text-emerald-500' },
  cancelled:   { icon: <XCircle className="h-3.5 w-3.5" />,      label: 'Cancelled',   color: 'text-foreground/25' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { icon: React.ReactNode; color: string }> = {
  urgent: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-red-500' },
  high:   { icon: <SignalHigh className="h-3.5 w-3.5" />,    color: 'text-orange-500' },
  medium: { icon: <SignalMedium className="h-3.5 w-3.5" />,  color: 'text-yellow-500' },
  low:    { icon: <SignalLow className="h-3.5 w-3.5" />,     color: 'text-blue-400' },
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
        'flex items-center gap-2 px-4 py-2 border-b border-border/40',
        dragOver && 'border-primary/20',
      )}>
        <span className={cn(config.color)}>{config.icon}</span>
        <span className="text-[12px] font-medium text-foreground">{config.label}</span>
        <span className="text-[11px] text-muted-foreground/40 font-medium">{tasks.length}</span>
      </div>

      {/* Rows */}
      {tasks.map((task) => {
        const runner = task.runner_id ? runnerMap.get(task.runner_id) : undefined;
        const priority = PRIORITY_CONFIG[task.priority];

        return (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/task-id', task.id);
              e.dataTransfer.effectAllowed = 'move';
              requestAnimationFrame(() => {
                (e.target as HTMLElement).style.opacity = '0.4';
              });
            }}
            onDragEnd={(e) => {
              (e.target as HTMLElement).style.opacity = '1';
            }}
            onClick={() => onTaskClick(task)}
            className="grid grid-cols-[20px_1fr_80px_100px_80px] gap-2 px-4 py-2.5 items-center cursor-grab active:cursor-grabbing hover:bg-foreground/[0.02] transition-colors duration-100 border-b border-border/30 last:border-b-0"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors" />
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0">{task.task_key}</span>
              <span className="text-[13px] font-medium text-foreground truncate">{task.title}</span>
            </div>
            <div className={cn('flex items-center', priority.color)}>
              {priority.icon}
            </div>
            <span className="text-[12px] text-muted-foreground truncate">{runner?.name ?? '-'}</span>
            <span className="text-[11px] text-muted-foreground/50 text-right">{timeAgo(task.updated_at)}</span>
          </div>
        );
      })}

      {/* Empty drop target */}
      {tasks.length === 0 && (
        <div className={cn(
          'px-4 py-4 text-center text-[12px] text-muted-foreground/30 transition-colors duration-150',
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
    <div className="rounded-lg border border-border/80 bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[20px_1fr_80px_100px_80px] gap-2 px-4 py-2 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-[0.04em] border-b border-border/60">
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
          <div className="px-4 py-16 text-center text-[13px] text-muted-foreground/50">No tasks found</div>
        )}
      </div>
    </div>
  );
}
