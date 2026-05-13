import { memo, useMemo } from 'react';
import { Task, Runner, Label } from '../../types';
import { PRIORITY_ICON } from '@/lib/taskConstants';
import { cn, formatElapsedTime } from '@/lib/utils';
import { formatTaskScheduleCompact, formatTaskTimeDurationPill } from '@/lib/taskSchedule';
import { getAiHarnessPillStyle, getLabelColorStyles, getTaskPriorityStyles } from '@/lib/semanticColors';
import { CalendarDays, Clock3, Repeat } from 'lucide-react';

export default memo(function TaskCard({
  task, runner, allLabels = [], onClick,
}: {
  task: Task; runner?: Runner; allLabels?: Label[]; onClick: () => void;
}) {
  const labels: string[] = useMemo(() => JSON.parse(task.labels || '[]'), [task.labels]);
  const priorityStyles = getTaskPriorityStyles(task.priority);
  const elapsed = formatElapsedTime(task.started_at, task.completed_at);
  const timeDurationLabel = formatTaskTimeDurationPill(task.scheduled_time, task.scheduled_duration_minutes);

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
      className="interactive-lift surface-tint relative w-full overflow-hidden text-left rounded-2xl border border-border/40 dark:border-border/60 p-3 hover:border-primary/15 hover:shadow-float motion-safe:hover:-translate-y-0.5 data-[dragging=true]:scale-[0.985] data-[dragging=true]:rotate-[0.35deg] group cursor-grab active:cursor-grabbing"
    >
      {/* Key + Priority */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-mono tracking-wide text-muted-foreground/80">{task.task_key}</span>
        <span className={cn(priorityStyles.icon)}>{PRIORITY_ICON[task.priority]}</span>
      </div>

      {/* Title */}
      <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">{task.title}</p>

      {/* Meta */}
      {(timeDurationLabel || labels.length > 0 || runner || task.ai_provider || task.recurrence_rule) && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {timeDurationLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-foreground/8">
              <Clock3 className="h-2.5 w-2.5" />
              {timeDurationLabel}
            </span>
          )}
          {labels.map((label) => {
            const colorStyles = getLabelColorStyles(label, allLabels);
            return (
              <span key={label} className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1', colorStyles.pill)}>
                {label}
              </span>
            );
          })}
          {runner && (
            <span className="inline-flex items-center rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-foreground/8">
              {runner.name}
            </span>
          )}
          {task.ai_provider && (
            <span
              className="ai-harness-pill inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={getAiHarnessPillStyle(task.ai_provider)}
            >
              {task.ai_provider}
            </span>
          )}
          {task.recurrence_rule && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/15">
              <Repeat className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      )}

      <div className="relative mt-2 flex items-center gap-1.5 pl-1.5 text-[10px] font-medium text-muted-foreground/80">
        <CalendarDays className="h-3 w-3" />
        <span>{formatTaskScheduleCompact(task.scheduled_date, task.scheduled_time)}</span>
      </div>

      {elapsed && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/80">
          <Clock3 className="h-3 w-3" />
          <span>Took {elapsed}</span>
        </div>
      )}
    </button>
  );
});
