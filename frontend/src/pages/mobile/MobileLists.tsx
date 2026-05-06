import axios from 'axios';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { List } from '../../types';
import { fetchLists, createList, deleteList } from '../../api/client';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection, APP_DIALOG_TONE_STYLES } from '@/components/ui/app-dialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmojiPicker from '@/components/EmojiPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getToneStyles } from '@/lib/semanticColors';
import { FolderKanban, Plus, ChevronRight, Trash2, ArrowRight, Sparkles } from 'lucide-react';

export default function MobileLists() {
  const neutralTone = getToneStyles('neutral');

  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState<string | null>(null);
  const [newListError, setNewListError] = useState('');
  const [deletingList, setDeletingList] = useState<List | null>(null);
  const navigate = useNavigate();

  const loadLists = async () => {
    try {
      setLists(await fetchLists());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLists(); }, []);

  useEffect(() => {
    const handler = () => setShowNewList(true);
    window.addEventListener('flowy:mobile-create', handler);
    return () => window.removeEventListener('flowy:mobile-create', handler);
  }, []);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    try {
      const list = await createList({ name, icon: newListIcon });
      closeNewListDialog();
      loadLists();
      navigate(`/list/${list.id}`);
    } catch (error) {
      setNewListError(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error ?? error.message
          : error instanceof Error ? error.message : 'Failed to create list',
      );
    }
  };

  const closeNewListDialog = () => {
    setShowNewList(false);
    setNewListName('');
    setNewListIcon(null);
    setNewListError('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingList) return;
    await deleteList(deletingList.id);
    setDeletingList(null);
    loadLists();
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-lg px-4 pt-3 pb-3">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-foreground">Lists</h1>
          <span className={cn('mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', neutralTone.pill)}>
            {lists.length} lists
          </span>
        </div>
      </div>

      {/* List of lists */}
      <div>
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <FolderKanban className="h-10 w-10 text-foreground/10 mb-4" />
            <p className="text-[14px] font-medium text-muted-foreground/80">No lists yet</p>
            <p className="mt-1 mb-5 text-[12px] text-muted-foreground/70">Create your first list</p>
            <Button onClick={() => setShowNewList(true)} size="sm" className="h-9 rounded-xl text-[13px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New List
            </Button>
          </div>
        ) : (
          lists.map((list) => (
            <div key={list.id} className="group relative">
              <button
                type="button"
                onClick={() => navigate(`/list/${list.id}`)}
                className="flex w-full items-center gap-3 border-b border-border/40 bg-card px-4 py-3.5 text-left active:bg-muted/50 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-foreground/[0.03] text-[18px] leading-none">
                  {list.icon ?? <FolderKanban className="h-4 w-4 text-primary/70" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-foreground truncate">{list.name}</p>
                  {list.description && (
                    <p className="mt-0.5 text-[12px] text-muted-foreground/75 truncate">{list.description}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              </button>

              <button
                type="button"
                onClick={() => setDeletingList(list)}
                className="absolute right-14 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/50 active:text-destructive"
                aria-label={`Delete ${list.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* New List Dialog */}
      <Dialog open={showNewList} onOpenChange={(open) => { if (!open) closeNewListDialog(); }}>
        <AppDialogContent className="sm:max-w-[440px]">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Create a new list</DialogTitle>
            <DialogDescription className="sr-only">Create a list with a unique name.</DialogDescription>
            <AppDialogEyebrow>
              <Sparkles className="h-3 w-3" />
              New List
            </AppDialogEyebrow>
            <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">Create a new list</h2>
          </AppDialogHeader>
          <form onSubmit={handleCreateList} className="flex flex-col">
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <Label className={cn('mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>List Name</Label>
                <div className="flex items-center gap-2">
                  <EmojiPicker value={newListIcon} onChange={setNewListIcon} />
                  <Input
                    value={newListName}
                    onChange={(e) => { setNewListName(e.target.value); if (newListError) setNewListError(''); }}
                    placeholder="My List"
                    autoFocus
                    required
                    className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {newListError && (
                  <p className="mt-2 text-[11px] text-destructive/85">{newListError}</p>
                )}
              </AppDialogSection>
            </AppDialogBody>
            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={closeNewListDialog} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">Cancel</Button>
                <Button type="submit" disabled={!newListName.trim()} className="rounded-full px-4 text-[11px]">
                  Create list
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </AppDialogFooter>
          </form>
        </AppDialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingList}
        title="Delete list"
        description={`Are you sure you want to delete "${deletingList?.name}"? All tasks in this list will be permanently removed.`}
        confirmLabel="Delete list"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingList(null)}
      />
    </div>
  );
}
