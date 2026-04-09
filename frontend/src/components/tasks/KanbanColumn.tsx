import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Task, Runner, TaskStatus } from '../../types';
import TaskCard from './TaskCard';
import { cn } from '@/lib/utils';
import { Circle, CheckCircle2, XCircle, Clock, Archive, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; label: string; color: string; pill: string; surfaceStart: string; surfaceMid: string; border: string }> = {
  backlog:     { icon: <Archive className="h-3.5 w-3.5" />,      label: 'Backlog',     color: 'text-slate-500 dark:text-slate-400', pill: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/15', surfaceStart: 'rgba(100, 116, 139, 0.12)', surfaceMid: 'rgba(100, 116, 139, 0.04)', border: 'border-slate-500/12' },
  todo:        { icon: <Circle className="h-3.5 w-3.5" />,       label: 'Todo',        color: 'text-sky-600 dark:text-sky-400', pill: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/15', surfaceStart: 'rgba(14, 165, 233, 0.16)', surfaceMid: 'rgba(14, 165, 233, 0.05)', border: 'border-sky-500/14' },
  in_progress: { icon: <Clock className="h-3.5 w-3.5" />,        label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/15', surfaceStart: 'rgba(245, 158, 11, 0.16)', surfaceMid: 'rgba(245, 158, 11, 0.05)', border: 'border-amber-500/14' },
  failed:      { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Failed',     color: 'text-rose-600 dark:text-rose-400', pill: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/15', surfaceStart: 'rgba(244, 63, 94, 0.16)', surfaceMid: 'rgba(244, 63, 94, 0.05)', border: 'border-rose-500/14' },
  done:        { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Done',        color: 'text-emerald-600 dark:text-emerald-400', pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/15', surfaceStart: 'rgba(16, 185, 129, 0.16)', surfaceMid: 'rgba(16, 185, 129, 0.05)', border: 'border-emerald-500/14' },
  cancelled:   { icon: <XCircle className="h-3.5 w-3.5" />,      label: 'Cancelled',   color: 'text-zinc-500 dark:text-zinc-400', pill: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 ring-zinc-500/15', surfaceStart: 'rgba(113, 113, 122, 0.12)', surfaceMid: 'rgba(113, 113, 122, 0.04)', border: 'border-zinc-500/12' },
};

export default function KanbanColumn({
  status, tasks, runners, onTaskClick, onDrop,
}: {
  status: TaskStatus;
  tasks: Task[];
  runners: Runner[];
  onTaskClick: (task: Task) => void;
  onDrop?: (taskId: string, newStatus: TaskStatus) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const runnerMap = new Map(runners.map((r) => [r.id, r]));
  const config = STATUS_CONFIG[status];
  const headerStyle = {
    backgroundImage: `linear-gradient(135deg, ${config.surfaceStart} 0%, ${config.surfaceMid} 38%, transparent 78%)`,
  } as CSSProperties;

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/task-id')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only toggle off when leaving the column entirely, not its children
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
      className={cn(
        'surface-tint flex flex-col w-[300px] shrink-0 rounded-[20px] border border-border/40 dark:border-border/60 interactive-lift overflow-hidden',
        config.border,
        dragOver && 'bg-primary/[0.04] ring-1 ring-primary/20 motion-safe:-translate-y-0.5',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="relative mb-1 flex items-center gap-2 p-3" style={headerStyle}>
        <span className={cn(config.color)}>{config.icon}</span>
        <h3 className="text-[13px] font-semibold text-foreground">{config.label}</h3>
        <span className={cn('ml-auto inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ring-1', config.pill)}>{tasks.length}</span>
      </div>

      {/* Cards */}
      <div className={cn(
        'flex flex-col gap-1.5 flex-1 min-h-[200px] rounded-b-[20px] px-2 pb-2 transition-colors duration-150',
        dragOver && 'border-t border-dashed border-primary/30 bg-primary/[0.03]',
      )}>
        {tasks.map((task, index) => (
          <div key={task.id} className="motion-card" style={{ '--motion-delay': `${index * 35 + 120}ms` } as React.CSSProperties}>
            <TaskCard
              task={task}
              runner={task.runner_id ? runnerMap.get(task.runner_id) : undefined}
              onClick={() => onTaskClick(task)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
