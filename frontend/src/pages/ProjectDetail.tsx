import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, Project, Runner, Label as LabelType, TaskStatus, DEFAULT_PROJECT_ID } from '../types';
import {
  fetchTasks, fetchRunners, fetchLabels, createTask, assignTask, deleteTask, getTask, updateTask,
  fetchProjects, updateProject, deleteProject,
} from '../api/client';
import TaskListView from '../components/tasks/TaskListView';
import KanbanBoard from '../components/tasks/KanbanBoard';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import AssignTaskModal from '../components/tasks/AssignTaskModal';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection, APP_DIALOG_TONE_STYLES } from '@/components/ui/app-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { FolderOpen, Plus, MoreHorizontal, Pencil, Trash2, LayoutGrid, List, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToneStyles } from '@/lib/semanticColors';

export default function ProjectDetail() {
  const neutralTone = getToneStyles('neutral');
  const dangerTone = getToneStyles('danger');

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [allLabels, setAllLabels] = useState<LabelType[]>([]);
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

      const [t, ps, r, l] = await Promise.all([fetchTasks(filters), fetchProjects(), fetchRunners(), fetchLabels()]);
      const proj = ps.find((p) => p.id === id);
      if (!proj) { setError('Project not found'); setLoading(false); return; }
      setProject(proj); setAllProjects(ps); setTasks(t); setRunners(r); setAllLabels(l); setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter, priorityFilter, runnerFilter, search]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);
  useEffect(() => { const iv = setInterval(loadData, 10_000); return () => clearInterval(iv); }, [loadData]);

  const handleCreateTask = async (data: Parameters<typeof createTask>[0]) => { await createTask(data); setShowCreate(false); loadData(); };
  const handleAssign = async (data: Parameters<typeof assignTask>[1]) => { if (!assigningTask) return; await assignTask(assigningTask.id, data); setAssigningTask(null); setDetailTask(null); loadData(); };
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
    catch (e) {
      setError(
        axios.isAxiosError<{ error?: string }>(e)
          ? e.response?.data?.error ?? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to update project',
      );
    }
  };
  const handleDeleteProject = async () => {
    if (!project) return;
    try { await deleteProject(project.id); setShowDeleteConfirm(false); navigate('/inbox'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete project'); setShowDeleteConfirm(false); }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-5 motion-section" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
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
    <div className={cn('flex flex-col p-6', viewMode === 'kanban' ? 'h-screen min-h-0 overflow-hidden' : 'min-h-screen')}>
      {/* Header */}
      <div className="motion-section mb-6 flex shrink-0 flex-wrap items-center justify-between gap-3" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
        <div>
          <PageTitle icon={FolderOpen} title={project.name} />
          {project.description && (
            <p className="mt-1.5 text-[12px] text-muted-foreground/85">{project.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', neutralTone.pill)}>{tasks.length} scoped tasks</span>
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', neutralTone.pill)}>{runners.length} runner options</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 text-[13px] shadow-soft">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Task
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEditProject} className="text-[13px]">
                <Pencil className="h-3.5 w-3.5 mr-2 opacity-60" />Edit Project
              </DropdownMenuItem>
              {project.id !== DEFAULT_PROJECT_ID && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive text-[13px]">
                    <Trash2 className="h-3.5 w-3.5 mr-2 opacity-60" />Delete Project
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && <div className={cn('mb-4 rounded-md px-3 py-2 text-[13px] ring-1', dangerTone.panel, dangerTone.text)}>{error}</div>}

      {/* Filters */}
      <div className="motion-section mb-6 flex shrink-0 flex-wrap items-center gap-2" style={{ '--motion-delay': '140ms' } as React.CSSProperties}>
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
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/65" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-[13px] border-border/60" />
        </div>

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

        <span className="shrink-0 text-[11px] font-medium text-muted-foreground/70">{tasks.length} tasks</span>
      </div>

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

      <CreateTaskModal open={showCreate} projects={allProjects} defaultProjectId={project.id} onSubmit={handleCreateTask} onClose={() => setShowCreate(false)} />
      {detailTask && <TaskDetailModal open={!!detailTask} task={detailTask} runner={runners.find((r) => r.id === detailTask.runner_id)} onUpdate={handleTaskUpdate} onAssign={() => setAssigningTask(detailTask)} onDelete={() => handleDelete(detailTask.id)} onClose={() => setDetailTask(null)} />}
      {assigningTask && <AssignTaskModal open={!!assigningTask} task={assigningTask} runners={runners} onSubmit={handleAssign} onClose={() => setAssigningTask(null)} />}

      <Dialog open={showEditProject} onOpenChange={(open) => { if (!open) setShowEditProject(false); }}>
          <AppDialogContent className="sm:max-w-[460px]">
            <AppDialogHeader>
              <DialogTitle className="sr-only">Edit project</DialogTitle>
              <DialogDescription className="sr-only">Update the project name and description.</DialogDescription>
              <AppDialogEyebrow>
                <Pencil className="h-3 w-3" />
                Project settings
              </AppDialogEyebrow>
              <div className="hidden flex-wrap items-end justify-between gap-3 sm:flex">
                <div className="min-w-0">
                  <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">Edit {project.name}</h2>
                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground/85">Project names must stay unique. Renaming a project updates its task references too.</p>
                </div>
              </div>
            </AppDialogHeader>
            <form onSubmit={handleEditProject} className="flex flex-col gap-4">
              <AppDialogBody>
                <AppDialogSection tone="primary">
                  <Label className={cn('mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>Project Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Project name" autoFocus required className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0" />
                </AppDialogSection>
                <AppDialogSection>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Description</Label>
                    <span className="text-[10px] text-muted-foreground/75">{editDescription.trim().length} chars</span>
                  </div>
                  <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional description..." rows={3} className="min-h-[92px] resize-none border-0 bg-transparent px-0 py-0 text-[13px] leading-6 shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0" />
                </AppDialogSection>
              </AppDialogBody>
              <AppDialogFooter>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowEditProject(false)} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">Cancel</Button>
                  <Button type="submit" disabled={!editName.trim()} className="rounded-full px-4 text-[11px]">Save changes</Button>
                </div>
              </AppDialogFooter>
            </form>
          </AppDialogContent>
        </Dialog>

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
