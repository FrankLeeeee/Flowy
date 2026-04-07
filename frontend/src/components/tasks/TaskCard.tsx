import { Task, TaskPriority, Runner } from '../../types';
import { cn } from '@/lib/utils';
import { SignalHigh, SignalMedium, SignalLow, AlertTriangle, Minus } from 'lucide-react';

const PRIORITY_ICON: Record<TaskPriority, { icon: React.ReactNode; color: string }> = {
  urgent: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-red-500' },
  high:   { icon: <SignalHigh className="h-3.5 w-3.5" />,    color: 'text-orange-500' },
  medium: { icon: <SignalMedium className="h-3.5 w-3.5" />,  color: 'text-yellow-500' },
  low:    { icon: <SignalLow className="h-3.5 w-3.5" />,     color: 'text-blue-400' },
  none:   { icon: <Minus className="h-3.5 w-3.5" />,         color: 'text-foreground/20' },
};

export default function TaskCard({
  task, runner, onClick,
}: {
  task: Task; runner?: Runner; onClick: () => void;
}) {
  const labels: string[] = JSON.parse(task.labels || '[]');
  const pri = PRIORITY_ICON[task.priority];

  return (
    <button
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
      onClick={onClick}
      className="w-full text-left rounded-lg bg-card border border-border/80 p-3 hover:border-foreground/10 shadow-soft hover:shadow-elevated transition-all duration-150 group cursor-grab active:cursor-grabbing"
    >
      {/* Key + Priority */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-mono text-muted-foreground/60 tracking-wide">{task.task_key}</span>
        <span className={cn(pri.color)}>{pri.icon}</span>
      </div>

      {/* Title */}
      <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">{task.title}</p>

      {/* Meta */}
      {(labels.length > 0 || runner || task.ai_provider) && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {labels.map((l) => (
            <span key={l} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-foreground/[0.05] text-muted-foreground">
              {l}
            </span>
          ))}
          {runner && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
              {runner.name}
            </span>
          )}
          {task.ai_provider && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600">
              {task.ai_provider}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
