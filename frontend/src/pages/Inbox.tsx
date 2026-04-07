import { useState, useEffect, useCallback } from 'react';
import { Task, Project, Runner } from '../types';
import {
  fetchTasks, fetchProjects, fetchRunners,
  createTask, assignTask, deleteTask, getTask, updateTask,
} from '../api/client';
import { TaskStatus } from '../types';
import TaskListView from '../components/tasks/TaskListView';
import KanbanBoard from '../components/tasks/KanbanBoard';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import AssignTaskModal from '../components/tasks/AssignTaskModal';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, LayoutGrid, List, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Inbox() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
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

      const [t, p, r] = await Promise.all([fetchTasks(filters), fetchProjects(), fetchRunners()]);
      setTasks(t.filter((task) => task.status !== 'done' && task.status !== 'cancelled'));
      setProjects(p);
      setRunners(r);
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
  const handleAssign = async (data: { runnerId: string; aiProvider: string }) => {
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
      <div className="p-6 space-y-5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[15px] font-semibold text-foreground">Inbox</h1>
          <p className="text-[12px] text-muted-foreground/60 mt-0.5">Active issues across all projects</p>
        </div>
        <Button size="sm" onClick={() => { if (projects.length > 0) setShowCreate(true); }}
          disabled={projects.length === 0} className="h-8 text-[13px] shadow-soft">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Task
        </Button>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/[0.06] text-red-500 px-3 py-2 rounded-md text-[13px]">{error}</div>
      )}

      {/* Filters + View toggle */}
      <div className="flex items-center gap-2 mb-5">
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
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[13px] border-border/60" />
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-border/60 rounded-md overflow-hidden ml-auto shrink-0">
          <button onClick={() => setViewMode('kanban')}
            className={cn('px-2.5 py-1.5 transition-colors duration-100', viewMode === 'kanban' ? 'bg-foreground/[0.06] text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground')}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setViewMode('list')}
            className={cn('px-2.5 py-1.5 transition-colors duration-100', viewMode === 'list' ? 'bg-foreground/[0.06] text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground')}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground/40 font-medium shrink-0">{tasks.length} active</span>
      </div>

      {/* Content */}
      {viewMode === 'kanban' ? (
        <KanbanBoard tasks={tasks} runners={runners} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />
      ) : (
        <TaskListView tasks={tasks} runners={runners} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />
      )}

      {showCreate && <CreateTaskModal projects={projects} onSubmit={handleCreateTask} onClose={() => setShowCreate(false)} />}
      {detailTask && <TaskDetailModal task={detailTask} runner={runners.find((r) => r.id === detailTask.runner_id)} onUpdate={handleTaskUpdate} onAssign={() => setAssigningTask(detailTask)} onDelete={() => handleDelete(detailTask.id)} onClose={() => setDetailTask(null)} />}
      {assigningTask && <AssignTaskModal taskKey={assigningTask.task_key} runners={runners} onSubmit={handleAssign} onClose={() => setAssigningTask(null)} />}
    </div>
  );
}
