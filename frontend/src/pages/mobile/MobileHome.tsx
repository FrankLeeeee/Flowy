import { useState, useEffect, useCallback } from 'react';
import { Task, List, Runner, Label, TaskStatus } from '../../types';
import { fetchTasks, fetchRunners, fetchLists, fetchLabels, createTask, deleteTask, getTask, updateTask } from '../../api/client';
import TaskTodoView from '../../components/tasks/TaskTodoView';
import CreateTaskModal from '../../components/tasks/CreateTaskModal';
import TaskDetailModal from '../../components/tasks/TaskDetailModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getToneStyles } from '@/lib/semanticColors';
import { formatDateLabel } from '@/lib/mobileDateBar';

interface MobileHomeProps {
  selectedDate: string;
}

export default function MobileHome({ selectedDate }: MobileHomeProps) {
  const neutralTone = getToneStyles('neutral');
  const successTone = getToneStyles('success');
  const warningTone = getToneStyles('warning');
  const dangerTone = getToneStyles('danger');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [allLists, setAllLists] = useState<List[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [allTasks, ls, labels, r] = await Promise.all([fetchTasks(), fetchLists(), fetchLabels(), fetchRunners()]);
      const filtered = allTasks.filter(
        (t) => t.status !== 'cancelled' && t.scheduled_date === selectedDate,
      );
      setTasks(filtered);
      setAllLists(ls);
      setAllLabels(labels);
      setRunners(r);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);
  useEffect(() => {
    const iv = setInterval(loadData, 10_000);
    return () => clearInterval(iv);
  }, [loadData]);

  useEffect(() => {
    const handler = () => setShowCreate(true);
    window.addEventListener('flowy:mobile-create', handler);
    return () => window.removeEventListener('flowy:mobile-create', handler);
  }, []);

  const handleCreateTask = async (data: Parameters<typeof createTask>[0]) => {
    await createTask(data);
    setShowCreate(false);
    loadData();
  };

  const handleTaskClick = async (task: Task) => {
    try { setDetailTask(await getTask(task.id)); }
    catch { setDetailTask(task); }
  };

  const handleTaskUpdate = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setDetailTask(updated);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try { await updateTask(taskId, { status: newStatus }); }
    catch { loadData(); }
  };

  const confirmDeleteTask = async () => {
    if (!deleteTaskTarget) return;
    const taskId = deleteTaskTarget.id;
    setDeleteTaskTarget(null);
    await deleteTask(taskId);
    setDetailTask(null);
    loadData();
  };

  const uncompleted = tasks.filter((t) => t.status !== 'done');
  const completed = tasks.filter((t) => t.status === 'done');
  const inProgressCount = uncompleted.filter((t) => t.status === 'in_progress').length;
  const failedCount = uncompleted.filter((t) => t.status === 'failed').length;

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full px-4 pt-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          {formatDateLabel(selectedDate)}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1', neutralTone.pill)}>
            {uncompleted.length} active
          </span>
          {inProgressCount > 0 && (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1', warningTone.pill)}>
              {inProgressCount} in progress
            </span>
          )}
          {failedCount > 0 && (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1', dangerTone.pill)}>
              {failedCount} failed
            </span>
          )}
          {completed.length > 0 && (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1', successTone.pill)}>
              {completed.length} done
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className={cn('mb-4 rounded-md px-3 py-2 text-[13px] ring-1', dangerTone.panel, dangerTone.text)}>
          {error}
        </div>
      )}

      {/* Task list */}
      <TaskTodoView tasks={tasks} allLabels={allLabels} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />

      {/* Modals */}
      <CreateTaskModal
        open={showCreate}
        lists={allLists}
        runners={runners}
        onSubmit={handleCreateTask}
        onClose={() => setShowCreate(false)}
      />
      {detailTask && (
        <TaskDetailModal
          open={!!detailTask}
          task={detailTask}
          runners={runners}
          onUpdate={handleTaskUpdate}
          onDelete={() => setDeleteTaskTarget(detailTask)}
          onClose={() => setDetailTask(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleteTaskTarget}
        title="Delete task"
        description={deleteTaskTarget ? `Delete "${deleteTaskTarget.title}"? Its execution history and output will be removed.` : ''}
        confirmLabel="Delete task"
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteTaskTarget(null)}
      />
    </div>
  );
}
