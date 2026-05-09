import { useState, useEffect } from 'react';
import { List, TaskPriority, Label, RecurrenceRule } from '../../types';
import { fetchLabels } from '../../api/client';
import RecurrenceEditor from '@/components/RecurrenceEditor';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection, APP_DIALOG_TONE_STYLES } from '@/components/ui/app-dialog';
import LabelPicker from '@/components/LabelPicker';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { getTodayDateInputValue } from '@/lib/taskSchedule';
import { getLabelColorStyles, getTaskPriorityStyles } from '@/lib/semanticColors';
import { CalendarDays, Circle, Clock3, FolderKanban, Inbox, ArrowRight, X, Sparkles } from 'lucide-react';

const INBOX_VALUE = '_inbox';

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'none',   label: 'No Priority' },
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function CreateTaskModal({
  open, lists, defaultListId, onSubmit, onClose,
}: {
  open: boolean;
  lists: List[];
  defaultListId?: string;
  onSubmit: (data: { listId: string | null; title: string; description: string; priority: TaskPriority; labels: string[]; scheduledDate: string; scheduledTime: string | null; recurrenceRule: RecurrenceRule | null }) => void;
  onClose: () => void;
}) {
  const [listSelection, setListSelection] = useState(defaultListId ?? INBOX_VALUE);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [labels, setLabels] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(getTodayDateInputValue());
  const [scheduledTime, setScheduledTime] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const isMobile = useIsMobile();

  const selectedList = lists.find((list) => list.id === listSelection);
  const priorityStyles = getTaskPriorityStyles(priority);

  useEffect(() => {
    if (open) {
      fetchLabels().then(setAllLabels).catch(() => {});
      setTitle('');
      setDescription('');
      setPriority('none');
      setLabels([]);
      setScheduledDate(getTodayDateInputValue());
      setScheduledTime('');
      setRecurrenceRule(null);
    }
  }, [open]);

  const toggleLabel = (labelName: string) => {
    setLabels((prev) => {
      const exists = prev.some((l) => l.toLowerCase() === labelName.toLowerCase());
      return exists
        ? prev.filter((l) => l.toLowerCase() !== labelName.toLowerCase())
        : [...prev, labelName];
    });
  };

  const removeLabel = (label: string) => {
    setLabels((prev) => prev.filter((l) => l !== label));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledDate) return;
    const listId = listSelection === INBOX_VALUE ? null : listSelection;
    onSubmit({
      listId,
      title: title.trim(),
      description,
      priority,
      labels,
      scheduledDate,
      scheduledTime: scheduledTime || null,
      recurrenceRule,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <AppDialogContent className="mb-[calc(env(safe-area-inset-bottom)+4.5rem)] flex max-h-[calc(100svh-6rem)] flex-col gap-0 overflow-hidden sm:mb-0 sm:max-h-[80svh] sm:max-w-2xl">
        <AppDialogHeader>
          <DialogTitle className="sr-only">Create a new task</DialogTitle>
          <DialogDescription className="sr-only">Create a new task with title, description, list, priority, and labels.</DialogDescription>
          <AppDialogEyebrow>
            <Sparkles className="h-3 w-3" />
            New Task
          </AppDialogEyebrow>
          <div className="hidden flex-wrap items-end justify-between gap-3 sm:flex">
            <div className="min-w-0">
              <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">Add a task to the queue</h2>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground/85">
                Keep it concise now. Add more context only if it helps the next handoff.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground/85 ring-1 ring-primary/10 shadow-soft">
              <Circle className="h-3 w-3 text-primary" />
              <span>{selectedList ? (selectedList.icon ? `${selectedList.icon} ${selectedList.name}` : selectedList.name) : 'Inbox'}</span>
            </div>
          </div>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div>
              <AppDialogBody>
                <AppDialogSection tone="primary">
                  <p className={cn('mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>Title</p>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    autoFocus
                    required
                    className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </AppDialogSection>

                <AppDialogSection>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Description</p>
                    <span className="text-[10px] text-muted-foreground/75">{description.trim().length} chars · Markdown</span>
                  </div>
                  <MarkdownEditor
                    value={description}
                    onChange={setDescription}
                    rows={4}
                    placeholder="Add supporting context, expected outcome, or constraints..."
                    textareaClassName="min-h-[92px]"
                    ariaLabel="Task description"
                  />
                </AppDialogSection>

                {labels.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
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
              </AppDialogBody>

              <div className="flex flex-col gap-2 border-t border-border/40 bg-foreground/[0.015] px-4 py-3 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={listSelection} onValueChange={setListSelection}>
                    <SelectTrigger className="h-8 w-auto min-w-[148px] gap-2 rounded-full border-border/60 bg-card px-3 text-[11px] font-medium shadow-soft focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="List" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                      <SelectItem value={INBOX_VALUE} className="rounded-lg py-2 text-[11px]">
                        <span className="inline-flex items-center gap-1.5"><Inbox className="h-3 w-3 opacity-60" /> Inbox</span>
                      </SelectItem>
                      {lists.map((list) => (
                        <SelectItem key={list.id} value={list.id} className="rounded-lg py-2 text-[11px]">
                          <span className="inline-flex items-center gap-1.5">
                            {list.icon ? <span className="leading-none">{list.icon}</span> : <FolderKanban className="h-3 w-3 opacity-60" />}
                            {list.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                    <SelectTrigger className="h-8 w-auto min-w-[132px] gap-2 rounded-full border-border/60 bg-card px-3 text-[11px] font-medium shadow-soft focus:ring-0 focus:ring-offset-0">
                      <span className={cn('h-2 w-2 rounded-full', priorityStyles.dot)} />
                      <SelectValue>
                        {PRIORITIES.find((item) => item.value === priority)?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                      {PRIORITIES.map((item) => (
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
                    allowCreate={!isMobile}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-[11px] font-medium shadow-soft">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      className="h-5 w-[118px] border-0 bg-transparent p-0 text-[11px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-[11px] font-medium shadow-soft">
                    <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="time"
                      step={60}
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="h-5 w-[78px] border-0 bg-transparent p-0 text-[11px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>

                <RecurrenceEditor value={recurrenceRule} onChange={setRecurrenceRule} />
              </div>

            </div>
          </div>

          <AppDialogFooter>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || !scheduledDate} className="rounded-full px-4 text-[11px]">
                Create task
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}
