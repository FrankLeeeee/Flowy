import axios from 'axios';
import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { fetchLists, createList, deleteList, reorderLists } from '../api/client';
import { List } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection, APP_DIALOG_TONE_STYLES } from '@/components/ui/app-dialog';
import ConfirmDialog from './ConfirmDialog';
import EmojiPicker from './EmojiPicker';
import ChangePasswordDialog from './ChangePasswordDialog';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme';
import {
  Inbox, FolderKanban, LayoutList, Bot, Tags, BarChart2, MessagesSquare,
  Plus, ChevronRight, Trash2, GripVertical,
  Sun, Moon, Monitor,
  ArrowRight, Sparkles, LogOut, KeyRound,
  CalendarDays, CalendarRange, Layers,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationToggle from './NotificationToggle';
import { useReconnectRefresh } from '@/hooks/useSyncStatus';

export default function Sidebar() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [lists, setLists] = useState<List[]>([]);
  const [listsOpen, setListsOpen] = useState(true);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState<string | null>(null);
  const [newListError, setNewListError] = useState('');
  const [deletingList, setDeletingList] = useState<List | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const navigate = useNavigate();

  const loadLists = async () => {
    try {
      setLists(await fetchLists());
    } catch { /* ignore */ }
  };

  useEffect(() => { loadLists(); }, []);

  useEffect(() => {
    const iv = setInterval(loadLists, 10_000);
    return () => clearInterval(iv);
  }, []);

  useReconnectRefresh(loadLists);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = newListName.trim();
    if (!normalizedName) return;
    try {
      const list = await createList({ name: normalizedName, icon: newListIcon });
      closeNewListDialog();
      loadLists();
      navigate(`/list/${list.id}`);
    } catch (error) {
      setNewListError(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error ?? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to create list',
      );
    }
  };

  const closeNewListDialog = () => {
    setShowNewList(false);
    setNewListName('');
    setNewListIcon(null);
    setNewListError('');
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/list-index', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIdx(index);
  };

  const handleDrop = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIdx;
    setDragIdx(null);
    setDropIdx(null);
    if (fromIndex === null || fromIndex === toIndex) return;

    const reordered = [...lists];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setLists(reordered);

    try {
      await reorderLists(reordered.map((l) => l.id));
    } catch {
      loadLists();
    }
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDropIdx(null);
  };

  const handleDeleteClick = (list: List, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingList(list);
  };

  const handleConfirmDelete = async () => {
    if (!deletingList) return;
    await deleteList(deletingList.id);
    setDeletingList(null);
    loadLists();
    navigate('/inbox');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'interactive-lift flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium w-full motion-safe:hover:translate-x-0.5',
      isActive
        ? 'bg-primary/[0.085] text-foreground'
        : 'text-muted-foreground/90 hover:text-foreground hover:bg-primary/[0.04]'
    );

  return (
    <>
      <aside className="motion-section w-[220px] bg-sidebar flex flex-col h-screen sticky top-0 border-r border-border/70" style={{ '--motion-delay': '40ms' } as React.CSSProperties}>
        {/* Logo */}
        <div className="h-[60px] px-4 flex items-center shrink-0 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192.png"
              alt="Flowy"
              className="h-8 w-8"
            />
            <div className="flex min-w-0 items-center">
              <span className="block pt-[1px] font-semibold tracking-[-0.01em] text-[16px] leading-none text-foreground">Flowy</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          <nav className="flex flex-col gap-0.5 pb-3">
            {/* Schedule views */}
            <NavLink to="/today" className={navLinkClass}>
              <CalendarDays className="h-4 w-4 shrink-0 opacity-60" />
              Today
            </NavLink>
            <NavLink to="/this-week" className={navLinkClass}>
              <CalendarRange className="h-4 w-4 shrink-0 opacity-60" />
              This Week
            </NavLink>
            <NavLink to="/all" className={navLinkClass}>
              <Layers className="h-4 w-4 shrink-0 opacity-60" />
              All
            </NavLink>
            {/* Inbox */}
            <NavLink to="/inbox" className={navLinkClass}>
              <Inbox className="h-4 w-4 shrink-0 opacity-60" />
              Inbox
            </NavLink>
            {/* Lists section */}
            <div className="mt-5">
              <div className="mb-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setListsOpen((v) => !v)}
                  className="interactive-lift flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-muted-foreground/90 hover:text-foreground hover:bg-primary/[0.04] motion-safe:hover:translate-x-0.5"
                >
                  <LayoutList className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="flex-1 text-left">Lists</span>
                  <ChevronRight className={cn('h-3 w-3 shrink-0 transition-transform duration-200 ease-[var(--ease-out-quart)]', listsOpen && 'rotate-90')} />
                </button>
                <button
                  type="button"
                  className="interactive-lift rounded-md border-2 border-primary/35 bg-background p-1 text-primary/85 hover:border-primary/55 hover:bg-primary/8 hover:text-primary motion-safe:hover:-translate-y-0.5"
                  onClick={() => setShowNewList(true)}
                  aria-label="Create list"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div
                className={cn(
                  'grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-quart)]',
                  listsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-70',
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    {lists.map((list, index) => (
                      <div
                        key={list.id}
                        className={cn(
                          'group relative',
                          dragIdx === index && 'opacity-40',
                          dropIdx === index && dragIdx !== index && 'border-t-2 border-primary/50',
                        )}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <NavLink
                          to={`/list/${list.id}`}
                          className={(props) => cn(navLinkClass(props), 'pl-2 pr-8')}
                        >
                          <GripVertical className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing" />
                          {list.icon ? (
                            <span className="text-[14px] leading-none">{list.icon}</span>
                          ) : (
                            <FolderKanban className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          )}
                          <span className="truncate flex-1">{list.name}</span>
                        </NavLink>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(list, e)}
                          className="interactive-lift absolute right-2 top-1/2 -mr-0.5 -translate-y-1/2 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:text-destructive motion-safe:hover:scale-110"
                          aria-label={`Delete ${list.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {lists.length === 0 && (
                      <p className="px-5 py-2 text-[11px] text-muted-foreground/75">No lists yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom section */}
            <div className="mt-5 flex flex-col gap-0.5">
              <NavLink to="/labels" className={navLinkClass}>
                <Tags className="h-4 w-4 shrink-0 opacity-60" />
                Labels
              </NavLink>
              <NavLink to="/sessions" className={navLinkClass}>
                <MessagesSquare className="h-4 w-4 shrink-0 opacity-60" />
                Sessions
              </NavLink>
              <NavLink to="/runners" className={navLinkClass}>
                <Bot className="h-4 w-4 shrink-0 opacity-60" />
                Runners
              </NavLink>
              <NavLink to="/skills" className={navLinkClass}>
                <Sparkles className="h-4 w-4 shrink-0 opacity-60" />
                Skills
              </NavLink>
              <NavLink to="/stats" className={navLinkClass}>
                <BarChart2 className="h-4 w-4 shrink-0 opacity-60" />
                Stats
              </NavLink>
            </div>

          </nav>
        </ScrollArea>

        {/* Bottom bar: notifications + theme toggle + logout */}
        <div className="shrink-0 border-t border-border/60 px-3 py-3">
          <div className="mb-2">
            <NotificationToggle />
          </div>
          <div className="mb-2 flex items-center gap-1">
            <div className="flex flex-1 items-center rounded-lg border border-border/60 bg-background/80 p-0.5">
              {([
                { value: 'light' as const, icon: Sun, label: 'Light' },
                { value: 'system' as const, icon: Monitor, label: 'System' },
                { value: 'dark' as const, icon: Moon, label: 'Dark' },
              ]).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-label={label}
                  className={cn(
                    'interactive-lift flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors duration-150',
                    theme === value
                      ? 'bg-primary/10 text-primary shadow-soft'
                      : 'text-muted-foreground/75 hover:text-foreground'
                  )}
                >
                  <Icon className="h-3 w-3" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              aria-label="Change password"
              title="Change password"
              className="interactive-lift flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground transition-colors duration-150"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => logout()}
              aria-label="Sign out"
              title="Sign out"
              className="interactive-lift flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors duration-150"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <ChangePasswordDialog open={showChangePassword} onClose={() => setShowChangePassword(false)} />

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
            <div className="hidden flex-wrap items-end justify-between gap-3 sm:flex">
              <div className="min-w-0">
                <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">Create a new list</h2>
              </div>
            </div>
          </AppDialogHeader>
          <form onSubmit={handleCreateList} className="flex flex-col">
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <Label className={cn('mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>List Name</Label>
                <div className="flex items-center gap-2">
                  <EmojiPicker value={newListIcon} onChange={setNewListIcon} />
                  <Input
                    value={newListName}
                    onChange={(e) => {
                      setNewListName(e.target.value);
                      if (newListError) setNewListError('');
                    }}
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
                <Button type="button" variant="ghost" onClick={closeNewListDialog} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">
                  Cancel
                </Button>
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
    </>
  );
}
