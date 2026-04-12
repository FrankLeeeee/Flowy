import { Task, Runner } from '../../types';
import { PRIORITY_ICON } from '@/lib/taskConstants';
import { cn, formatElapsedTime } from '@/lib/utils';
import { getAiProviderStyles, getLabelStyles, getTaskPriorityStyles } from '@/lib/semanticColors';
import { Clock3 } from 'lucide-react';

export default function TaskCard({
  task, runner, onClick,
}: {
  task: Task; runner?: Runner; onClick: () => void;
}) {
  const labels: string[] = JSON.parse(task.labels || '[]');
  const priorityStyles = getTaskPriorityStyles(task.priority);
  const elapsed = formatElapsedTime(task.started_at, task.completed_at);

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
      <span className={cn('absolute inset-y-3 left-0.5 w-1 rounded-full opacity-80', priorityStyles.bar)} />
      {/* Key + Priority */}
      <div className="relative flex items-center justify-between gap-2 mb-1.5 pl-1.5">
        <span className="text-[11px] font-mono tracking-wide text-muted-foreground/80">{task.task_key}</span>
        <span className={cn(priorityStyles.icon)}>{PRIORITY_ICON[task.priority]}</span>
      </div>

      {/* Title */}
      <p className="relative pl-1.5 text-[13px] font-medium text-foreground leading-snug line-clamp-2">{task.title}</p>

      {/* Meta */}
      {(labels.length > 0 || runner || task.ai_provider) && (
        <div className="relative flex items-center gap-1.5 mt-2 flex-wrap pl-1.5">
          {labels.map((label) => (
            <span key={label} className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1', getLabelStyles(label).pill)}>
              {label}
            </span>
          ))}
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
        </div>
      )}

      {elapsed && (
        <div className="relative mt-2 flex items-center gap-1.5 pl-1.5 text-[10px] font-medium text-muted-foreground/80">
          <Clock3 className="h-3 w-3" />
          <span>Took {elapsed}</span>
        </div>
      )}
    </button>
  );
}
