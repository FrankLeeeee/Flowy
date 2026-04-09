import { Task, TaskPriority, Runner } from '../../types';
import { cn } from '@/lib/utils';
import { SignalHigh, SignalMedium, SignalLow, AlertTriangle, Minus } from 'lucide-react';

const PRIORITY_ICON: Record<TaskPriority, { icon: React.ReactNode; color: string; surface: string; bar: string }> = {
  urgent: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-rose-600 dark:text-rose-400', surface: 'from-rose-500/12 via-transparent to-transparent', bar: 'bg-rose-500' },
  high:   { icon: <SignalHigh className="h-3.5 w-3.5" />,    color: 'text-orange-600 dark:text-orange-400', surface: 'from-orange-500/10 via-transparent to-transparent', bar: 'bg-orange-500' },
  medium: { icon: <SignalMedium className="h-3.5 w-3.5" />,  color: 'text-amber-600 dark:text-amber-400', surface: 'from-amber-500/10 via-transparent to-transparent', bar: 'bg-amber-500' },
  low:    { icon: <SignalLow className="h-3.5 w-3.5" />,     color: 'text-sky-600 dark:text-sky-400', surface: 'from-sky-500/10 via-transparent to-transparent', bar: 'bg-sky-500' },
  none:   { icon: <Minus className="h-3.5 w-3.5" />,         color: 'text-foreground/20', surface: 'from-foreground/[0.04] via-transparent to-transparent', bar: 'bg-foreground/10' },
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
          const target = e.currentTarget;
          target.style.opacity = '0.45';
          target.dataset.dragging = 'true';
        });
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = '1';
        delete e.currentTarget.dataset.dragging;
      }}
      onClick={onClick}
      className="interactive-lift surface-tint relative w-full overflow-hidden text-left rounded-[16px] border border-border/40 dark:border-border/60 p-3 hover:border-primary/15 hover:shadow-float motion-safe:hover:-translate-y-0.5 data-[dragging=true]:scale-[0.985] data-[dragging=true]:rotate-[0.35deg] group cursor-grab active:cursor-grabbing"
    >
      <span className={cn('absolute inset-y-3 left-0.5 w-1 rounded-full opacity-80', pri.bar)} />
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-br', pri.surface)} />

      {/* Key + Priority */}
      <div className="relative flex items-center justify-between gap-2 mb-1.5 pl-1.5">
        <span className="text-[11px] font-mono tracking-wide text-muted-foreground/80">{task.task_key}</span>
        <span className={cn(pri.color)}>{pri.icon}</span>
      </div>

      {/* Title */}
      <p className="relative pl-1.5 text-[13px] font-medium text-foreground leading-snug line-clamp-2">{task.title}</p>

      {/* Meta */}
      {(labels.length > 0 || runner || task.ai_provider) && (
        <div className="relative flex items-center gap-1.5 mt-2 flex-wrap pl-1.5">
          {labels.map((l) => (
            <span key={l} className="inline-flex items-center rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/85 ring-1 ring-foreground/5">
              {l}
            </span>
          ))}
          {runner && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary ring-1 ring-primary/10">
              {runner.name}
            </span>
          )}
          {task.ai_provider && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/10">
              {task.ai_provider}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
