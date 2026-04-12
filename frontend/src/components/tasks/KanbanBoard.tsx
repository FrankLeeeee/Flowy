import { Task, Runner, TaskStatus } from '../../types';
import { TASK_STATUSES } from '@/lib/taskConstants';
import KanbanColumn from './KanbanColumn';

export default function KanbanBoard({
  tasks, runners, onTaskClick, onStatusChange,
}: {
  tasks: Task[];
  runners: Runner[];
  onTaskClick: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}) {
  const grouped = new Map<TaskStatus, Task[]>();
  for (const s of TASK_STATUSES) grouped.set(s, []);
  for (const t of tasks) {
    const list = grouped.get(t.status);
    if (list) list.push(t);
  }

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    onStatusChange?.(taskId, newStatus);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {TASK_STATUSES.map((status) => (
        <div key={status} className="motion-section shrink-0" style={{ '--motion-delay': `${TASK_STATUSES.indexOf(status) * 45 + 40}ms` } as React.CSSProperties}>
          <KanbanColumn
            status={status}
            tasks={grouped.get(status) ?? []}
            runners={runners}
            onTaskClick={onTaskClick}
            onDrop={handleDrop}
          />
        </div>
      ))}
    </div>
  );
}
