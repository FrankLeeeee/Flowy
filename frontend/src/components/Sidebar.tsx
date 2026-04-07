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
import {
  Inbox, FolderKanban, Bot,
  Plus, ChevronRight, Trash2,
} from 'lucide-react';

export default function Sidebar() {
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
      'flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-all duration-150 w-full',
      isActive
        ? 'bg-foreground/[0.06] text-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
    );

  return (
    <>
      <aside className="w-[220px] bg-sidebar flex flex-col h-screen sticky top-0 border-r border-transparent">
        {/* Logo */}
        <div className="h-[52px] px-4 flex items-center shrink-0">
          <span className="font-semibold tracking-[-0.01em] text-[15px] text-foreground">Flowy</span>
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
              <button
                onClick={() => setProjectsOpen((v) => !v)}
                className="flex items-center gap-1 px-2.5 mb-1 w-full text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground/70 hover:text-muted-foreground transition-colors duration-150"
              >
                <ChevronRight className={cn('h-3 w-3 transition-transform duration-150', projectsOpen && 'rotate-90')} />
                Projects
                <button
                  className="ml-auto p-0.5 rounded hover:bg-foreground/[0.06] transition-colors duration-150"
                  onClick={(e) => { e.stopPropagation(); setShowNewProject(true); }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </button>

              {projectsOpen && (
                <div className="flex flex-col gap-0.5">
                  {projects.map((p) => (
                    <NavLink
                      key={p.id}
                      to={`/project/${p.id}`}
                      className={(props) => cn(navLinkClass(props), 'group pl-5')}
                    >
                      <FolderKanban className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      <span className="truncate flex-1">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground/50 font-mono tracking-wide">{p.key}</span>
                      <button
                        onClick={(e) => handleDeleteClick(p, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-all duration-150 -mr-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </NavLink>
                  ))}
                  {projects.length === 0 && (
                    <p className="px-5 py-2 text-[11px] text-muted-foreground/50">No projects yet</p>
                  )}
                </div>
              )}
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
      </aside>

      {/* New Project Dialog */}
      {showNewProject && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowNewProject(false); }}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="text-[15px] font-semibold">New Project</DialogTitle>
              <DialogDescription className="text-[13px]">Create a project to organize your tasks.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Name</Label>
                <Input value={newProjName} onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="My Project" autoFocus required className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Key (2-6 chars)</Label>
                <Input value={newProjKey} onChange={(e) => setNewProjKey(e.target.value.toUpperCase())}
                  className="font-mono h-9" placeholder="PROJ" maxLength={6} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setShowNewProject(false)}>Cancel</Button>
                <Button type="submit" disabled={!newProjName || newProjKey.length < 2}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

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
