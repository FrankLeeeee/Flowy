import { useState, useEffect } from 'react';
import { List, TaskPriority, Label, RecurrenceRule, Template } from '../../types';
import { fetchLabels, fetchTemplates } from '../../api/client';
import { RecurrenceTrigger, RecurrencePanel, defaultRecurrenceRule } from '@/components/RecurrenceEditor';
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
import { CalendarDays, Circle, Clock3, FolderKanban, Inbox, ArrowRight, X, Sparkles, FileText, Tag, Repeat } from 'lucide-react';

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
  onSubmit: (data: { listId: string | null; title: string; description: string; priority: TaskPriority; labels: string[]; scheduledDate: string; scheduledTime: string | null; recurrenceRule: RecurrenceRule | null }) => void | Promise<void>;
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
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('_none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const selectedList = lists.find((list) => list.id === listSelection);
  const priorityStyles = getTaskPriorityStyles(priority);
  const currentListId = listSelection === INBOX_VALUE ? null : listSelection;
  const availableTemplates = allTemplates.filter((t) => !t.list_id || t.list_id === currentListId);

  useEffect(() => {
    if (open) {
      fetchLabels().then(setAllLabels).catch(() => {});
      fetchTemplates().then(setAllTemplates).catch(() => {});
      setTitle('');
      setDescription('');
      setPriority('none');
      setLabels([]);
      setScheduledDate(getTodayDateInputValue());
      setScheduledTime('');
      setRecurrenceRule(null);
      setSelectedTemplateId('_none');
      setIsSubmitting(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !title.trim() || !scheduledDate) return;
    const listId = listSelection === INBOX_VALUE ? null : listSelection;
    setIsSubmitting(true);
    try {
      await onSubmit({
        listId,
        title: title.trim(),
        description,
        priority,
        labels,
        scheduledDate,
        scheduledTime: scheduledTime || null,
        recurrenceRule,
      });
    } catch (error) {
      setIsSubmitting(false);
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isSubmitting) onClose(); }}>
      <AppDialogContent className="mb-[calc(env(safe-area-inset-bottom)+4.5rem)] flex max-h-[calc(100svh-6rem)] flex-col gap-0 overflow-hidden sm:mb-0 sm:max-h-[80svh] sm:max-w-2xl">
        <AppDialogHeader>
          <DialogTitle className="sr-only">Create a new task</DialogTitle>
          <DialogDescription className="sr-only">Create a new task with title, description, list, priority, and labels.</DialogDescription>
          <AppDialogEyebrow>
            <Sparkles className="h-3 w-3" />
            New Task
          </AppDialogEyebrow>
          <div className="flex items-center justify-between gap-3 sm:hidden">
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">New task</h2>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border/60">
              {selectedList ? (selectedList.icon ? `${selectedList.icon} ${selectedList.name}` : selectedList.name) : 'Inbox'}
            </div>
          </div>
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
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/75">{description.trim().length} chars</span>
                      {availableTemplates.length > 0 && (
                        <Select
                          value={selectedTemplateId}
                          onValueChange={(templateId) => {
                            setSelectedTemplateId(templateId);
                            if (templateId === '_none') { setDescription(''); return; }
                            const tpl = allTemplates.find((t) => t.id === templateId);
                            if (tpl) setDescription(tpl.content);
                          }}
                        >
                          <SelectTrigger className="h-6 w-auto max-w-[180px] gap-1.5 rounded-full border-border/60 bg-card px-2.5 text-[10px] font-medium shadow-soft focus:ring-0 focus:ring-offset-0">
                            <FileText className="h-3 w-3 shrink-0 opacity-60" />
                            <span className="truncate">{selectedTemplateId !== '_none' ? (allTemplates.find((t) => t.id === selectedTemplateId)?.name ?? 'Template') : 'Template'}</span>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                            <SelectItem value="_none" className="rounded-lg py-2 text-[10px] text-muted-foreground">
                              No template
                            </SelectItem>
                            {availableTemplates.map((tpl) => (
                              <SelectItem key={tpl.id} value={tpl.id} className="rounded-lg py-2 text-[10px]">
                                {tpl.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <MarkdownEditor
                    value={description}
                    onChange={setDescription}
                    rows={4}
                    placeholder="Add supporting context, expected outcome, or constraints..."
                    textareaClassName="min-h-[92px]"
                    ariaLabel="Task description"
                    enableRawToggle
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

              {isMobile ? (
                <div className="border-t border-border/40">
                  <div className="divide-y divide-border/30">
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <FolderKanban className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="font-medium">List</span>
                      </div>
                      <Select value={listSelection} onValueChange={setListSelection}>
                        <SelectTrigger
                          hideChevron
                          className="h-auto w-auto max-w-[180px] gap-1.5 border-0 bg-transparent px-0 text-[13px] font-medium text-foreground shadow-none focus:ring-0 focus:ring-offset-0"
                        >
                          <SelectValue placeholder="List" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                          <SelectItem value={INBOX_VALUE} className="rounded-lg py-2.5 text-[13px]">
                            <span className="inline-flex items-center gap-1.5"><Inbox className="h-3.5 w-3.5 opacity-60" /> Inbox</span>
                          </SelectItem>
                          {lists.map((list) => (
                            <SelectItem key={list.id} value={list.id} className="rounded-lg py-2.5 text-[13px]">
                              <span className="inline-flex items-center gap-1.5">
                                {list.icon ? <span className="leading-none">{list.icon}</span> : <FolderKanban className="h-3.5 w-3.5 opacity-60" />}
                                {list.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <span className={cn('h-3 w-3 shrink-0 rounded-full', priorityStyles.dot)} />
                        <span className="font-medium">Priority</span>
                      </div>
                      <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                        <SelectTrigger
                          hideChevron
                          className="h-auto w-auto gap-1.5 border-0 bg-transparent px-0 text-[13px] font-medium text-foreground shadow-none focus:ring-0 focus:ring-offset-0"
                        >
                          <SelectValue>
                            {PRIORITIES.find((item) => item.value === priority)?.label}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                          {PRIORITIES.map((item) => (
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

                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <Tag className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="font-medium">Labels</span>
                      </div>
                      <LabelPicker
                        selectedLabels={labels}
                        allLabels={allLabels}
                        onToggle={toggleLabel}
                        onLabelsChange={() => fetchLabels().then(setAllLabels).catch(() => {})}
                        allowCreate={false}
                        compact
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <CalendarDays className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="font-medium">Date</span>
                      </div>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        required
                        className="h-auto w-[130px] border-0 bg-transparent p-0 text-right text-[13px] font-medium text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <Clock3 className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="font-medium">Time</span>
                      </div>
                      <Input
                        type="time"
                        step={60}
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="h-auto w-[90px] border-0 bg-transparent p-0 text-right text-[13px] font-medium text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <Repeat className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="font-medium">Repeat</span>
                      </div>
                      {recurrenceRule ? (
                        <button
                          type="button"
                          onClick={() => setRecurrenceRule(null)}
                          className="text-[13px] font-medium text-primary"
                        >
                          {recurrenceRule.frequency === 'day' ? 'Daily' : recurrenceRule.frequency === 'week' ? 'Weekly' : 'Monthly'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { if (!recurrenceRule) setRecurrenceRule(defaultRecurrenceRule()); }}
                          className="text-[13px] font-medium text-muted-foreground"
                        >
                          Off
                        </button>
                      )}
                    </div>
                  </div>

                  {recurrenceRule && (
                    <div className="border-t border-border/30 px-4 py-3">
                      <RecurrencePanel value={recurrenceRule} onChange={(rule) => setRecurrenceRule(rule)} />
                    </div>
                  )}
                </div>
              ) : (
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
                      allowCreate
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
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

                    <RecurrenceTrigger
                      active={!!recurrenceRule}
                      onEnable={() => { if (!recurrenceRule) setRecurrenceRule(defaultRecurrenceRule()); }}
                      onDisable={() => setRecurrenceRule(null)}
                    />
                  </div>

                  {recurrenceRule && (
                    <RecurrencePanel value={recurrenceRule} onChange={(rule) => setRecurrenceRule(rule)} />
                  )}
                </div>
              )}

            </div>
          </div>

          <AppDialogFooter>
            <div className={cn('flex items-center gap-2', isMobile ? 'w-full justify-center' : '')}>
              <Button type="button" variant={isMobile ? 'outline' : 'ghost'} onClick={onClose} disabled={isSubmitting} className={cn('rounded-full text-[11px]', isMobile ? 'flex-1 border-border/60 text-muted-foreground' : 'px-3.5 text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !title.trim() || !scheduledDate} className={cn('rounded-full text-[11px]', isMobile ? 'flex-1' : 'px-4')}>
                {isSubmitting ? 'Creating...' : 'Create task'}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}
