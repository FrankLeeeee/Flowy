import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, Project, Runner, TaskStatus } from '../types';
import {
  fetchTasks, fetchRunners, createTask, assignTask, deleteTask, getTask, updateTask,
  fetchProjects, updateProject, deleteProject,
} from '../api/client';
import TaskListView from '../components/tasks/TaskListView';
import KanbanBoard from '../components/tasks/KanbanBoard';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import AssignTaskModal from '../components/tasks/AssignTaskModal';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, LayoutGrid, List, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [viewMode, setViewMode] = useState('kanban');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('_all');
  const [priorityFilter, setPriorityFilter] = useState('_all');
  const [runnerFilter, setRunnerFilter] = useState('_all');
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const filters: Record<string, string> = { project: id };
      if (statusFilter !== '_all') filters.status = statusFilter;
      if (priorityFilter !== '_all') filters.priority = priorityFilter;
      if (runnerFilter !== '_all') filters.runner = runnerFilter;
      if (search) filters.search = search;

      const [t, ps, r] = await Promise.all([fetchTasks(filters), fetchProjects(), fetchRunners()]);
      const proj = ps.find((p) => p.id === id);
      if (!proj) { setError('Project not found'); setLoading(false); return; }
      setProject(proj); setAllProjects(ps); setTasks(t); setRunners(r); setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter, priorityFilter, runnerFilter, search]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);
  useEffect(() => { const iv = setInterval(loadData, 10_000); return () => clearInterval(iv); }, [loadData]);

  const handleCreateTask = async (data: Parameters<typeof createTask>[0]) => { await createTask(data); setShowCreate(false); loadData(); };
  const handleAssign = async (data: { runnerId: string; aiProvider: string }) => { if (!assigningTask) return; await assignTask(assigningTask.id, data); setAssigningTask(null); setDetailTask(null); loadData(); };
  const handleDelete = async (taskId: string) => { if (!confirm('Delete this task?')) return; await deleteTask(taskId); setDetailTask(null); loadData(); };
  const handleTaskUpdate = (updated: Task) => { setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t))); setDetailTask(updated); };
  const handleTaskClick = async (task: Task) => { try { setDetailTask(await getTask(task.id)); } catch { setDetailTask(task); } };
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try { await updateTask(taskId, { status: newStatus }); }
    catch { loadData(); }
  };

  const openEditProject = () => { if (!project) return; setEditName(project.name); setEditDescription(project.description ?? ''); setShowEditProject(true); };
  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault(); if (!project || !editName.trim()) return;
    try { const updated = await updateProject(project.id, { name: editName.trim(), description: editDescription.trim() }); setProject(updated); setShowEditProject(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to update project'); }
  };
  const handleDeleteProject = async () => {
    if (!project) return;
    try { await deleteProject(project.id); setShowDeleteConfirm(false); navigate('/inbox'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete project'); setShowDeleteConfirm(false); }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-muted-foreground py-20">
        <p className="text-[14px]">Project not found</p>
        <Button variant="link" onClick={() => navigate('/inbox')} className="text-[13px] text-primary">Go to Inbox</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-foreground">{project.name}</h1>
            <span className="text-[10px] font-mono text-muted-foreground/40 tracking-wide bg-foreground/[0.04] px-1.5 py-0.5 rounded">{project.key}</span>
          </div>
          {project.description && (
            <p className="text-[12px] text-muted-foreground/60 mt-0.5">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 text-[13px] shadow-soft">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Task
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground/40 hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEditProject} className="text-[13px]">
                <Pencil className="h-3.5 w-3.5 mr-2 opacity-60" />Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive text-[13px]">
                <Trash2 className="h-3.5 w-3.5 mr-2 opacity-60" />Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && <div className="mb-4 bg-red-500/[0.06] text-red-500 px-3 py-2 rounded-md text-[13px]">{error}</div>}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-8 text-[13px] border-border/60"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Statuses</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
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
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-[13px] border-border/60" />
        </div>

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

        <span className="text-[11px] text-muted-foreground/40 font-medium shrink-0">{tasks.length} tasks</span>
      </div>

      {viewMode === 'kanban' ? (
        <KanbanBoard tasks={tasks} runners={runners} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />
      ) : (
        <TaskListView tasks={tasks} runners={runners} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />
      )}

      {showCreate && <CreateTaskModal projects={allProjects} defaultProjectId={project.id} onSubmit={handleCreateTask} onClose={() => setShowCreate(false)} />}
      {detailTask && <TaskDetailModal task={detailTask} runner={runners.find((r) => r.id === detailTask.runner_id)} onUpdate={handleTaskUpdate} onAssign={() => setAssigningTask(detailTask)} onDelete={() => handleDelete(detailTask.id)} onClose={() => setDetailTask(null)} />}
      {assigningTask && <AssignTaskModal taskKey={assigningTask.task_key} runners={runners} onSubmit={handleAssign} onClose={() => setAssigningTask(null)} />}

      {showEditProject && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowEditProject(false); }}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="text-[15px] font-semibold">Edit Project</DialogTitle>
              <DialogDescription className="text-[13px]">Update the project name and description.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditProject} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Project name" autoFocus required className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Description</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional description..." rows={3} className="resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-muted-foreground/60">Key</Label>
                <Input value={project?.key ?? ''} disabled className="font-mono opacity-50 h-9" />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setShowEditProject(false)}>Cancel</Button>
                <Button type="submit" disabled={!editName.trim()}>Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete project"
        description={`Are you sure you want to delete "${project.name}"? All tasks in this project will be permanently removed.`}
        confirmLabel="Delete project"
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
