import { useState, useEffect, useCallback } from 'react';
import { Task, Project, Runner, Label } from '../../types';
import {
  fetchTasks, fetchProjects, fetchRunners, fetchLabels,
  createTask, assignTask, deleteTask, getTask,
} from '../../api/client';
import MobileTaskList from '@/components/mobile/MobileTaskList';
import MobileFilterSheet from '@/components/mobile/MobileFilterSheet';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import AssignTaskModal from '@/components/tasks/AssignTaskModal';
import TaskDetailModal from '@/components/tasks/TaskDetailModal';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getToneStyles } from '@/lib/semanticColors';
import { Plus, SlidersHorizontal } from 'lucide-react';

export default function MobileInbox() {
  const successTone = getToneStyles('success');
  const neutralTone = getToneStyles('neutral');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

  const [priorityFilter, setPriorityFilter] = useState('_all');
  const [runnerFilter, setRunnerFilter] = useState('_all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);

  const hasActiveFilters = priorityFilter !== '_all' || runnerFilter !== '_all' || search !== '';

  const loadData = useCallback(async () => {
    try {
      const filters: Record<string, string> = {};
      if (priorityFilter !== '_all') filters.priority = priorityFilter;
      if (runnerFilter !== '_all') filters.runner = runnerFilter;
      if (search) filters.search = search;

      const [t, p, r, l] = await Promise.all([fetchTasks(filters), fetchProjects(), fetchRunners(), fetchLabels()]);
      setTasks(t.filter((task) => task.status !== 'done' && task.status !== 'cancelled'));
      setProjects(p);
      setRunners(r);
      setAllLabels(l);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [priorityFilter, runnerFilter, search]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { const iv = setInterval(loadData, 10_000); return () => clearInterval(iv); }, [loadData]);

  const handleCreateTask = async (data: Parameters<typeof createTask>[0]) => {
    await createTask(data); setShowCreate(false); loadData();
  };
  const handleAssign = async (data: Parameters<typeof assignTask>[1]) => {
    if (!assigningTask) return;
    await assignTask(assigningTask.id, data); setAssigningTask(null); setDetailTask(null); loadData();
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(id); setDetailTask(null); loadData();
  };
  const handleTaskUpdate = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t))); setDetailTask(updated);
  };
  const handleTaskClick = async (task: Task) => {
    try { setDetailTask(await getTask(task.id)); } catch { setDetailTask(task); }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-lg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-foreground">Inbox</h1>
            <div className="mt-1 flex items-center gap-2 text-[11px]">
              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1', neutralTone.pill)}>
                {tasks.length} active
              </span>
              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1', successTone.pill)}>
                {runners.length} runners
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className={cn(
                'relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 transition-colors active:bg-muted/50',
                hasActiveFilters && 'border-primary/40 bg-primary/5',
              )}
            >
              <SlidersHorizontal className={cn('h-4 w-4', hasActiveFilters ? 'text-primary' : 'text-muted-foreground')} />
              {hasActiveFilters && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
            <button
              type="button"
              onClick={() => { if (projects.length > 0) setShowCreate(true); }}
              disabled={projects.length === 0}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft active:opacity-90 disabled:opacity-40"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Task list */}
      <MobileTaskList tasks={tasks} runners={runners} allLabels={allLabels} onTaskClick={handleTaskClick} />

      {/* Filter sheet */}
      <MobileFilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        runners={runners}
        search={search}
        onSearchChange={setSearch}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        runnerFilter={runnerFilter}
        onRunnerChange={setRunnerFilter}
      />

      {/* Modals (reuse desktop modals — they already scale to full width on small screens) */}
      <CreateTaskModal open={showCreate} projects={projects} onSubmit={handleCreateTask} onClose={() => setShowCreate(false)} />
      {detailTask && (
        <TaskDetailModal
          open={!!detailTask}
          task={detailTask}
          runner={runners.find((r) => r.id === detailTask.runner_id)}
          onUpdate={handleTaskUpdate}
          onAssign={() => setAssigningTask(detailTask)}
          onDelete={() => handleDelete(detailTask.id)}
          onClose={() => setDetailTask(null)}
        />
      )}
      {assigningTask && (
        <AssignTaskModal
          open={!!assigningTask}
          task={assigningTask}
          runners={runners}
          onSubmit={handleAssign}
          onClose={() => setAssigningTask(null)}
        />
      )}
    </div>
  );
}
