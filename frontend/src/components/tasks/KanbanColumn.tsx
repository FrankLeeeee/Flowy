import { useState } from 'react';
import { Task, Runner, TaskStatus } from '../../types';
import TaskCard from './TaskCard';
import { cn } from '@/lib/utils';
import { Circle, CheckCircle2, XCircle, Clock, Archive, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; label: string; color: string }> = {
  backlog:     { icon: <Archive className="h-3.5 w-3.5" />,      label: 'Backlog',     color: 'text-foreground/30' },
  todo:        { icon: <Circle className="h-3.5 w-3.5" />,       label: 'Todo',        color: 'text-foreground/40' },
  in_progress: { icon: <Clock className="h-3.5 w-3.5" />,        label: 'In Progress', color: 'text-yellow-500' },
  failed:      { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Failed',     color: 'text-red-500' },
  done:        { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Done',        color: 'text-emerald-500' },
  cancelled:   { icon: <XCircle className="h-3.5 w-3.5" />,      label: 'Cancelled',   color: 'text-foreground/25' },
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
        'flex flex-col min-w-[280px] max-w-[320px] flex-1 rounded-lg transition-colors duration-150',
        dragOver && 'bg-primary/[0.04] ring-1 ring-primary/20',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className={cn(config.color)}>{config.icon}</span>
        <h3 className="text-[13px] font-medium text-foreground">{config.label}</h3>
        <span className="text-[11px] text-muted-foreground/40 font-medium">{tasks.length}</span>
      </div>

      {/* Cards */}
      <div className={cn(
        'flex flex-col gap-1.5 flex-1 min-h-[200px] rounded-md p-1 transition-colors duration-150',
        dragOver && 'border border-dashed border-primary/30',
      )}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            runner={task.runner_id ? runnerMap.get(task.runner_id) : undefined}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </div>
    </div>
  );
}
