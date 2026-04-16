import { useState, useEffect, useCallback } from 'react';
import { Task, Project, Runner, Label } from '../types';
import {
  fetchTasks, fetchProjects, fetchRunners, fetchLabels,
  createTask, assignTask, deleteTask, getTask, updateTask,
} from '../api/client';
import { TaskStatus } from '../types';
import TaskListView from '../components/tasks/TaskListView';
import KanbanBoard from '../components/tasks/KanbanBoard';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import AssignTaskModal from '../components/tasks/AssignTaskModal';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Inbox as InboxIcon, Plus, LayoutGrid, List, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToneStyles } from '@/lib/semanticColors';

export default function Inbox() {
  const successTone = getToneStyles('success');
  const neutralTone = getToneStyles('neutral');
  const dangerTone = getToneStyles('danger');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [viewMode, setViewMode] = useState('kanban');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [priorityFilter, setPriorityFilter] = useState('_all');
  const [runnerFilter, setRunnerFilter] = useState('_all');
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);

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
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
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
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try { await updateTask(taskId, { status: newStatus }); }
    catch { loadData(); }
  };

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
    <div className="flex min-h-screen flex-col p-6">
      {/* Header */}
      <div className="motion-section mb-6 flex flex-wrap items-center justify-between gap-3" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
        <div>
          <PageTitle icon={InboxIcon} title="Inbox" />
          <p className="mt-1.5 text-[12px] text-muted-foreground/85">Active issues across all projects</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', neutralTone.pill)}>{tasks.length} active tasks</span>
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', successTone.pill)}>{runners.length} runners available</span>
          </div>
        </div>
        <Button size="sm" onClick={() => { if (projects.length > 0) setShowCreate(true); }}
          disabled={projects.length === 0} className="h-8 text-[13px] shadow-soft">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Task
        </Button>
      </div>

      {error && (
        <div className={cn('mb-4 rounded-md px-3 py-2 text-[13px] ring-1', dangerTone.panel, dangerTone.text)}>{error}</div>
      )}

      {/* Filters + View toggle */}
      <div className="motion-section mb-6 flex flex-wrap items-center gap-2" style={{ '--motion-delay': '140ms' } as React.CSSProperties}>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[120px] h-8 text-[13px] border-border/60"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
        <Select value={runnerFilter} onValueChange={setRunnerFilter}>
          <SelectTrigger className="w-[120px] h-8 text-[13px] border-border/60"><SelectValue placeholder="Runner" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Runners</SelectItem>
            {runners.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[120px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/65" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[13px] border-border/60" />
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-border/60 bg-card rounded-md overflow-hidden ml-auto shrink-0 shadow-soft">
          <button type="button" onClick={() => setViewMode('kanban')} aria-label="Kanban view"
            className={cn('interactive-lift px-2.5 py-1.5 transition-colors duration-100', viewMode === 'kanban' ? 'bg-foreground/[0.06] text-foreground' : 'text-muted-foreground/75 hover:text-foreground')}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setViewMode('list')} aria-label="List view"
            className={cn('interactive-lift px-2.5 py-1.5 transition-colors duration-100', viewMode === 'list' ? 'bg-foreground/[0.06] text-foreground' : 'text-muted-foreground/75 hover:text-foreground')}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        <span className="shrink-0 text-[11px] font-medium text-muted-foreground/70">{tasks.length} active</span>
      </div>

      {/* Content */}
      <div
        key={viewMode}
        className={cn(
          'motion-section motion-switch',
          viewMode === 'kanban' && 'flex min-h-0 flex-1 flex-col',
        )}
        style={{ '--motion-delay': '200ms' } as React.CSSProperties}
      >
        {viewMode === 'kanban' ? (
          <KanbanBoard tasks={tasks} runners={runners} allLabels={allLabels} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />
        ) : (
          <TaskListView tasks={tasks} runners={runners} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />
        )}
      </div>

      <CreateTaskModal open={showCreate} projects={projects} onSubmit={handleCreateTask} onClose={() => setShowCreate(false)} />
      {detailTask && <TaskDetailModal open={!!detailTask} task={detailTask} runner={runners.find((r) => r.id === detailTask.runner_id)} onUpdate={handleTaskUpdate} onAssign={() => setAssigningTask(detailTask)} onDelete={() => handleDelete(detailTask.id)} onClose={() => setDetailTask(null)} />}
      {assigningTask && <AssignTaskModal open={!!assigningTask} task={assigningTask} runners={runners} onSubmit={handleAssign} onClose={() => setAssigningTask(null)} />}
    </div>
  );
}
