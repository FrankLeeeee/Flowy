import { useState } from 'react';
import { Task, Project } from '../../types';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection } from '@/components/ui/app-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FolderInput } from 'lucide-react';

export default function MoveTaskModal({
  open, task, projects, onSubmit, onClose,
}: {
  open: boolean;
  task: Task;
  projects: Project[];
  onSubmit: (projectId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [projectId, setProjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const otherProjects = projects.filter((p) => p.id !== task.project_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSubmitting(true);
    try {
      await onSubmit(projectId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <AppDialogContent className="sm:max-w-[420px]">
        <AppDialogHeader>
          <DialogTitle className="sr-only">Move {task.task_key}</DialogTitle>
          <DialogDescription className="sr-only">Move this task to a different project.</DialogDescription>
          <AppDialogEyebrow>
            <FolderInput className="h-3 w-3" />
            Move task
          </AppDialogEyebrow>
          <div className="hidden flex-wrap items-end justify-between gap-3 sm:flex">
            <div className="min-w-0">
              <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">Move {task.task_key}</h2>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground/85">
                Select a destination project. The task will receive a new task key in that project.
              </p>
            </div>
          </div>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AppDialogBody>
            <AppDialogSection tone="primary" className="space-y-3">
              <div className="max-w-full rounded-full bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground/85 ring-1 ring-primary/10 shadow-soft">
                <span className="block truncate">{task.title}</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Destination project</Label>
                <Select value={projectId || undefined} onValueChange={setProjectId}>
                  <SelectTrigger className="h-9 rounded-xl border-border/60 bg-card px-3 text-[13px] shadow-soft focus:ring-2 focus:ring-ring focus:ring-offset-0">
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                    {otherProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="rounded-lg py-2 text-[11px]">
                        {p.name}
                      </SelectItem>
                    ))}
                    {otherProjects.length === 0 && (
                      <div className="px-3 py-2 text-[13px] text-muted-foreground/75">No other projects available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </AppDialogSection>
          </AppDialogBody>

          <AppDialogFooter>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!projectId || submitting}
                className="rounded-full px-4 text-[11px]"
              >
                Move task
              </Button>
            </div>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}
