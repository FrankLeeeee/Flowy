import { useState, useEffect, useCallback } from 'react';
import { Template, List } from '../types';
import { fetchTemplates, fetchLists, createTemplate, updateTemplate, deleteTemplate } from '../api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection, APP_DIALOG_TONE_STYLES } from '@/components/ui/app-dialog';
import PageTitle from '@/components/PageTitle';
import ConfirmDialog from '../components/ConfirmDialog';
import { getToneStyles } from '@/lib/semanticColors';
import { cn } from '@/lib/utils';
import { FileText, Plus, Pencil, Trash2, ArrowRight, Sparkles, FolderKanban, Inbox } from 'lucide-react';

const NO_LIST = '__none__';

export default function TemplatesPage() {
  const neutralTone = getToneStyles('neutral');
  const dangerTone = getToneStyles('danger');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newListId, setNewListId] = useState<string>(NO_LIST);
  const [newContent, setNewContent] = useState('');

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editListId, setEditListId] = useState<string>(NO_LIST);
  const [editContent, setEditContent] = useState('');

  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [t, l] = await Promise.all([fetchTemplates(), fetchLists()]);
      setTemplates(t);
      setLists(l);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetCreateForm = () => {
    setNewName('');
    setNewDescription('');
    setNewListId(NO_LIST);
    setNewContent('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createTemplate({
        name: newName.trim(),
        description: newDescription.trim(),
        listId: newListId === NO_LIST ? null : newListId,
        content: newContent,
      });
      setShowCreate(false);
      resetCreateForm();
      loadData();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to create template');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editName.trim()) return;
    try {
      await updateTemplate(editingTemplate.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        listId: editListId === NO_LIST ? null : editListId,
        content: editContent,
      });
      setEditingTemplate(null);
      loadData();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to update template');
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      await deleteTemplate(deletingTemplate.id);
      setDeletingTemplate(null);
      loadData();
    } catch {
      setError('Failed to delete template');
    }
  };

  const openEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditName(template.name);
    setEditDescription(template.description);
    setEditListId(template.list_id ?? NO_LIST);
    setEditContent(template.content);
  };

  const getListName = (listId: string | null) => {
    if (!listId) return 'All lists';
    const list = lists.find((l) => l.id === listId);
    return list ? (list.icon ? `${list.icon} ${list.name}` : list.name) : 'Unknown list';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-5 motion-section" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-full" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="motion-section mb-6 flex flex-wrap items-center justify-between gap-3" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
        <div>
          <PageTitle icon={FileText} title="Task Templates" />
          <p className="mt-1.5 text-[12px] text-muted-foreground/85">Reusable templates to pre-fill task descriptions</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', neutralTone.pill)}>{templates.length} templates</span>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 text-[13px] shadow-soft">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Template
        </Button>
      </div>

      {error && <div className={cn('mb-4 rounded-md px-3 py-2 text-[13px] ring-1', dangerTone.panel, dangerTone.text)}>{error}</div>}

      <div className="motion-section" style={{ '--motion-delay': '200ms' } as React.CSSProperties}>
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-10 w-10 text-foreground/10 mb-4" />
            <p className="text-[14px] font-medium text-muted-foreground/80">No templates yet</p>
            <p className="mt-1 mb-5 text-[12px] text-muted-foreground/70">
              Create your first template to speed up task creation.
            </p>
            <Button onClick={() => setShowCreate(true)} size="sm" className="h-8 text-[13px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Template
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template, index) => (
              <div
                key={template.id}
                className="motion-card group flex items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3 transition-colors hover:border-border/60"
                style={{ '--motion-delay': `${index * 35 + 80}ms` } as React.CSSProperties}
              >
                <FileText className="h-4 w-4 shrink-0 text-primary/60" />
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-foreground">{template.name}</span>
                  {template.description && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70 truncate">{template.description}</p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/40">
                  {template.list_id ? (
                    <><FolderKanban className="h-2.5 w-2.5 opacity-60" /> {getListName(template.list_id)}</>
                  ) : (
                    <><Inbox className="h-2.5 w-2.5 opacity-60" /> All lists</>
                  )}
                </span>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(template)}
                    className="interactive-lift rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label={`Edit ${template.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingTemplate(template)}
                    className="interactive-lift rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${template.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetCreateForm(); } }}>
        <AppDialogContent className="sm:max-w-2xl">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Create a new template</DialogTitle>
            <DialogDescription className="sr-only">Create a template with a name, optional list, and content.</DialogDescription>
            <AppDialogEyebrow>
              <Sparkles className="h-3 w-3" />
              New Template
            </AppDialogEyebrow>
            <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">Create a new template</h2>
          </AppDialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col">
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <p className={cn('mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>Name</p>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Template name"
                  autoFocus
                  required
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </AppDialogSection>

              <AppDialogSection>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Description</p>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief template description..."
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[13px] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </AppDialogSection>

              <AppDialogSection>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Scoped to list</p>
                <Select value={newListId} onValueChange={setNewListId}>
                  <SelectTrigger className="h-8 w-auto min-w-[180px] gap-2 rounded-full border-border/60 bg-card px-3 text-[11px] font-medium shadow-soft focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                    <SelectItem value={NO_LIST} className="rounded-lg py-2 text-[11px]">
                      <span className="inline-flex items-center gap-1.5"><Inbox className="h-3 w-3 opacity-60" /> All lists (global)</span>
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
              </AppDialogSection>

              <AppDialogSection>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Template Content</p>
                  <span className="text-[10px] text-muted-foreground/75">{newContent.trim().length} chars · Markdown</span>
                </div>
                <MarkdownEditor
                  value={newContent}
                  onChange={setNewContent}
                  rows={6}
                  placeholder="Write the template content that will pre-fill the task description..."
                  textareaClassName="min-h-[140px]"
                  ariaLabel="Template content"
                  enableRawToggle
                />
              </AppDialogSection>
            </AppDialogBody>

            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); resetCreateForm(); }} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">
                  Cancel
                </Button>
                <Button type="submit" disabled={!newName.trim()} className="rounded-full px-4 text-[11px]">
                  Create template
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </AppDialogFooter>
          </form>
        </AppDialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}>
        <AppDialogContent className="sm:max-w-2xl">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Edit template</DialogTitle>
            <DialogDescription className="sr-only">Update template name, list, and content.</DialogDescription>
            <AppDialogEyebrow>Edit Template</AppDialogEyebrow>
            <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">Edit template</h2>
          </AppDialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col">
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <p className={cn('mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>Name</p>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Template name"
                  autoFocus
                  required
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </AppDialogSection>

              <AppDialogSection>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Description</p>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Brief template description..."
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[13px] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </AppDialogSection>

              <AppDialogSection>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Scoped to list</p>
                <Select value={editListId} onValueChange={setEditListId}>
                  <SelectTrigger className="h-8 w-auto min-w-[180px] gap-2 rounded-full border-border/60 bg-card px-3 text-[11px] font-medium shadow-soft focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60 bg-popover p-1 shadow-none">
                    <SelectItem value={NO_LIST} className="rounded-lg py-2 text-[11px]">
                      <span className="inline-flex items-center gap-1.5"><Inbox className="h-3 w-3 opacity-60" /> All lists (global)</span>
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
              </AppDialogSection>

              <AppDialogSection>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Template Content</p>
                  <span className="text-[10px] text-muted-foreground/75">{editContent.trim().length} chars · Markdown</span>
                </div>
                <MarkdownEditor
                  value={editContent}
                  onChange={setEditContent}
                  rows={6}
                  placeholder="Write the template content that will pre-fill the task description..."
                  textareaClassName="min-h-[140px]"
                  ariaLabel="Template content"
                  enableRawToggle
                />
              </AppDialogSection>
            </AppDialogBody>

            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditingTemplate(null)} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">
                  Cancel
                </Button>
                <Button type="submit" disabled={!editName.trim()} className="rounded-full px-4 text-[11px]">
                  Save changes
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </AppDialogFooter>
          </form>
        </AppDialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingTemplate}
        title="Delete template"
        description={`Are you sure you want to delete "${deletingTemplate?.name}"? This action cannot be undone.`}
        confirmLabel="Delete template"
        onConfirm={handleDelete}
        onCancel={() => setDeletingTemplate(null)}
      />
    </div>
  );
}
