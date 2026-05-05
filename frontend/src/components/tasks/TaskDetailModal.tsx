import { useState, useEffect, useCallback } from 'react';
import { Task, TaskLog, Runner, TaskStatus, TaskPriority, Label, AiProvider, HarnessConfig } from '../../types';
import { fetchTaskLogs, updateTask, fetchLabels, runTask, assignTask } from '../../api/client';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection } from '@/components/ui/app-dialog';
import LabelPicker from '@/components/LabelPicker';
import RunnerStatusBadge from '../runners/RunnerStatusBadge';
import RunnerAssignmentFields from './RunnerAssignmentFields';
import { cn } from '@/lib/utils';
import { formatTaskSchedule } from '@/lib/taskSchedule';
import { getAiProviderStyles, getLabelColorStyles, getTaskPriorityStyles, getTaskStatusStyles } from '@/lib/semanticColors';
import { getHarnessConfigBadges, parseHarnessConfig } from '../../lib/harnessConfig';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { STATUS_CONFIG, AI_LABELS, TASK_STATUSES } from '../../lib/taskConstants';
import { CalendarDays, Clock3, Pencil, Trash2, Download, ArrowRight, X, Expand, Play, RotateCcw } from 'lucide-react';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = TASK_STATUSES.map((value) => ({
  value,
  label: STATUS_CONFIG[value].label,
}));

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'none',   label: 'No Priority' },
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const TERMINAL_STATUSES: TaskStatus[] = ['done', 'failed', 'cancelled'];

const OUTPUT_MARKDOWN_CLASSNAME = `min-w-0 max-w-full overflow-hidden rounded-lg border border-border/60 bg-foreground/[0.02] p-4 text-[13px] leading-relaxed break-words [overflow-wrap:anywhere] prose prose-sm prose-neutral dark:prose-invert max-w-none
  prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
  prose-h1:text-[16px] prose-h2:text-[15px] prose-h3:text-[14px]
  prose-p:text-muted-foreground prose-p:my-1.5 prose-p:max-w-full
  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
  prose-strong:text-foreground prose-strong:font-semibold
  prose-code:max-w-full prose-code:break-words prose-code:text-[12px] prose-code:font-mono prose-code:bg-foreground/[0.06] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
  prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:bg-[hsl(var(--terminal))] prose-pre:text-[hsl(var(--terminal-foreground))] prose-pre:shadow-[inset_0_0_0_1px_hsl(var(--terminal-border)/0.55)] prose-pre:rounded-lg prose-pre:text-[12px] prose-pre:leading-relaxed
  prose-li:text-muted-foreground prose-li:my-0.5 prose-li:max-w-full
  prose-ul:my-1.5 prose-ol:my-1.5
  prose-table:block prose-table:max-w-full prose-table:overflow-x-auto prose-table:text-[12px] prose-th:text-foreground prose-th:font-medium prose-td:text-muted-foreground
  prose-hr:border-border/40
  prose-blockquote:border-border/60 prose-blockquote:text-muted-foreground/70`;

function fmtTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso + 'Z').toLocaleString();
}

export default function TaskDetailModal({
  open, task, runners, onUpdate, onDelete, onClose,
}: {
  open: boolean;
  task: Task;
  runners: Runner[];
  onUpdate: (t: Task) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const runner = runners.find((r) => r.id === task.runner_id);

  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [scheduledDate, setScheduledDate] = useState(task.scheduled_date);
  const [scheduledTime, setScheduledTime] = useState(task.scheduled_time ?? '');
  const [labelsText, setLabelsText] = useState<string>(task.labels ? (JSON.parse(task.labels || '[]') as string[]).join(', ') : '');
  const [editRunnerId, setEditRunnerId] = useState(task.runner_id ?? '');
  const [editAiProvider, setEditAiProvider] = useState<AiProvider | ''>((task.ai_provider as AiProvider | null) ?? '');
  const [editHarnessConfig, setEditHarnessConfig] = useState<HarnessConfig>(parseHarnessConfig(task.harness_config));
  const [outputFullscreenOpen, setOutputFullscreenOpen] = useState(false);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchLabels().then(setAllLabels).catch(() => {});
  }, []);

  const loadLogs = useCallback(async () => {
    try { setLogs(await fetchTaskLogs(task.id)); } catch { /* ignore */ }
  }, [task.id]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  useEffect(() => {
    if (task.status !== 'in_progress') return;
    const iv = setInterval(loadLogs, 5000);
    return () => clearInterval(iv);
  }, [task.status, loadLogs]);

  const enterEditMode = () => {
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setLabelsText(JSON.parse(task.labels || '[]').join(', '));
    setScheduledDate(task.scheduled_date);
    setScheduledTime(task.scheduled_time ?? '');
    setEditRunnerId(task.runner_id ?? '');
    setEditAiProvider((task.ai_provider as AiProvider | null) ?? '');
    setEditHarnessConfig(parseHarnessConfig(task.harness_config));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!scheduledDate) return;
    const nextLabels = labelsText.split(',').map((label: string) => label.trim()).filter(Boolean);
    let updated = await updateTask(task.id, {
      title, description, status, priority, labels: nextLabels,
      scheduledDate,
      scheduledTime: scheduledTime || null,
    });

    // Handle runner assignment changes separately so we go through the assign endpoint,
    // which validates the runner exists and applies the harness config consistently.
    const runnerChanged = (editRunnerId || null) !== (task.runner_id ?? null);
    const providerChanged = (editAiProvider || null) !== (task.ai_provider ?? null);
    const harnessChanged = JSON.stringify(editHarnessConfig) !== JSON.stringify(parseHarnessConfig(task.harness_config));
    if (editRunnerId && editAiProvider && (runnerChanged || providerChanged || harnessChanged)) {
      updated = await assignTask(task.id, {
        runnerId: editRunnerId,
        aiProvider: editAiProvider,
        harnessConfig: editHarnessConfig,
      });
    } else if (!editRunnerId && task.runner_id) {
      // Runner cleared — null it via the update endpoint.
      updated = await updateTask(task.id, { runnerId: null, aiProvider: null });
    }

    onUpdate(updated);
    setEditing(false);
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const updated = await runTask(task.id);
      onUpdate(updated);
    } finally {
      setRunning(false);
    }
  };

  const labels: string[] = editing
    ? labelsText.split(',').map((label: string) => label.trim()).filter(Boolean)
    : JSON.parse(task.labels || '[]');
  const statusConfig = STATUS_CONFIG[task.status];
  const output = task.output?.trim() ?? '';
  const hasOutput = output.length > 0;
  const canViewFullscreenOutput = hasOutput && TERMINAL_STATUSES.includes(task.status);
  const harnessConfigBadges = getHarnessConfigBadges(task.ai_provider, parseHarnessConfig(task.harness_config));
  const statusStyles = getTaskStatusStyles(task.status);
  const editingStatusStyles = getTaskStatusStyles(status);
  const priorityStyles = getTaskPriorityStyles(task.priority);
  const editingPriorityStyles = getTaskPriorityStyles(priority);

  const canRun = !!task.runner_id && !!task.ai_provider && task.status !== 'in_progress' && task.status !== 'todo';
  const isRerun = TERMINAL_STATUSES.includes(task.status);

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
      <AppDialogContent variant="drawer" className="flex h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.75rem)] max-h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.75rem)] min-w-0 max-w-[100vw] flex-col gap-0 overflow-hidden rounded-none sm:h-full sm:max-h-none sm:min-h-0 sm:max-w-[520px]">
        <AppDialogHeader className="shrink-0">
          <DialogTitle className="sr-only">{task.task_key} Details</DialogTitle>
          <DialogDescription className="sr-only">View and edit task details</DialogDescription>
          <AppDialogEyebrow>{editing ? 'Edit task' : 'Task details'}</AppDialogEyebrow>
          <div className="flex items-center gap-2.5 flex-wrap text-[11px] font-medium">
            <span className="text-[11px] font-mono tracking-wide text-muted-foreground/75">{task.task_key}</span>
            <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', statusStyles.icon)}>
              {statusConfig.icon}
              {STATUS_OPTIONS.find((s) => s.value === task.status)?.label}
            </span>
            {task.priority !== 'none' && (
              <span className={cn('text-[11px] font-medium capitalize', priorityStyles.text)}>
                {task.priority}
              </span>
            )}
          </div>
        </AppDialogHeader>

        <AppDialogBody className="flex min-h-0 flex-1 flex-col space-y-0 overflow-hidden px-0 py-0 sm:px-0 sm:py-0">
          <ScrollArea className="min-h-0 min-w-0 flex-1">
            <div className="flex min-w-0 flex-col gap-5 px-4 py-5 sm:px-6">
          {editing ? (
            <div className="flex flex-col gap-5">
              {/* Title */}
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Description */}
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Add description..."
                  className="min-h-[108px] resize-none border-0 bg-transparent px-0 py-0 text-[13px] leading-6 shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Labels chips with remove */}
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => {
                    const colorStyles = getLabelColorStyles(label, allLabels);
                    return (
                      <Badge key={label} variant="secondary" className={cn('gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ring-1', colorStyles.pill)}>
                        {label}
                        <button
                          type="button"
                          onClick={() => removeLabel(label)}
                          className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Status / Priority / Labels picker */}
              <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                  <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-border/60 bg-foreground/[0.04] px-3 text-[11px] font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                    <span className={cn('h-2 w-2 rounded-full', editingStatusStyles.dot)} />
                    <SelectValue>
                      {STATUS_OPTIONS.find((item) => item.value === status)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                    {STATUS_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="rounded-lg py-2 pl-8 pr-3 text-[11px] font-medium">
                        <span className={cn('inline-flex items-center gap-2', getTaskStatusStyles(item.value).text)}>
                          <span className={cn('h-2 w-2 rounded-full', getTaskStatusStyles(item.value).dot)} />
                          {item.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                  <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-border/60 bg-foreground/[0.04] px-3 text-[11px] font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                    <span className={cn('h-2 w-2 rounded-full', editingPriorityStyles.dot)} />
                    <SelectValue>
                      {PRIORITY_OPTIONS.find((item) => item.value === priority)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                    {PRIORITY_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="rounded-lg py-2 pl-8 pr-3 text-[11px] font-medium">
                        <span className={cn('inline-flex items-center gap-2', getTaskPriorityStyles(item.value).text)}>
                          <span className={cn('h-2 w-2 rounded-full', getTaskPriorityStyles(item.value).dot)} />
                          {item.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-foreground/[0.04] px-3 py-1.5 text-[11px] font-medium shadow-none">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                    className="h-5 w-[118px] border-0 bg-transparent p-0 text-[11px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-foreground/[0.04] px-3 py-1.5 text-[11px] font-medium shadow-none">
                  <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="h-5 w-[78px] border-0 bg-transparent p-0 text-[11px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <LabelPicker
                  selectedLabels={labels}
                  allLabels={allLabels}
                  onToggle={toggleLabel}
                  onLabelsChange={() => fetchLabels().then(setAllLabels).catch(() => {})}
                />
              </div>

              {/* Runner assignment */}
              <div className="border-t border-border/40 pt-4">
                <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground/85">Runner Assignment</h3>
                <RunnerAssignmentFields
                  runners={runners}
                  runnerId={editRunnerId}
                  aiProvider={editAiProvider}
                  harnessConfig={editHarnessConfig}
                  onRunnerIdChange={setEditRunnerId}
                  onAiProviderChange={setEditAiProvider}
                  onHarnessConfigChange={setEditHarnessConfig}
                />
                {editRunnerId && (
                  <button
                    type="button"
                    onClick={() => { setEditRunnerId(''); setEditAiProvider(''); }}
                    className="mt-2 text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    Clear runner assignment
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Title & Description */}
              <div>
                <h2 className="text-[15px] font-semibold text-foreground leading-snug">{task.title}</h2>
                {task.description && (
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground/90">{task.description}</p>
                )}
              </div>

              {/* Labels */}
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((l) => {
                    const colorStyles = getLabelColorStyles(l, allLabels);
                    return (
                      <span key={l} className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1', colorStyles.pill)}>{l}</span>
                    );
                  })}
                </div>
              )}

              <AppDialogSection className="rounded-lg bg-foreground/[0.02] p-4">
                <h3 className="mb-2 text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground/85">Scheduled</h3>
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-foreground">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>{formatTaskSchedule(task.scheduled_date, task.scheduled_time)}</span>
                </div>
              </AppDialogSection>

              {/* Runner Info */}
              <AppDialogSection className="rounded-lg bg-foreground/[0.02] p-4">
                <h3 className="mb-2 text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground/85">Runner Assignment</h3>
                {runner ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-medium text-foreground">{runner.name}</span>
                      <RunnerStatusBadge status={runner.status} />
                      {task.ai_provider && (
                        <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-medium ring-1', getAiProviderStyles(task.ai_provider).pill)}>
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
                  <p className="text-[13px] text-muted-foreground/75">
                    Not assigned. Click <span className="font-medium text-foreground/80">Edit</span> to assign a runner.
                  </p>
                )}
              </AppDialogSection>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground/75">
                <div>Created: {fmtTime(task.created_at)}</div>
                <div>Updated: {fmtTime(task.updated_at)}</div>
                {task.started_at && <div>Started: {fmtTime(task.started_at)}</div>}
                {task.completed_at && <div>Completed: {fmtTime(task.completed_at)}</div>}
              </div>

              {/* Output */}
              {hasOutput && (
                <div className="min-w-0">
                  <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                    <h3 className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground/85">Output</h3>
                    <div className="flex shrink-0 items-center gap-3">
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
                  <ScrollArea className="h-64 min-w-0 max-w-full">
                    <div className={cn(OUTPUT_MARKDOWN_CLASSNAME, 'w-full')}>
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
            </>
          )}
            </div>
          </ScrollArea>
        </AppDialogBody>

        <AppDialogFooter className="bg-background shrink-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                className="h-8 rounded-full px-3.5 text-[11px] text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="h-8 rounded-full px-4 text-[11px]"
              >
                Save changes
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {canRun && (
                <Button
                  size="sm"
                  onClick={handleRun}
                  disabled={running}
                  className="h-8 rounded-full px-4 text-[11px]"
                >
                  {isRerun ? (
                    <>
                      <RotateCcw className="mr-1.5 h-3 w-3" />
                      Rerun
                    </>
                  ) : (
                    <>
                      <Play className="mr-1.5 h-3 w-3" />
                      Run
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={enterEditMode}
                className="h-8 rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground"
              >
                <Pencil className="mr-1.5 h-3 w-3" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="h-8 rounded-full px-3.5 text-[11px] text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3 w-3" />
                Delete
              </Button>
            </div>
          )}
        </AppDialogFooter>
      </AppDialogContent>

      <Dialog open={outputFullscreenOpen} onOpenChange={setOutputFullscreenOpen}>
        <AppDialogContent className="h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] max-h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] w-full min-w-0 max-w-none gap-0 overflow-hidden bg-background sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] sm:rounded-xl">
          <AppDialogHeader className="pr-14">
            <DialogTitle className="sr-only">{task.title} output</DialogTitle>
            <DialogDescription className="sr-only">Full-screen task output</DialogDescription>
            <AppDialogEyebrow>Task output</AppDialogEyebrow>
            <div className="flex items-center gap-2.5 text-[11px] font-medium text-muted-foreground/75">
              <span className="font-mono tracking-wide">{task.task_key}</span>
              <span className={cn('inline-flex items-center gap-1', statusStyles.icon)}>
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
          </AppDialogHeader>

          <ScrollArea className="min-h-0 min-w-0 flex-1 bg-muted/20">
            <div className="w-full min-w-0 px-4 py-4 sm:px-6 sm:py-6">
              <div className={cn(OUTPUT_MARKDOWN_CLASSNAME, 'min-h-full w-full bg-background shadow-soft')}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
              </div>
            </div>
          </ScrollArea>
        </AppDialogContent>
      </Dialog>
    </Dialog>
  );
}
