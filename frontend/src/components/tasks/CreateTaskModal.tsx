import { useState } from 'react';
import { Project, TaskPriority } from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Circle, FolderKanban, Tag, ArrowRight, X } from 'lucide-react';

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'none', label: 'No Priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const PRIORITY_STYLES: Record<TaskPriority, { dot: string; tone: string }> = {
  none: { dot: 'bg-slate-300', tone: 'text-foreground/55' },
  low: { dot: 'bg-sky-400', tone: 'text-sky-700' },
  medium: { dot: 'bg-amber-400', tone: 'text-amber-700' },
  high: { dot: 'bg-orange-500', tone: 'text-orange-700' },
  urgent: { dot: 'bg-rose-500', tone: 'text-rose-700' },
};

const LABEL_OPTIONS = ['Bug', 'Feature', 'Improvement', 'Documentation', 'Design'];

export default function CreateTaskModal({
  projects, defaultProjectId, onSubmit, onClose,
}: {
  projects: Project[];
  defaultProjectId?: string;
  onSubmit: (data: { projectId: string; title: string; description: string; priority: TaskPriority; labels: string[] }) => void;
  onClose: () => void;
}) {
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [labelsText, setLabelsText] = useState('');

  const labels = labelsText.split(',').map((label) => label.trim()).filter(Boolean);

  const syncLabels = (nextLabels: string[]) => {
    setLabelsText(nextLabels.join(', '));
  };

  const toggleLabel = (label: string) => {
    const exists = labels.some((item) => item.toLowerCase() === label.toLowerCase());
    syncLabels(exists ? labels.filter((item) => item.toLowerCase() !== label.toLowerCase()) : [...labels, label]);
  };

  const removeLabel = (label: string) => {
    syncLabels(labels.filter((item) => item !== label));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !title.trim()) return;
    onSubmit({ projectId, title: title.trim(), description, priority, labels });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="overflow-hidden border-border/80 bg-card p-0 shadow-soft sm:max-w-xl">
        <DialogHeader className="border-b border-border/40 px-5 pb-3 pt-4">
          <DialogTitle className="sr-only">New Task</DialogTitle>
          <DialogDescription className="sr-only">Create a new task.</DialogDescription>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground/70">
            <Circle className="h-3.5 w-3.5" />
            <span>New Task</span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-4 px-5 py-4">
            <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                autoFocus
                required
                className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Add description..."
                className="min-h-[108px] resize-none border-0 bg-transparent px-0 py-0 text-[13px] leading-6 shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <Badge key={label} variant="secondary" className="gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium">
                    {label}
                    <button
                      type="button"
                      onClick={() => removeLabel(label)}
                      className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/40 px-5 py-3">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-border/60 bg-foreground/[0.04] px-3 text-[11px] font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id} className="rounded-lg py-2 text-[11px]">
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
              <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-border/60 bg-foreground/[0.04] px-3 text-[11px] font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                <span className={cn('h-2 w-2 rounded-full', PRIORITY_STYLES[priority].dot)} />
                <SelectValue>
                  {PRIORITIES.find((item) => item.value === priority)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                {PRIORITIES.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="rounded-lg py-2 pl-8 pr-3 text-[11px] font-medium">
                    <span className={cn('inline-flex items-center gap-2', PRIORITY_STYLES[item.value].tone)}>
                      <span className={cn('h-2 w-2 rounded-full', PRIORITY_STYLES[item.value].dot)} />
                      {item.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-8 gap-2 rounded-full border-border/60 bg-foreground/[0.04] px-3 text-[11px] font-medium shadow-none hover:bg-foreground/[0.08]">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  Labels
                  {labels.length > 0 && (
                    <span className="rounded-full bg-foreground/[0.08] px-1.5 py-0.5 text-[10px] text-foreground/70">
                      {labels.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 rounded-xl border-border/60 bg-popover p-1 shadow-none">
                {LABEL_OPTIONS.map((label) => {
                  const selected = labels.some((item) => item.toLowerCase() === label.toLowerCase());
                  return (
                    <DropdownMenuItem
                      key={label}
                      onSelect={(e) => {
                        e.preventDefault();
                        toggleLabel(label);
                      }}
                      className={cn('rounded-lg text-[11px] font-medium', selected && 'bg-accent')}
                    >
                      <span className={cn('mr-2 h-2 w-2 rounded-full border border-border', selected ? 'bg-foreground' : 'bg-transparent')} />
                      {label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <DialogFooter className="border-t border-border/40 px-5 py-3 sm:justify-between sm:space-x-0">
            <div />
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-full px-3.5 text-[11px] text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground">
                Cancel
              </Button>
              <Button type="submit" disabled={!projectId || !title.trim()} className="rounded-full px-4 text-[11px]">
                Create task
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
