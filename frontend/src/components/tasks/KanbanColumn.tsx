import { useState } from 'react';
import { Task, Runner, Label, TaskStatus } from '../../types';
import { STATUS_CONFIG } from '@/lib/taskConstants';
import TaskCard from './TaskCard';
import { cn } from '@/lib/utils';
import { getTaskStatusStyles } from '@/lib/semanticColors';

export default function KanbanColumn({
  status, tasks, runners, allLabels = [], onTaskClick, onDrop,
}: {
  status: TaskStatus;
  tasks: Task[];
  runners: Runner[];
  allLabels?: Label[];
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
        'surface-tint flex h-full min-h-0 flex-col w-[300px] shrink-0 rounded-[20px] border border-border/40 dark:border-border/60 interactive-lift overflow-hidden',
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
        'flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden rounded-b-[20px] px-2 pb-2 transition-colors duration-150',
        dragOver && 'border-t border-dashed border-primary/30 bg-primary/[0.03]',
      )}>
        {tasks.map((task, index) => (
          <div key={task.id} className="motion-card" style={{ '--motion-delay': `${index * 35 + 120}ms` } as React.CSSProperties}>
            <TaskCard
              task={task}
              runner={task.runner_id ? runnerMap.get(task.runner_id) : undefined}
              allLabels={allLabels}
              onClick={() => onTaskClick(task)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
