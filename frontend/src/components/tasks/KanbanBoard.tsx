import type { CSSProperties } from 'react';
import { Task, Runner, Label, TaskStatus } from '../../types';
import { TASK_STATUSES } from '@/lib/taskConstants';
import { compareTasksBySchedule } from '@/lib/taskSchedule';
import { sortByCompletedAtDesc } from '@/lib/utils';
import KanbanColumn from './KanbanColumn';

export default function KanbanBoard({
  tasks, runners, allLabels = [], onTaskClick, onStatusChange,
}: {
  tasks: Task[];
  runners: Runner[];
  allLabels?: Label[];
  onTaskClick: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}) {
  const grouped = new Map<TaskStatus, Task[]>();
  for (const s of TASK_STATUSES) grouped.set(s, []);
  for (const t of tasks) {
    const list = grouped.get(t.status);
    if (list) list.push(t);
  }
  for (const [status, list] of grouped) {
    if (status === 'done') continue;
    list.sort(compareTasksBySchedule);
  }
  grouped.set('done', sortByCompletedAtDesc(grouped.get('done') ?? []));

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    onStatusChange?.(taskId, newStatus);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden pb-4">
        {TASK_STATUSES.map((status) => (
          <div
            key={status}
            className="motion-section flex min-h-0 shrink-0"
            style={{ '--motion-delay': `${TASK_STATUSES.indexOf(status) * 45 + 40}ms` } as CSSProperties}
          >
            <KanbanColumn
              status={status}
              tasks={grouped.get(status) ?? []}
              runners={runners}
              allLabels={allLabels}
              onTaskClick={onTaskClick}
              onDrop={handleDrop}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
