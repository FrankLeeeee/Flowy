import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, Project, Runner, Label as LabelType, DEFAULT_PROJECT_ID } from '../../types';
import {
  fetchTasks, fetchRunners, fetchLabels, createTask, assignTask, deleteTask, getTask,
  fetchProjects, updateProject, deleteProject,
} from '../../api/client';
import MobileTaskList from '@/components/mobile/MobileTaskList';
import MobileFilterSheet from '@/components/mobile/MobileFilterSheet';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import AssignTaskModal from '@/components/tasks/AssignTaskModal';
import TaskDetailModal from '@/components/tasks/TaskDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection, APP_DIALOG_TONE_STYLES } from '@/components/ui/app-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getToneStyles } from '@/lib/semanticColors';
import { ArrowLeft, Plus, SlidersHorizontal, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export default function MobileProjectDetail() {
  const neutralTone = getToneStyles('neutral');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [allLabels, setAllLabels] = useState<LabelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('_all');
  const [priorityFilter, setPriorityFilter] = useState('_all');
  const [runnerFilter, setRunnerFilter] = useState('_all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasActiveFilters = statusFilter !== '_all' || priorityFilter !== '_all' || runnerFilter !== '_all' || search !== '';

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

  const openEditProject = () => { if (!project) return; setEditName(project.name); setEditDescription(project.description ?? ''); setShowEditProject(true); };
  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault(); if (!project || !editName.trim()) return;
    try {
      const updated = await updateProject(project.id, { name: editName.trim(), description: editDescription.trim() });
      setProject(updated); setShowEditProject(false);
    } catch (e) {
      setError(
        axios.isAxiosError<{ error?: string }>(e)
          ? e.response?.data?.error ?? e.message
          : e instanceof Error ? e.message : 'Failed to update project',
      );
    }
  };
  const handleDeleteProject = async () => {
    if (!project) return;
    try { await deleteProject(project.id); setShowDeleteConfirm(false); navigate('/projects'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete project'); setShowDeleteConfirm(false); }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4 text-center py-20">
        <p className="text-[14px] text-muted-foreground/80">Project not found</p>
        <Button variant="link" onClick={() => navigate('/projects')} className="mt-2 text-[13px] text-primary">Back to Projects</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-lg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 active:bg-muted/50"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[16px] font-bold tracking-tight text-foreground truncate">{project.name}</h1>
              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', neutralTone.pill)}>
                {tasks.length} tasks
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className={cn(
                'relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 transition-colors active:bg-muted/50',
                hasActiveFilters && 'border-primary/40 bg-primary/5',
              )}
            >
              <SlidersHorizontal className={cn('h-4 w-4', hasActiveFilters ? 'text-primary' : 'text-muted-foreground')} />
              {hasActiveFilters && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft active:opacity-90"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 active:bg-muted/50">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
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
      </div>

      {error && <div className="mx-4 mt-3 rounded-xl px-3 py-2 text-[13px] text-destructive bg-destructive/10 ring-1 ring-destructive/15">{error}</div>}

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
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        showStatus
      />

      {/* Modals */}
      <CreateTaskModal open={showCreate} projects={allProjects} defaultProjectId={project.id} onSubmit={handleCreateTask} onClose={() => setShowCreate(false)} />
      {detailTask && <TaskDetailModal open={!!detailTask} task={detailTask} runner={runners.find((r) => r.id === detailTask.runner_id)} onUpdate={handleTaskUpdate} onAssign={() => setAssigningTask(detailTask)} onDelete={() => handleDelete(detailTask.id)} onClose={() => setDetailTask(null)} />}
      {assigningTask && <AssignTaskModal open={!!assigningTask} task={assigningTask} runners={runners} onSubmit={handleAssign} onClose={() => setAssigningTask(null)} />}

      {/* Edit Project Dialog */}
      <Dialog open={showEditProject} onOpenChange={(open) => { if (!open) setShowEditProject(false); }}>
        <AppDialogContent className="sm:max-w-[460px]">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Edit project</DialogTitle>
            <DialogDescription className="sr-only">Update the project name and description.</DialogDescription>
            <AppDialogEyebrow><Pencil className="h-3 w-3" /> Project settings</AppDialogEyebrow>
            <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">Edit {project.name}</h2>
          </AppDialogHeader>
          <form onSubmit={handleEditProject} className="flex flex-col gap-4">
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <Label className={cn('mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>Project Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Project name" autoFocus required className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0" />
              </AppDialogSection>
              <AppDialogSection>
                <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Description</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional description..." rows={3} className="min-h-[92px] resize-none border-0 bg-transparent px-0 py-0 text-[13px] leading-6 shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0" />
              </AppDialogSection>
            </AppDialogBody>
            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowEditProject(false)} className="rounded-full px-3.5 text-[11px]">Cancel</Button>
                <Button type="submit" disabled={!editName.trim()} className="rounded-full px-4 text-[11px]">Save changes</Button>
              </div>
            </AppDialogFooter>
          </form>
        </AppDialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete project"
        description={`Are you sure you want to delete "${project.name}"? All tasks will be permanently removed.`}
        confirmLabel="Delete project"
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
