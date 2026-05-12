import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Task, TaskLog, Runner, TaskStatus, TaskPriority, Label, AiProvider, HarnessConfig, RecurrenceRule, List, Workspace } from '../../types';
import { parseWorkspaces } from 'flowy-shared';
import { fetchTaskLogs, updateTask, fetchLabels, runTask, assignTask } from '../../api/client';
import { RecurrenceTrigger, RecurrencePanel, defaultRecurrenceRule } from '@/components/RecurrenceEditor';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection } from '@/components/ui/app-dialog';
import LabelPicker from '@/components/LabelPicker';
import RunnerStatusBadge from '../runners/RunnerStatusBadge';
import RunnerAssignmentFields from './RunnerAssignmentFields';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn, formatLocalDateTime } from '@/lib/utils';
import { normalizeScheduledTime } from '@/lib/taskSchedule';
import { getAiHarnessPillStyle, getLabelColorStyles, getTaskPriorityStyles, getTaskStatusStyles } from '@/lib/semanticColors';
import { getHarnessConfigBadges, parseHarnessConfig } from '../../lib/harnessConfig';
import { getTaskRunnerActionState } from '../../lib/taskRunnerActions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { STATUS_CONFIG, AI_LABELS, TASK_STATUSES } from '../../lib/taskConstants';
import { CalendarDays, Clock3, Trash2, Download, ArrowRight, X, Expand, Play, RotateCcw, UserPlus, UserCog, Code2, Eye, Tag, Repeat } from 'lucide-react';

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

export default function TaskDetailModal({
  open, task, runners, lists, onUpdate, onDelete, onClose,
}: {
  open: boolean;
  task: Task;
  runners: Runner[];
  lists?: List[];
  onUpdate: (t: Task) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const runner = runners.find((r) => r.id === task.runner_id);
  const taskList = lists?.find((l) => l.id === task.list_id);
  const listWorkspaces: Workspace[] = taskList ? parseWorkspaces(taskList.workspaces) : [];

  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [rawMarkdown, setRawMarkdown] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [scheduledDate, setScheduledDate] = useState(task.scheduled_date);
  const [scheduledTime, setScheduledTime] = useState(normalizeScheduledTime(task.scheduled_time));
  const [labelsText, setLabelsText] = useState<string>(task.labels ? (JSON.parse(task.labels || '[]') as string[]).join(', ') : '');
  const [assignRunnerId, setAssignRunnerId] = useState(task.runner_id ?? '');
  const [assignAiProvider, setAssignAiProvider] = useState<AiProvider | ''>((task.ai_provider as AiProvider | null) ?? '');
  const [assignHarnessConfig, setAssignHarnessConfig] = useState<HarnessConfig>(parseHarnessConfig(task.harness_config));
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(
    task.recurrence_rule ? JSON.parse(task.recurrence_rule) : null,
  );
  const [outputFullscreenOpen, setOutputFullscreenOpen] = useState(false);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [running, setRunning] = useState(false);

  // Auto-save: stable ref so saveField doesn't depend on onUpdate identity
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const saveField = useCallback(async (updates: Parameters<typeof updateTask>[1]) => {
    try {
      const updated = await updateTask(task.id, updates);
      onUpdateRef.current(updated);
    } catch { /* ignore */ }
  }, [task.id]);

  // Debounced auto-save for description
  const initialDescRef = useRef(task.description);
  useEffect(() => {
    if (description === initialDescRef.current) return;
    const timeout = setTimeout(() => {
      saveField({ description });
      initialDescRef.current = description;
    }, 800);
    return () => clearTimeout(timeout);
  }, [description, saveField]);

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

  const enterAssignMode = () => {
    setAssignRunnerId(task.runner_id ?? '');
    setAssignAiProvider((task.ai_provider as AiProvider | null) ?? '');
    setAssignHarnessConfig(parseHarnessConfig(task.harness_config));
    setAssigning(true);
  };

  const handleSaveAssignment = async () => {
    if (!assignRunnerId || !assignAiProvider) return;
    setSavingAssignment(true);
    try {
      const updated = await assignTask(task.id, {
        runnerId: assignRunnerId,
        aiProvider: assignAiProvider,
        harnessConfig: assignHarnessConfig,
      });
      setStatus(updated.status);
      onUpdate(updated);
      setAssigning(false);
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleClearAssignment = async () => {
    setSavingAssignment(true);
    try {
      const updated = await updateTask(task.id, { runnerId: null, aiProvider: null });
      setStatus(updated.status);
      onUpdate(updated);
      setAssigning(false);
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const updated = await runTask(task.id);
      setStatus(updated.status);
      onUpdate(updated);
    } finally {
      setRunning(false);
    }
  };

  const labels: string[] = labelsText.split(',').map((label: string) => label.trim()).filter(Boolean);
  const statusConfig = STATUS_CONFIG[status];
  const output = useMemo(() => task.output?.trim() ?? '', [task.output]);
  const hasOutput = output.length > 0;
  const canViewFullscreenOutput = hasOutput && TERMINAL_STATUSES.includes(status);
  const harnessConfigBadges = useMemo(() => getHarnessConfigBadges(task.ai_provider, parseHarnessConfig(task.harness_config)), [task.ai_provider, task.harness_config]);
  const statusStyles = getTaskStatusStyles(status);
  const priorityStyles = getTaskPriorityStyles(priority);

  const { canAssignRunner, canRun } = getTaskRunnerActionState({
    status,
    hasRunnerAssignment: !!task.runner_id,
    hasAiProvider: !!task.ai_provider,
    running,
  });
  const isRerun = TERMINAL_STATUSES.includes(status);

  const syncLabels = (nextLabels: string[]) => {
    setLabelsText(nextLabels.join(', '));
    saveField({ labels: nextLabels });
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
          <AppDialogEyebrow>{assigning ? (task.runner_id ? 'Re-assign runner' : 'Assign runner') : 'Task details'}</AppDialogEyebrow>
          <div className="flex items-center gap-2.5 flex-wrap text-[11px] font-medium">
            <span className="text-[11px] font-mono tracking-wide text-muted-foreground/75">{task.task_key}</span>
            <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', statusStyles.icon)}>
              {statusConfig.icon}
              {STATUS_OPTIONS.find((s) => s.value === status)?.label}
            </span>
            {priority !== 'none' && (
              <span className={cn('text-[11px] font-medium capitalize', priorityStyles.text)}>
                {priority}
              </span>
            )}
          </div>
        </AppDialogHeader>

        <AppDialogBody className="flex min-h-0 flex-1 flex-col space-y-0 overflow-hidden px-0 py-0 sm:px-0 sm:py-0">
          <ScrollArea className="min-h-0 min-w-0 flex-1">
            <div className="flex min-w-0 flex-col gap-5 px-4 py-5 sm:px-6">
          {assigning ? (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground leading-snug">{task.title}</h2>
                <p className="mt-1 text-[12px] text-muted-foreground/85">
                  {task.runner_id
                    ? 'Choose a different runner or update the harness configuration. Saving moves the task to todo when ready to run.'
                    : 'Pick a runner and AI provider so this task can be picked up when due.'}
                </p>
              </div>
              <RunnerAssignmentFields
                runners={runners}
                runnerId={assignRunnerId}
                aiProvider={assignAiProvider}
                harnessConfig={assignHarnessConfig}
                listWorkspaces={listWorkspaces.length > 0 ? listWorkspaces : undefined}
                onRunnerIdChange={setAssignRunnerId}
                onAiProviderChange={setAssignAiProvider}
                onHarnessConfigChange={setAssignHarnessConfig}
              />
            </div>
          ) : (
            <>
              {/* Title — always editable */}
              <div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => { if (title.trim() && title !== task.title) saveField({ title }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  placeholder="Task title"
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[15px] font-semibold leading-snug text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Description — always editable, with raw markdown toggle */}
              <div className="rounded-xl border border-border/40 bg-foreground/[0.01] px-3 py-2.5">
                {rawMarkdown ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add description..."
                    aria-label="Task description (raw markdown)"
                    rows={6}
                    className="w-full resize-y rounded-md border-0 bg-transparent p-0 font-mono text-[12px] leading-relaxed text-foreground/90 placeholder:text-muted-foreground/45 focus:outline-none"
                  />
                ) : (
                  <MarkdownEditor
                    value={description}
                    onChange={setDescription}
                    rows={3}
                    placeholder="Add description..."
                    ariaLabel="Task description"
                  />
                )}
                <div className="mt-1.5 flex items-center justify-start">
                  <button
                    type="button"
                    onClick={() => setRawMarkdown((v) => !v)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                      rawMarkdown
                        ? 'bg-foreground/[0.08] text-foreground'
                        : 'text-muted-foreground/60 hover:text-muted-foreground',
                    )}
                  >
                    {rawMarkdown ? <Eye className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
                    {rawMarkdown ? 'Rich text' : 'Markdown'}
                  </button>
                </div>
              </div>

              {/* Labels with remove */}
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
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

              {isMobile ? (
                <div className="border-t border-border/40">
                  <div className="divide-y divide-border/30">
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <span className={cn('h-3 w-3 shrink-0 rounded-full', statusStyles.dot)} />
                        <span className="font-medium">Status</span>
                      </div>
                      <Select value={status} onValueChange={(value) => { const s = value as TaskStatus; setStatus(s); saveField({ status: s }); }}>
                        <SelectTrigger className="h-auto w-auto gap-1.5 border-0 bg-transparent px-0 text-[13px] font-medium text-foreground shadow-none focus:ring-0 focus:ring-offset-0">
                          <SelectValue>
                            {STATUS_OPTIONS.find((item) => item.value === status)?.label}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                          {STATUS_OPTIONS.map((item) => (
                            <SelectItem key={item.value} value={item.value} className="rounded-lg py-2.5 pl-8 pr-3 text-[13px] font-medium">
                              <span className={cn('inline-flex items-center gap-2', getTaskStatusStyles(item.value).text)}>
                                <span className={cn('h-2.5 w-2.5 rounded-full', getTaskStatusStyles(item.value).dot)} />
                                {item.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <span className={cn('h-3 w-3 shrink-0 rounded-full', priorityStyles.dot)} />
                        <span className="font-medium">Priority</span>
                      </div>
                      <Select value={priority} onValueChange={(value) => { const p = value as TaskPriority; setPriority(p); saveField({ priority: p }); }}>
                        <SelectTrigger className="h-auto w-auto gap-1.5 border-0 bg-transparent px-0 text-[13px] font-medium text-foreground shadow-none focus:ring-0 focus:ring-offset-0">
                          <SelectValue>
                            {PRIORITY_OPTIONS.find((item) => item.value === priority)?.label}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                          {PRIORITY_OPTIONS.map((item) => (
                            <SelectItem key={item.value} value={item.value} className="rounded-lg py-2.5 pl-8 pr-3 text-[13px] font-medium">
                              <span className={cn('inline-flex items-center gap-2', getTaskPriorityStyles(item.value).text)}>
                                <span className={cn('h-2.5 w-2.5 rounded-full', getTaskPriorityStyles(item.value).dot)} />
                                {item.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <Tag className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="font-medium">Labels</span>
                      </div>
                      <LabelPicker
                        selectedLabels={labels}
                        allLabels={allLabels}
                        onToggle={toggleLabel}
                        onLabelsChange={() => fetchLabels().then(setAllLabels).catch(() => {})}
                        compact
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <CalendarDays className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="font-medium">Date</span>
                      </div>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => { setScheduledDate(e.target.value); if (e.target.value) saveField({ scheduledDate: e.target.value }); }}
                        required
                        className="h-auto w-[130px] border-0 bg-transparent p-0 text-right text-[13px] font-medium text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <Clock3 className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="font-medium">Time</span>
                      </div>
                      <Input
                        type="time"
                        step={60}
                        value={scheduledTime}
                        onChange={(e) => { setScheduledTime(e.target.value); saveField({ scheduledTime: e.target.value || null }); }}
                        className="h-auto w-[90px] border-0 bg-transparent p-0 text-right text-[13px] font-medium text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <Repeat className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="font-medium">Repeat</span>
                      </div>
                      {recurrenceRule ? (
                        <button
                          type="button"
                          onClick={() => { setRecurrenceRule(null); saveField({ recurrenceRule: null }); }}
                          className="text-[13px] font-medium text-primary"
                        >
                          {recurrenceRule.frequency === 'day' ? 'Daily' : recurrenceRule.frequency === 'week' ? 'Weekly' : 'Monthly'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { const rule = defaultRecurrenceRule(); setRecurrenceRule(rule); saveField({ recurrenceRule: rule }); }}
                          className="text-[13px] font-medium text-muted-foreground"
                        >
                          Off
                        </button>
                      )}
                    </div>
                  </div>

                  {recurrenceRule && (
                    <div className="border-t border-border/30 py-3">
                      <RecurrencePanel value={recurrenceRule} onChange={(rule) => { setRecurrenceRule(rule); saveField({ recurrenceRule: rule }); }} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 border-t border-border/40 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={status} onValueChange={(value) => { const s = value as TaskStatus; setStatus(s); saveField({ status: s }); }}>
                      <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-border/60 bg-foreground/[0.04] px-3 text-[11px] font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                        <span className={cn('h-2 w-2 rounded-full', statusStyles.dot)} />
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

                    <Select value={priority} onValueChange={(value) => { const p = value as TaskPriority; setPriority(p); saveField({ priority: p }); }}>
                      <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-border/60 bg-foreground/[0.04] px-3 text-[11px] font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                        <span className={cn('h-2 w-2 rounded-full', priorityStyles.dot)} />
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

                    <LabelPicker
                      selectedLabels={labels}
                      allLabels={allLabels}
                      onToggle={toggleLabel}
                      onLabelsChange={() => fetchLabels().then(setAllLabels).catch(() => {})}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-foreground/[0.04] px-3 py-1.5 text-[11px] font-medium shadow-none">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => { setScheduledDate(e.target.value); if (e.target.value) saveField({ scheduledDate: e.target.value }); }}
                        required
                        className="h-5 w-[118px] border-0 bg-transparent p-0 text-[11px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-foreground/[0.04] px-3 py-1.5 text-[11px] font-medium shadow-none">
                      <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="time"
                        step={60}
                        value={scheduledTime}
                        onChange={(e) => { setScheduledTime(e.target.value); saveField({ scheduledTime: e.target.value || null }); }}
                        className="h-5 w-[78px] border-0 bg-transparent p-0 text-[11px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <RecurrenceTrigger
                      active={!!recurrenceRule}
                      onEnable={() => { const rule = defaultRecurrenceRule(); setRecurrenceRule(rule); saveField({ recurrenceRule: rule }); }}
                      onDisable={() => { setRecurrenceRule(null); saveField({ recurrenceRule: null }); }}
                    />
                  </div>

                  {recurrenceRule && (
                    <RecurrencePanel value={recurrenceRule} onChange={(rule) => { setRecurrenceRule(rule); saveField({ recurrenceRule: rule }); }} />
                  )}
                </div>
              )}

              {/* Runner Assignment */}
              <AppDialogSection className="rounded-lg bg-foreground/[0.02] p-4">
                <h3 className="mb-2 text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground/85">Runner Assignment</h3>
                {runner ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-medium text-foreground">{runner.name}</span>
                      <RunnerStatusBadge status={runner.status} />
                      {task.ai_provider && (
                        <span
                          className="ai-harness-pill rounded-full px-1.5 py-0.5 text-[11px] font-medium"
                          style={getAiHarnessPillStyle(task.ai_provider)}
                        >
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
                    Not assigned. Click <span className="font-medium text-foreground/80">Assign</span> below to choose a runner.
                  </p>
                )}
              </AppDialogSection>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground/75">
                <div>Created: {formatLocalDateTime(task.created_at)}</div>
                <div>Updated: {formatLocalDateTime(task.updated_at)}</div>
                {task.started_at && <div>Started: {formatLocalDateTime(task.started_at)}</div>}
                {task.completed_at && <div>Completed: {formatLocalDateTime(task.completed_at)}</div>}
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
                          <span className="whitespace-nowrap text-muted-foreground/70">{formatLocalDateTime(log.created_at)}</span>
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
          {assigning ? (
            <div className="flex w-full flex-wrap items-center justify-center gap-2">
              {task.runner_id && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearAssignment}
                  disabled={savingAssignment}
                  className="h-8 rounded-full px-3.5 text-[11px] text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                >
                  Clear assignment
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAssigning(false)}
                disabled={savingAssignment}
                className="h-8 rounded-full px-3.5 text-[11px] text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAssignment}
                disabled={savingAssignment || !assignRunnerId || !assignAiProvider}
                className="h-8 rounded-full px-4 text-[11px]"
              >
                Save assignment
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
              {canAssignRunner && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={enterAssignMode}
                  className="h-8 rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground"
                >
                  {task.runner_id ? (
                    <>
                      <UserCog className="mr-1.5 h-3 w-3" />
                      Re-Assign
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-1.5 h-3 w-3" />
                      Assign
                    </>
                  )}
                </Button>
              )}
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
                {STATUS_OPTIONS.find((item) => item.value === status)?.label}
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
