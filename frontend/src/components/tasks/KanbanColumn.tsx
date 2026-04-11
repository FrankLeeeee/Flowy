import { useState } from 'react';
import { Task, Runner, TaskStatus } from '../../types';
import TaskCard from './TaskCard';
import { cn } from '@/lib/utils';
import { getTaskStatusStyles } from '@/lib/semanticColors';
import { Circle, CheckCircle2, XCircle, Clock, Archive, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; label: string }> = {
  backlog:     { icon: <Archive className="h-3.5 w-3.5" />, label: 'Backlog' },
  todo:        { icon: <Circle className="h-3.5 w-3.5" />, label: 'Todo' },
  in_progress: { icon: <Clock className="h-3.5 w-3.5" />, label: 'In Progress' },
  failed:      { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Failed' },
  done:        { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Done' },
  cancelled:   { icon: <XCircle className="h-3.5 w-3.5" />, label: 'Cancelled' },
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
  const tone = getTaskStatusStyles(status);

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
        tone.border,
        dragOver && 'bg-primary/[0.04] ring-1 ring-primary/20 motion-safe:-translate-y-0.5',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="relative mb-1 flex items-center gap-2 p-3">
        <span className={cn(tone.icon)}>{config.icon}</span>
        <h3 className="text-[13px] font-semibold text-foreground">{config.label}</h3>
        <span className={cn('ml-auto inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ring-1', tone.pill)}>{tasks.length}</span>
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
