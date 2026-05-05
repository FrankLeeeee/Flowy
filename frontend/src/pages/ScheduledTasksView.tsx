import { useState, useEffect, useCallback } from 'react';
import { Task, List, Runner, TaskStatus } from '../types';
import {
  fetchTasks, fetchRunners, fetchLists, createTask, deleteTask, getTask, updateTask,
} from '../api/client';
import TaskTodoView from '../components/tasks/TaskTodoView';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getToneStyles } from '@/lib/semanticColors';
import { cn } from '@/lib/utils';
import { CalendarDays, CalendarRange, Layers, Plus } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getTodayDateString, getWeekRange } from '@/lib/dateFilter';

type ViewMode = 'today' | 'week' | 'all';

const VIEW_CONFIG: Record<ViewMode, { title: string; subtitle: string; icon: typeof CalendarDays }> = {
  today: { title: 'Today', subtitle: 'Tasks scheduled for today', icon: CalendarDays },
  week: { title: 'This Week', subtitle: 'Tasks scheduled this week', icon: CalendarRange },
  all: { title: 'All Tasks', subtitle: 'All tasks across all lists', icon: Layers },
};

export default function ScheduledTasksView({ mode }: { mode: ViewMode }) {
  const config = VIEW_CONFIG[mode];
  const neutralTone = getToneStyles('neutral');
  const successTone = getToneStyles('success');
  const warningTone = getToneStyles('warning');
  const dangerTone = getToneStyles('danger');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [allLists, setAllLists] = useState<List[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);

  const filterTasks = useCallback((all: Task[]): Task[] => {
    const nonCancelled = all.filter((t) => t.status !== 'cancelled');

    if (mode === 'all') return nonCancelled;

    if (mode === 'today') {
      const today = getTodayDateString();
      return nonCancelled.filter((t) => t.scheduled_date === today);
    }

    const { start, end } = getWeekRange();
    return nonCancelled.filter((t) => t.scheduled_date >= start && t.scheduled_date <= end);
  }, [mode]);

  const loadData = useCallback(async () => {
    try {
      const [allTasks, ls, r] = await Promise.all([fetchTasks(), fetchLists(), fetchRunners()]);
      setTasks(filterTasks(allTasks));
      setAllLists(ls);
      setRunners(r);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filterTasks]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);
  useEffect(() => {
    const iv = setInterval(loadData, 10_000);
    return () => clearInterval(iv);
  }, [loadData]);

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
      <div className="p-6 space-y-5 motion-section" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 min-h-screen pb-10">
      <div
        className="motion-section mb-6 flex shrink-0 flex-wrap items-start justify-between gap-3"
        style={{ '--motion-delay': '80ms' } as React.CSSProperties}
      >
        <div>
          <PageTitle icon={config.icon} title={config.title} />
          <p className="mt-1.5 text-[12px] text-muted-foreground/85">{config.subtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', neutralTone.pill)}>
              {uncompleted.length} active
            </span>
            {inProgressCount > 0 && (
              <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', warningTone.pill)}>
                {inProgressCount} in progress
              </span>
            )}
            {failedCount > 0 && (
              <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', dangerTone.pill)}>
                {failedCount} failed
              </span>
            )}
            {completed.length > 0 && (
              <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', successTone.pill)}>
                {completed.length} completed
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 text-[13px] shadow-soft">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Task
          </Button>
        </div>
      </div>

      {error && (
        <div className={cn('mb-4 rounded-md px-3 py-2 text-[13px] ring-1', dangerTone.panel, dangerTone.text)}>
          {error}
        </div>
      )}

      <div
        className="motion-section"
        style={{ '--motion-delay': '200ms' } as React.CSSProperties}
      >
        <TaskTodoView tasks={tasks} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />
      </div>

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
