import { Task, Runner, TaskStatus } from '../../types';
import KanbanColumn from './KanbanColumn';

const COLUMNS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'failed', 'done', 'cancelled'];

export default function KanbanBoard({
  tasks, runners, onTaskClick, onStatusChange,
}: {
  tasks: Task[];
  runners: Runner[];
  onTaskClick: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}) {
  const grouped = new Map<TaskStatus, Task[]>();
  for (const s of COLUMNS) grouped.set(s, []);
  for (const t of tasks) {
    const list = grouped.get(t.status);
    if (list) list.push(t);
  }

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    // Don't fire if the task is already in that status
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    onStatusChange?.(taskId, newStatus);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={grouped.get(status) ?? []}
          runners={runners}
          onTaskClick={onTaskClick}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
