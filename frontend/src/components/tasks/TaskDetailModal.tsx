import { useState, useEffect, useCallback } from 'react';
import { Task, TaskLog, Runner, TaskStatus, TaskPriority, AiProvider } from '../../types';
import { fetchTaskLogs, updateTask } from '../../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import RunnerStatusBadge from '../runners/RunnerStatusBadge';
import { cn } from '@/lib/utils';
import { getHarnessConfigBadges, parseHarnessConfig } from '../../lib/harnessConfig';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Pencil, UserPlus, Trash2, Circle, CheckCircle2, XCircle, Clock, Archive, Download, AlertTriangle, Tag, ArrowRight, X, Expand } from 'lucide-react';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'failed', label: 'Failed' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'none', label: 'No Priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const LABEL_OPTIONS = ['Bug', 'Feature', 'Improvement', 'Documentation', 'Design'];

const PRIORITY_STYLES: Record<TaskPriority, { dot: string; tone: string }> = {
  none: { dot: 'bg-slate-300 dark:bg-slate-600', tone: 'text-foreground/55' },
  low: { dot: 'bg-sky-400', tone: 'text-sky-700 dark:text-sky-400' },
  medium: { dot: 'bg-amber-400', tone: 'text-amber-700 dark:text-amber-400' },
  high: { dot: 'bg-orange-500', tone: 'text-orange-700 dark:text-orange-400' },
  urgent: { dot: 'bg-rose-500', tone: 'text-rose-700 dark:text-rose-400' },
};

const STATUS_DOTS: Record<TaskStatus, string> = {
  backlog: 'bg-zinc-400 dark:bg-zinc-500',
  todo: 'bg-zinc-500 dark:bg-zinc-400',
  in_progress: 'bg-yellow-500',
  failed: 'bg-red-500',
  done: 'bg-emerald-500',
  cancelled: 'bg-zinc-300 dark:bg-zinc-600',
};

const STATUS_ICON: Record<TaskStatus, { icon: React.ReactNode; color: string }> = {
  backlog:     { icon: <Archive className="h-3.5 w-3.5" />,      color: 'text-foreground/30' },
  todo:        { icon: <Circle className="h-3.5 w-3.5" />,       color: 'text-foreground/40' },
  in_progress: { icon: <Clock className="h-3.5 w-3.5" />,        color: 'text-yellow-500' },
  failed:      { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-red-500' },
  done:        { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-emerald-500' },
  cancelled:   { icon: <XCircle className="h-3.5 w-3.5" />,      color: 'text-foreground/25' },
};

const AI_LABELS: Record<AiProvider, string> = {
  'claude-code': 'Claude Code', codex: 'Codex', 'cursor-agent': 'Cursor Agent',
};

const TERMINAL_STATUSES: TaskStatus[] = ['done', 'failed', 'cancelled'];

const OUTPUT_MARKDOWN_CLASSNAME = `rounded-lg border border-border/60 bg-foreground/[0.02] p-4 text-[13px] leading-relaxed prose prose-sm prose-neutral dark:prose-invert max-w-none
  prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
  prose-h1:text-[16px] prose-h2:text-[15px] prose-h3:text-[14px]
  prose-p:text-muted-foreground prose-p:my-1.5
  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
  prose-strong:text-foreground prose-strong:font-semibold
  prose-code:text-[12px] prose-code:font-mono prose-code:bg-foreground/[0.06] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
  prose-pre:bg-[#16161a] prose-pre:text-gray-300 prose-pre:rounded-lg prose-pre:text-[12px] prose-pre:leading-relaxed
  prose-li:text-muted-foreground prose-li:my-0.5
  prose-ul:my-1.5 prose-ol:my-1.5
  prose-table:text-[12px] prose-th:text-foreground prose-th:font-medium prose-td:text-muted-foreground
  prose-hr:border-border/40
  prose-blockquote:border-border/60 prose-blockquote:text-muted-foreground/70`;

function fmtTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso + 'Z').toLocaleString();
}

export default function TaskDetailModal({
  open, task, runner, onUpdate, onAssign, onDelete, onClose,
}: {
  open: boolean;
  task: Task;
  runner?: Runner;
  onUpdate: (t: Task) => void;
  onAssign: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [labelsText, setLabelsText] = useState<string>(task.labels ? (JSON.parse(task.labels || '[]') as string[]).join(', ') : '');
  const [outputFullscreenOpen, setOutputFullscreenOpen] = useState(false);

  const loadLogs = useCallback(async () => {
    try { setLogs(await fetchTaskLogs(task.id)); } catch { /* ignore */ }
  }, [task.id]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  useEffect(() => {
    if (task.status !== 'in_progress') return;
    const iv = setInterval(loadLogs, 5000);
    return () => clearInterval(iv);
  }, [task.status, loadLogs]);

  const handleSave = async () => {
    const nextLabels = labelsText.split(',').map((label: string) => label.trim()).filter(Boolean);
    const updated = await updateTask(task.id, { title, description, status, priority, labels: nextLabels });
    onUpdate(updated);
    setEditing(false);
  };

  const labels: string[] = editing
    ? labelsText.split(',').map((label: string) => label.trim()).filter(Boolean)
    : JSON.parse(task.labels || '[]');
  const statusConfig = STATUS_ICON[task.status];
  const output = task.output?.trim() ?? '';
  const hasOutput = output.length > 0;
  const canViewFullscreenOutput = hasOutput && TERMINAL_STATUSES.includes(task.status);
  const harnessConfigBadges = getHarnessConfigBadges(task.ai_provider, parseHarnessConfig(task.harness_config));

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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-5 border-b border-border/40">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-mono tracking-wide text-muted-foreground/75">{task.task_key}</span>
            <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', statusConfig.color)}>
              {statusConfig.icon}
              {STATUS_OPTIONS.find((s) => s.value === task.status)?.label}
            </span>
            {task.priority !== 'none' && (
              <span className="text-[11px] font-medium text-muted-foreground capitalize">
                {task.priority}
              </span>
            )}
          </div>
          <DialogTitle className="sr-only">{task.task_key} Details</DialogTitle>
          <DialogDescription className="sr-only">View and edit task details</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-5 px-6 py-5">
          {/* Title & Description */}
          {editing ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
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

              <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                  <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-border/60 bg-foreground/[0.04] px-3 text-[11px] font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                    <span className={cn('h-2 w-2 rounded-full', STATUS_DOTS[status])} />
                    <SelectValue>
                      {STATUS_OPTIONS.find((item) => item.value === status)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                    {STATUS_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="rounded-lg py-2 pl-8 pr-3 text-[11px] font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', STATUS_DOTS[item.value])} />
                          {item.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                  <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-border/60 bg-foreground/[0.04] px-3 text-[11px] font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                    <span className={cn('h-2 w-2 rounded-full', PRIORITY_STYLES[priority].dot)} />
                    <SelectValue>
                      {PRIORITY_OPTIONS.find((item) => item.value === priority)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                    {PRIORITY_OPTIONS.map((item) => (
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

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} className="h-8 rounded-full px-4 text-[11px]">
                  Save changes
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 rounded-full px-3.5 text-[11px] text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground" onClick={() => {
                  setEditing(false); setTitle(task.title); setDescription(task.description);
                  setStatus(task.status); setPriority(task.priority); setLabelsText(JSON.parse(task.labels || '[]').join(', '));
                }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-[15px] font-semibold text-foreground leading-snug">{task.title}</h2>
              {task.description && (
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground/90">{task.description}</p>
              )}
            </div>
          )}

          {/* Labels */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {labels.map((l) => (
                <span key={l} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-foreground/[0.05] text-muted-foreground">{l}</span>
              ))}
            </div>
          )}

          {/* Runner Info */}
          <div className="bg-foreground/[0.02] border border-border/60 rounded-lg p-4">
              <h3 className="mb-2 text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground/85">Runner Assignment</h3>
            {runner ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-foreground">{runner.name}</span>
                  <RunnerStatusBadge status={runner.status} />
                  {task.ai_provider && (
                    <span className="text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {AI_LABELS[task.ai_provider] ?? task.ai_provider}
                    </span>
                  )}
                </div>
                {harnessConfigBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {harnessConfigBadges.map((badge) => (
                      <span key={badge} className="inline-flex items-center rounded-full bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border/60">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground/75">Not assigned</p>
            )}
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground/75">
            <div>Created: {fmtTime(task.created_at)}</div>
            <div>Updated: {fmtTime(task.updated_at)}</div>
            {task.started_at && <div>Started: {fmtTime(task.started_at)}</div>}
            {task.completed_at && <div>Completed: {fmtTime(task.completed_at)}</div>}
          </div>

          {/* Output */}
          {hasOutput && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground/85">Output</h3>
                <div className="flex items-center gap-3">
                  {canViewFullscreenOutput && (
                    <button
                      type="button"
                      onClick={() => setOutputFullscreenOpen(true)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground/75 transition-colors duration-150 hover:text-foreground"
                    >
                      <Expand className="h-3 w-3" />
                      Full screen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([output], { type: 'text/markdown;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${task.task_key}-output.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground/75 transition-colors duration-150 hover:text-foreground"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                </div>
              </div>
              <ScrollArea className="h-64">
                <div className={OUTPUT_MARKDOWN_CLASSNAME}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground/85">Execution Logs</h3>
              <ScrollArea className="h-40">
                <div className="space-y-1">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-[11px]">
                      <span className="whitespace-nowrap text-muted-foreground/70">{fmtTime(log.created_at)}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-foreground/[0.04] text-muted-foreground">{log.event}</span>
                      {log.data && log.event !== 'output' && (
                        <span className="truncate text-muted-foreground/75">{log.data.slice(0, 100)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        </ScrollArea>

        <div className="flex gap-2 px-6 py-4 border-t border-border/40 bg-background shrink-0">
          {!editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 text-[12px] text-muted-foreground/85 hover:text-foreground">
              <Pencil className="h-3 w-3 mr-1.5" />
              Edit
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onAssign} className="h-7 text-[12px] text-muted-foreground/85 hover:text-foreground">
            <UserPlus className="h-3 w-3 mr-1.5" />
            {runner ? 'Reassign' : 'Assign'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="h-7 text-[12px] ml-auto text-destructive/80 hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3 w-3 mr-1.5" />
            Delete
          </Button>
        </div>
      </DialogContent>

      <Dialog open={outputFullscreenOpen} onOpenChange={setOutputFullscreenOpen}>
        <DialogContent className="h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden border-border/50 bg-background p-0 shadow-float sm:rounded-xl">
          <DialogHeader className="border-b border-border/40 px-6 py-5 pr-14">
            <div className="flex items-center gap-2.5 text-[11px] font-medium text-muted-foreground/75">
              <span className="font-mono tracking-wide">{task.task_key}</span>
              <span className={cn('inline-flex items-center gap-1', statusConfig.color)}>
                {statusConfig.icon}
                {STATUS_OPTIONS.find((item) => item.value === task.status)?.label}
              </span>
            </div>
            <DialogTitle className="mt-2 text-[15px] font-semibold tracking-[-0.02em] text-foreground">
              {task.title}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground/80">
              Full-screen task output
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 bg-muted/20">
            <div className="w-full px-6 py-6">
              <div className={cn(OUTPUT_MARKDOWN_CLASSNAME, 'min-h-full bg-background shadow-soft')}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
