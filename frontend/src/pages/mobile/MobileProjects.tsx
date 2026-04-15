import axios from 'axios';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, DEFAULT_PROJECT_ID } from '../../types';
import { fetchProjects, createProject, deleteProject } from '../../api/client';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection, APP_DIALOG_TONE_STYLES } from '@/components/ui/app-dialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getToneStyles } from '@/lib/semanticColors';
import { FolderKanban, Plus, ChevronRight, Trash2, ArrowRight, Sparkles } from 'lucide-react';

export default function MobileProjects() {
  const neutralTone = getToneStyles('neutral');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjectError, setNewProjectError] = useState('');
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const navigate = useNavigate();

  const loadProjects = async () => {
    try {
      setProjects(await fetchProjects());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProjName.trim();
    if (!name) return;
    try {
      const proj = await createProject({ name });
      setShowNewProject(false);
      setNewProjName('');
      setNewProjectError('');
      loadProjects();
      navigate(`/project/${proj.id}`);
    } catch (error) {
      setNewProjectError(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error ?? error.message
          : error instanceof Error ? error.message : 'Failed to create project',
      );
    }
  };

  const closeNewProjectDialog = () => {
    setShowNewProject(false);
    setNewProjName('');
    setNewProjectError('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    await deleteProject(deletingProject.id);
    setDeletingProject(null);
    loadProjects();
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-lg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-foreground">Projects</h1>
            <span className={cn('mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', neutralTone.pill)}>
              {projects.length} projects
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowNewProject(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft active:opacity-90"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Project list */}
      <div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <FolderKanban className="h-10 w-10 text-foreground/10 mb-4" />
            <p className="text-[14px] font-medium text-muted-foreground/80">No projects yet</p>
            <p className="mt-1 mb-5 text-[12px] text-muted-foreground/70">Create your first project</p>
            <Button onClick={() => setShowNewProject(true)} size="sm" className="h-9 rounded-xl text-[13px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Project
            </Button>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="group relative">
              <button
                type="button"
                onClick={() => navigate(`/project/${project.id}`)}
                className="flex w-full items-center gap-3 border-b border-border/40 bg-card px-4 py-3.5 text-left active:bg-muted/50 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-foreground/[0.03]">
                  <FolderKanban className="h-4 w-4 text-primary/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-foreground truncate">{project.name}</p>
                  {project.description && (
                    <p className="mt-0.5 text-[12px] text-muted-foreground/75 truncate">{project.description}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              </button>

              {project.id !== DEFAULT_PROJECT_ID && (
                <button
                  type="button"
                  onClick={() => setDeletingProject(project)}
                  className="absolute right-14 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/50 active:text-destructive"
                  aria-label={`Delete ${project.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={(open) => { if (!open) closeNewProjectDialog(); }}>
        <AppDialogContent className="sm:max-w-[440px]">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Create a new project</DialogTitle>
            <DialogDescription className="sr-only">Create a project with a unique name.</DialogDescription>
            <AppDialogEyebrow>
              <Sparkles className="h-3 w-3" />
              New Project
            </AppDialogEyebrow>
            <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">Create a new project</h2>
          </AppDialogHeader>
          <form onSubmit={handleCreateProject} className="flex flex-col">
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <Label className={cn('mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>Project Name</Label>
                <Input
                  value={newProjName}
                  onChange={(e) => { setNewProjName(e.target.value); if (newProjectError) setNewProjectError(''); }}
                  placeholder="My Project"
                  autoFocus
                  required
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {newProjectError && (
                  <p className="mt-2 text-[11px] text-destructive/85">{newProjectError}</p>
                )}
              </AppDialogSection>
            </AppDialogBody>
            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={closeNewProjectDialog} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">Cancel</Button>
                <Button type="submit" disabled={!newProjName.trim()} className="rounded-full px-4 text-[11px]">
                  Create project
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </AppDialogFooter>
          </form>
        </AppDialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingProject}
        title="Delete project"
        description={`Are you sure you want to delete "${deletingProject?.name}"? All tasks in this project will be permanently removed.`}
        confirmLabel="Delete project"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingProject(null)}
      />
    </div>
  );
}
