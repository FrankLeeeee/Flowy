import { useState, useEffect, useCallback } from 'react';
import { Label, LabelColor } from '../types';
import { fetchLabels, createLabel, updateLabel, deleteLabel } from '../api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection, APP_DIALOG_TONE_STYLES } from '@/components/ui/app-dialog';
import PageTitle from '@/components/PageTitle';
import ConfirmDialog from '../components/ConfirmDialog';
import { LABEL_COLORS, LABEL_COLOR_LIST, getToneStyles } from '@/lib/semanticColors';
import { cn } from '@/lib/utils';
import { Tags, Plus, Pencil, Trash2, ArrowRight, Sparkles } from 'lucide-react';

export default function LabelsPage() {
  const neutralTone = getToneStyles('neutral');
  const dangerTone = getToneStyles('danger');

  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [deletingLabel, setDeletingLabel] = useState<Label | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<LabelColor>('blue');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<LabelColor>('blue');

  const [error, setError] = useState('');

  const loadLabels = useCallback(async () => {
    try {
      setLabels(await fetchLabels());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load labels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLabels(); }, [loadLabels]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createLabel({ name: newName.trim(), color: newColor });
      setShowCreate(false);
      setNewName('');
      setNewColor('blue');
      loadLabels();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to create label');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLabel || !editName.trim()) return;
    try {
      await updateLabel(editingLabel.id, { name: editName.trim(), color: editColor });
      setEditingLabel(null);
      loadLabels();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to update label');
    }
  };

  const handleDelete = async () => {
    if (!deletingLabel) return;
    try {
      await deleteLabel(deletingLabel.id);
      setDeletingLabel(null);
      loadLabels();
    } catch {
      setError('Failed to delete label');
    }
  };

  const openEdit = (label: Label) => {
    setEditingLabel(label);
    setEditName(label.name);
    setEditColor(label.color);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-5 motion-section" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-full" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="motion-section mb-6 flex flex-wrap items-center justify-between gap-3" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
        <div>
          <PageTitle icon={Tags} title="Labels" />
          <p className="mt-1.5 text-[12px] text-muted-foreground/85">Manage labels used across your tasks</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', neutralTone.pill)}>{labels.length} labels</span>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 text-[13px] shadow-soft">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Label
        </Button>
      </div>

      {error && <div className={cn('mb-4 rounded-md px-3 py-2 text-[13px] ring-1', dangerTone.panel, dangerTone.text)}>{error}</div>}

      {/* Labels list */}
      <div className="motion-section" style={{ '--motion-delay': '200ms' } as React.CSSProperties}>
        {labels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Tags className="h-10 w-10 text-foreground/10 mb-4" />
            <p className="text-[14px] font-medium text-muted-foreground/80">No labels yet</p>
            <p className="mt-1 mb-5 text-[12px] text-muted-foreground/70">
              Create your first label to start categorizing tasks.
            </p>
            <Button onClick={() => setShowCreate(true)} size="sm" className="h-8 text-[13px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Label
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {labels.map((label, index) => {
              const colorStyles = LABEL_COLORS[label.color];
              return (
                <div
                  key={label.id}
                  className="motion-card group flex items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3 transition-colors hover:border-border/60"
                  style={{ '--motion-delay': `${index * 35 + 80}ms` } as React.CSSProperties}
                >
                  <span className={cn('h-3.5 w-3.5 rounded-full shrink-0', colorStyles.swatch)} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-foreground">{label.name}</span>
                    <span className="ml-2 text-[10px] capitalize text-muted-foreground/60">{label.color}</span>
                  </div>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1', colorStyles.pill)}>
                    {label.name}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEdit(label)}
                      className="interactive-lift rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label={`Edit ${label.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingLabel(label)}
                      className="interactive-lift rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${label.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Label Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); setNewName(''); setNewColor('blue'); } }}>
        <AppDialogContent className="sm:max-w-[480px]">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Create a new label</DialogTitle>
            <DialogDescription className="sr-only">Create a label with a name and color.</DialogDescription>
            <AppDialogEyebrow>
              <Sparkles className="h-3 w-3" />
              New Label
            </AppDialogEyebrow>
            <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">Create a new label</h2>
          </AppDialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col">
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <p className={cn('mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>Name</p>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Label name"
                  autoFocus
                  required
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </AppDialogSection>

              <AppDialogSection>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Color</p>
                <ColorGrid selected={newColor} onSelect={setNewColor} />
              </AppDialogSection>

              {newName.trim() && (
                <div className="pt-2">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Preview</p>
                  <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1', LABEL_COLORS[newColor].pill)}>
                    {newName.trim()}
                  </span>
                </div>
              )}
            </AppDialogBody>

            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); setNewName(''); setNewColor('blue'); }} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">
                  Cancel
                </Button>
                <Button type="submit" disabled={!newName.trim()} className="rounded-full px-4 text-[11px]">
                  Create label
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </AppDialogFooter>
          </form>
        </AppDialogContent>
      </Dialog>

      {/* Edit Label Dialog */}
      <Dialog open={!!editingLabel} onOpenChange={(open) => { if (!open) setEditingLabel(null); }}>
        <AppDialogContent className="sm:max-w-[480px]">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Edit label</DialogTitle>
            <DialogDescription className="sr-only">Edit label name and color.</DialogDescription>
            <AppDialogEyebrow>Edit Label</AppDialogEyebrow>
            <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">Edit label</h2>
          </AppDialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col">
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <p className={cn('mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>Name</p>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Label name"
                  autoFocus
                  required
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </AppDialogSection>

              <AppDialogSection>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Color</p>
                <ColorGrid selected={editColor} onSelect={setEditColor} />
              </AppDialogSection>

              {editName.trim() && (
                <div className="pt-2">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Preview</p>
                  <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1', LABEL_COLORS[editColor].pill)}>
                    {editName.trim()}
                  </span>
                </div>
              )}
            </AppDialogBody>

            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditingLabel(null)} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">
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

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deletingLabel}
        title="Delete label"
        description={`Are you sure you want to delete "${deletingLabel?.name}"? It will be removed from all tasks that use it.`}
        confirmLabel="Delete label"
        onConfirm={handleDelete}
        onCancel={() => setDeletingLabel(null)}
      />
    </div>
  );
}

function ColorGrid({ selected, onSelect }: { selected: LabelColor; onSelect: (c: LabelColor) => void }) {
  return (
    <div className="grid grid-cols-10 gap-2">
      {LABEL_COLOR_LIST.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onSelect(color)}
          className={cn(
            'h-6 w-6 rounded-full transition-all hover:scale-110',
            LABEL_COLORS[color].swatch,
            selected === color
              ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
              : 'ring-1 ring-black/10 dark:ring-white/15 hover:ring-2 hover:ring-offset-1 hover:ring-offset-background'
          )}
          title={color}
        />
      ))}
    </div>
  );
}
