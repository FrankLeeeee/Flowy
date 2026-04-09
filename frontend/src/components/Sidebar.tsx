import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { fetchProjects, createProject, deleteProject } from '../api/client';
import { Project } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import ConfirmDialog from './ConfirmDialog';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme';
import {
  Inbox, FolderKanban, Bot,
  Plus, ChevronRight, Trash2,
  Sun, Moon, Monitor,
  ArrowRight, Sparkles,
} from 'lucide-react';

export default function Sidebar() {
  const { theme, setTheme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjKey, setNewProjKey] = useState('');
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const navigate = useNavigate();

  const loadProjects = async () => {
    try {
      setProjects(await fetchProjects());
    } catch { /* ignore */ }
  };

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    const iv = setInterval(loadProjects, 10_000);
    return () => clearInterval(iv);
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjKey) return;
    const proj = await createProject({ name: newProjName, key: newProjKey });
    setShowNewProject(false);
    setNewProjName('');
    setNewProjKey('');
    loadProjects();
    navigate(`/project/${proj.id}`);
  };

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingProject(project);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    await deleteProject(deletingProject.id);
    setDeletingProject(null);
    loadProjects();
    navigate('/inbox');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'interactive-lift flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium w-full motion-safe:hover:translate-x-0.5',
      isActive
        ? 'bg-primary/[0.085] text-foreground'
        : 'text-muted-foreground/90 hover:text-foreground hover:bg-primary/[0.04]'
    );

  return (
    <>
      <aside className="motion-section w-[220px] bg-sidebar flex flex-col h-screen sticky top-0 border-r border-border/70" style={{ '--motion-delay': '40ms' } as React.CSSProperties}>
        {/* Logo */}
        <div className="h-[60px] px-4 flex items-center shrink-0 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <img
              src="/flowy-icon.svg"
              alt="Flowy"
              className="h-8 w-8 rounded-[11px] ring-1 ring-primary/12"
            />
            <div className="flex min-w-0 items-center">
              <span className="block pt-[1px] font-semibold tracking-[-0.01em] text-[16px] leading-none text-foreground">Flowy</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          <nav className="flex flex-col gap-0.5 pb-3">
            {/* Inbox */}
            <NavLink to="/inbox" className={navLinkClass}>
              <Inbox className="h-4 w-4 shrink-0 opacity-60" />
              Inbox
            </NavLink>

            {/* Projects section */}
            <div className="mt-5">
              <div className="mb-1 flex items-center gap-1 px-2.5">
                <button
                  type="button"
                  onClick={() => setProjectsOpen((v) => !v)}
                  className="interactive-lift flex min-w-0 flex-1 items-center gap-1 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground/85 hover:text-foreground motion-safe:hover:translate-x-0.5"
                >
                  <ChevronRight className={cn('h-3 w-3 transition-transform duration-200 ease-[var(--ease-out-quart)]', projectsOpen && 'rotate-90')} />
                  Projects
                </button>
                <button
                  type="button"
                  className="interactive-lift rounded-md border-2 border-primary/35 bg-background p-1 text-primary/85 hover:border-primary/55 hover:bg-primary/8 hover:text-primary motion-safe:hover:-translate-y-0.5"
                  onClick={() => setShowNewProject(true)}
                  aria-label="Create project"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div
                className={cn(
                  'grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-quart)]',
                  projectsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-70',
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    {projects.map((p) => (
                      <div key={p.id} className="group relative">
                        <NavLink
                          to={`/project/${p.id}`}
                          className={(props) => cn(navLinkClass(props), 'pl-5 pr-8')}
                        >
                          <FolderKanban className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          <span className="truncate flex-1">{p.name}</span>
                          <span className="text-[10px] font-mono tracking-wide text-muted-foreground/75">{p.key}</span>
                        </NavLink>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(p, e)}
                          className="interactive-lift absolute right-2 top-1/2 -mr-0.5 -translate-y-1/2 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:text-destructive motion-safe:hover:scale-110"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <p className="px-5 py-2 text-[11px] text-muted-foreground/75">No projects yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom section */}
            <div className="mt-5 flex flex-col gap-0.5">
              <NavLink to="/runners" className={navLinkClass}>
                <Bot className="h-4 w-4 shrink-0 opacity-60" />
                Runners
              </NavLink>
            </div>

          </nav>
        </ScrollArea>

        {/* Theme toggle — pinned to bottom */}
        <div className="shrink-0 border-t border-border/60 px-3 py-3">
          <div className="flex items-center rounded-lg border border-border/60 bg-background/80 p-0.5">
            {([
              { value: 'light' as const, icon: Sun, label: 'Light' },
              { value: 'system' as const, icon: Monitor, label: 'System' },
              { value: 'dark' as const, icon: Moon, label: 'Dark' },
            ]).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-label={label}
                className={cn(
                  'interactive-lift flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors duration-150',
                  theme === value
                    ? 'bg-primary/10 text-primary shadow-soft'
                    : 'text-muted-foreground/75 hover:text-foreground'
                )}
              >
                <Icon className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* New Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={(open) => { if (!open) setShowNewProject(false); }}>
        <DialogContent className="overflow-hidden border-border/40 bg-card p-0 shadow-float sm:max-w-[440px]">
          <DialogHeader className="border-b border-border/40 bg-primary/[0.06] px-6 pb-4 pt-5">
            <DialogTitle className="sr-only">Create a new project</DialogTitle>
            <DialogDescription className="sr-only">Create a project with a name and key.</DialogDescription>
            <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary ring-1 ring-primary/10">
              <Sparkles className="h-3 w-3" />
              New Project
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">Create a new project</h2>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="flex flex-col">
            <div className="space-y-3 px-6 py-4">
              <div className="rounded-[18px] border border-primary/10 bg-primary/[0.03] px-4 py-3">
                <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/70">Project Name</Label>
                <Input
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="My Project"
                  autoFocus
                  required
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              <div className="rounded-[18px] border border-border/60 bg-background/90 px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Project Key</Label>
                  <span className="text-[10px] text-muted-foreground/75">{newProjKey.length}/6 chars</span>
                </div>
                <Input
                  value={newProjKey}
                  onChange={(e) => setNewProjKey(e.target.value.toUpperCase())}
                  className="h-auto border-0 bg-transparent px-0 py-0 font-mono text-[16px] font-semibold uppercase tracking-[0.16em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="PROJ"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border/40 px-6 py-3 sm:justify-between sm:space-x-0">
              <div className="text-[11px] text-muted-foreground/80">
                {newProjName.trim() && newProjKey.length >= 2 ? 'Ready to create.' : 'Add a name and short key to continue.'}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowNewProject(false)} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">
                  Cancel
                </Button>
                <Button type="submit" disabled={!newProjName || newProjKey.length < 2} className="rounded-full px-4 text-[11px]">
                  Create project
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingProject}
        title="Delete project"
        description={`Are you sure you want to delete "${deletingProject?.name}"? All tasks in this project will be permanently removed.`}
        confirmLabel="Delete project"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingProject(null)}
      />
    </>
  );
}
