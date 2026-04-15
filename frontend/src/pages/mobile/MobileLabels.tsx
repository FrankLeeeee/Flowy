import { useState, useEffect, useCallback } from 'react';
import { Label as LabelType, LabelColor } from '../../types';
import { fetchLabels, createLabel, updateLabel, deleteLabel } from '../../api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection, APP_DIALOG_TONE_STYLES } from '@/components/ui/app-dialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { LABEL_COLORS, LABEL_COLOR_LIST, getToneStyles } from '@/lib/semanticColors';
import { cn } from '@/lib/utils';
import { Tags, Plus, Pencil, Trash2, ArrowRight, Sparkles } from 'lucide-react';

export default function MobileLabels() {
  const neutralTone = getToneStyles('neutral');

  const [labels, setLabels] = useState<LabelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LabelType | null>(null);
  const [deletingLabel, setDeletingLabel] = useState<LabelType | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<LabelColor>('blue');
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<LabelColor>('blue');
  const [error, setError] = useState('');

  const loadLabels = useCallback(async () => {
    try { setLabels(await fetchLabels()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load labels'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadLabels(); }, [loadLabels]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createLabel({ name: newName.trim(), color: newColor });
      setShowCreate(false); setNewName(''); setNewColor('blue'); loadLabels();
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
      setEditingLabel(null); loadLabels();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to update label');
    }
  };

  const handleDelete = async () => {
    if (!deletingLabel) return;
    try { await deleteLabel(deletingLabel.id); setDeletingLabel(null); loadLabels(); }
    catch { setError('Failed to delete label'); }
  };

  const openEdit = (label: LabelType) => {
    setEditingLabel(label); setEditName(label.name); setEditColor(label.color);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-24" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-lg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-foreground">Labels</h1>
            <span className={cn('mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', neutralTone.pill)}>
              {labels.length} labels
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft active:opacity-90"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {error && <div className="mx-4 mt-3 rounded-xl px-3 py-2 text-[13px] text-destructive bg-destructive/10 ring-1 ring-destructive/15">{error}</div>}

      {/* Label list */}
      <div>
        {labels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Tags className="h-10 w-10 text-foreground/10 mb-4" />
            <p className="text-[14px] font-medium text-muted-foreground/80">No labels yet</p>
            <p className="mt-1 mb-5 text-[12px] text-muted-foreground/70">Create your first label</p>
            <Button onClick={() => setShowCreate(true)} size="sm" className="h-9 rounded-xl text-[13px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Label
            </Button>
          </div>
        ) : (
          <div>
            {labels.map((label) => {
              const colorStyles = LABEL_COLORS[label.color];
              return (
                <div
                  key={label.id}
                  className="flex items-center gap-3 border-b border-border/40 bg-card px-4 py-3.5"
                >
                  <span className={cn('h-4 w-4 rounded-full shrink-0', colorStyles.swatch)} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-medium text-foreground">{label.name}</span>
                  </div>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1', colorStyles.pill)}>
                    {label.name}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEdit(label)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground active:bg-accent"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingLabel(label)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground active:text-destructive"
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
            <AppDialogEyebrow><Sparkles className="h-3 w-3" /> New Label</AppDialogEyebrow>
            <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">Create a new label</h2>
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
                <MobileColorGrid selected={newColor} onSelect={setNewColor} />
              </AppDialogSection>
              {newName.trim() && (
                <div className="pt-2">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Preview</p>
                  <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1', LABEL_COLORS[newColor].pill)}>{newName.trim()}</span>
                </div>
              )}
            </AppDialogBody>
            <AppDialogFooter>
              <div className="text-[11px] text-muted-foreground/80">{newName.trim() ? 'Ready to create.' : 'Add a name to continue.'}</div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); setNewName(''); setNewColor('blue'); }} className="rounded-full px-3.5 text-[11px]">Cancel</Button>
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
            <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">Edit label</h2>
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
                <MobileColorGrid selected={editColor} onSelect={setEditColor} />
              </AppDialogSection>
              {editName.trim() && (
                <div className="pt-2">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Preview</p>
                  <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1', LABEL_COLORS[editColor].pill)}>{editName.trim()}</span>
                </div>
              )}
            </AppDialogBody>
            <AppDialogFooter>
              <div className="text-[11px] text-muted-foreground/80">{editName.trim() ? 'Ready to save.' : 'Add a name.'}</div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditingLabel(null)} className="rounded-full px-3.5 text-[11px]">Cancel</Button>
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
        open={!!deletingLabel}
        title="Delete label"
        description={`Are you sure you want to delete "${deletingLabel?.name}"?`}
        confirmLabel="Delete label"
        onConfirm={handleDelete}
        onCancel={() => setDeletingLabel(null)}
      />
    </div>
  );
}

function MobileColorGrid({ selected, onSelect }: { selected: LabelColor; onSelect: (c: LabelColor) => void }) {
  return (
    <div className="grid grid-cols-8 gap-2.5">
      {LABEL_COLOR_LIST.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onSelect(color)}
          className={cn(
            'h-7 w-7 rounded-full transition-all active:scale-95',
            LABEL_COLORS[color].swatch,
            selected === color
              ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
              : 'ring-1 ring-black/10 dark:ring-white/15',
          )}
          title={color}
        />
      ))}
    </div>
  );
}
