import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, List, Runner, Label as LabelType, TaskStatus, Workspace } from '../types';
import { parseWorkspaces } from 'flowy-shared';
import {
  fetchTasks, fetchRunners, fetchLabels, createTask, deleteTask, getTask, updateTask,
  fetchLists, updateList, deleteList,
} from '../api/client';
import TaskListView from '../components/tasks/TaskListView';
import KanbanBoard from '../components/tasks/KanbanBoard';
import TaskTodoView from '../components/tasks/TaskTodoView';
import TaskFilterBar, { ViewMode } from '../components/tasks/TaskFilterBar';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmojiPicker from '../components/EmojiPicker';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppDialogBody, AppDialogContent, AppDialogEyebrow, AppDialogFooter, AppDialogHeader, AppDialogSection, APP_DIALOG_TONE_STYLES } from '@/components/ui/app-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { FolderOpen, Plus, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToneStyles } from '@/lib/semanticColors';
import { DateFilterState, defaultDateFilter, filterTasksByDate } from '@/lib/dateFilter';
import { getDesktopPageContainerClassName } from '@/lib/pageLayout';

export default function ListDetail() {
  const neutralTone = getToneStyles('neutral');
  const dangerTone = getToneStyles('danger');

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [list, setList] = useState<List | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allLists, setAllLists] = useState<List[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [allLabels, setAllLabels] = useState<LabelType[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('todo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('_all');
  const [priorityFilter, setPriorityFilter] = useState('_all');
  const [runnerFilter, setRunnerFilter] = useState('_all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterState>(defaultDateFilter());

  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);
  const [showEditList, setShowEditList] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editWorkspaces, setEditWorkspaces] = useState<Workspace[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspacePath, setNewWorkspacePath] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const filters: Record<string, string> = { list: id };
      if (statusFilter !== '_all') filters.status = statusFilter;
      if (priorityFilter !== '_all') filters.priority = priorityFilter;
      if (runnerFilter !== '_all') filters.runner = runnerFilter;
      if (search) filters.search = search;

      const [t, ls, r, l] = await Promise.all([fetchTasks(filters), fetchLists(), fetchRunners(), fetchLabels()]);
      const found = ls.find((p) => p.id === id);
      if (!found) { setError('List not found'); setLoading(false); return; }
      setList(found); setAllLists(ls); setTasks(t); setRunners(r); setAllLabels(l); setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter, priorityFilter, runnerFilter, search]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);
  useEffect(() => { const iv = setInterval(loadData, 10_000); return () => clearInterval(iv); }, [loadData]);

  const handleCreateTask = async (data: Parameters<typeof createTask>[0]) => { await createTask(data); setShowCreate(false); loadData(); };
  const confirmDeleteTask = async () => {
    if (!deleteTaskTarget) return;
    const taskId = deleteTaskTarget.id;
    setDeleteTaskTarget(null);
    await deleteTask(taskId);
    setDetailTask(null);
    loadData();
  };
  const handleTaskUpdate = (updated: Task) => { setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t))); setDetailTask(updated); };
  const handleTaskClick = async (task: Task) => { try { setDetailTask(await getTask(task.id)); } catch { setDetailTask(task); } };
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try { await updateTask(taskId, { status: newStatus }); }
    catch { loadData(); }
  };

  const openEditList = () => {
    if (!list) return;
    setEditName(list.name);
    setEditIcon(list.icon ?? null);
    setEditDescription(list.description ?? '');
    setEditWorkspaces(parseWorkspaces(list.workspaces));
    setNewWorkspaceName('');
    setNewWorkspacePath('');
    setShowEditList(true);
  };
  const handleEditList = async (e: React.FormEvent) => {
    e.preventDefault(); if (!list || !editName.trim()) return;
    try {
      const updated = await updateList(list.id, { name: editName.trim(), description: editDescription.trim(), icon: editIcon, workspaces: editWorkspaces });
      setList(updated); setShowEditList(false);
    } catch (e) {
      setError(
        axios.isAxiosError<{ error?: string }>(e)
          ? e.response?.data?.error ?? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to update list',
      );
    }
  };
  const handleDeleteList = async () => {
    if (!list) return;
    try { await deleteList(list.id); setShowDeleteConfirm(false); navigate('/inbox'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete list'); setShowDeleteConfirm(false); }
  };

  const pushPendingWorkspace = () => {
    const path = newWorkspacePath.trim();
    if (!path) return;
    setEditWorkspaces((prev) => [...prev, { name: newWorkspaceName.trim() || path, path }]);
    setNewWorkspaceName('');
    setNewWorkspacePath('');
  };

  // Apply date filter using the mandatory task date.
  const visibleTasks = filterTasksByDate(tasks, dateFilter);

  if (loading) {
    return (
      <div className="p-6 space-y-5 motion-section" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="p-6 text-center text-muted-foreground py-20">
        <p className="text-[14px]">List not found</p>
        <Button variant="link" onClick={() => navigate('/inbox')} className="text-[13px] text-primary">Go to Inbox</Button>
      </div>
    );
  }

  return (
    <div className={getDesktopPageContainerClassName({ lockToViewport: viewMode === 'kanban' })}>
      {/* Header */}
      <div className="motion-section mb-6 flex shrink-0 flex-wrap items-center justify-between gap-3" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
        <div>
          <PageTitle icon={FolderOpen} title={list.name} emoji={list.icon ?? undefined} />
          {list.description && (
            <p className="mt-1.5 text-[12px] text-muted-foreground/85">{list.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', neutralTone.pill)}>{tasks.length} scoped tasks</span>
            <span className={cn('inline-flex items-center rounded-full px-2 py-1 font-semibold ring-1', neutralTone.pill)}>{runners.length} runner options</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 text-[13px] shadow-soft">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Task
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEditList} className="text-[13px]">
                <Pencil className="h-3.5 w-3.5 mr-2 opacity-60" />Edit List
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive text-[13px]">
                <Trash2 className="h-3.5 w-3.5 mr-2 opacity-60" />Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && <div className={cn('mb-4 rounded-md px-3 py-2 text-[13px] ring-1', dangerTone.panel, dangerTone.text)}>{error}</div>}

      <TaskFilterBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        runnerFilter={runnerFilter}
        onRunnerFilterChange={setRunnerFilter}
        search={search}
        onSearchChange={setSearch}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        runners={runners}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        availableViews={['todo', 'list', 'kanban']}
        taskCount={visibleTasks.length}
      />

      <div
        key={viewMode}
        className={cn(
          'motion-section motion-switch',
          viewMode === 'kanban' && 'flex min-h-0 flex-1 flex-col',
        )}
        style={{ '--motion-delay': '200ms' } as React.CSSProperties}
      >
        {viewMode === 'kanban' ? (
          <KanbanBoard tasks={visibleTasks} runners={runners} allLabels={allLabels} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />
        ) : viewMode === 'list' ? (
          <TaskListView tasks={visibleTasks} runners={runners} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />
        ) : (
          <TaskTodoView tasks={visibleTasks} allLabels={allLabels} runners={runners} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />
        )}
      </div>

      <CreateTaskModal open={showCreate} lists={allLists} defaultListId={list.id} onSubmit={handleCreateTask} onClose={() => setShowCreate(false)} />
      {detailTask && <TaskDetailModal open={!!detailTask} task={detailTask} runners={runners} lists={allLists} onUpdate={handleTaskUpdate} onDelete={() => setDeleteTaskTarget(detailTask)} onClose={() => setDetailTask(null)} />}
      <ConfirmDialog
        open={!!deleteTaskTarget}
        title="Delete task"
        description={deleteTaskTarget ? `Delete "${deleteTaskTarget.title}"? Its execution history and output will be removed.` : ''}
        confirmLabel="Delete task"
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteTaskTarget(null)}
      />

      <Dialog open={showEditList} onOpenChange={(open) => { if (!open) setShowEditList(false); }}>
          <AppDialogContent className="sm:max-w-[460px]">
            <AppDialogHeader>
              <DialogTitle className="sr-only">Edit list</DialogTitle>
              <DialogDescription className="sr-only">Update the list name, icon and description.</DialogDescription>
              <AppDialogEyebrow>
                <Pencil className="h-3 w-3" />
                List settings
              </AppDialogEyebrow>
              <div className="hidden flex-wrap items-end justify-between gap-3 sm:flex">
                <div className="min-w-0">
                  <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-foreground">Edit {list.name}</h2>
                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground/85">List names must stay unique. Renaming a list updates its task references too.</p>
                </div>
              </div>
            </AppDialogHeader>
            <form onSubmit={handleEditList} className="flex flex-col gap-4">
              <AppDialogBody>
                <AppDialogSection tone="primary">
                  <Label className={cn('mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]', APP_DIALOG_TONE_STYLES.primary.label)}>List Name</Label>
                  <div className="flex items-center gap-2">
                    <EmojiPicker value={editIcon} onChange={setEditIcon} />
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="List name" autoFocus required className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0" />
                  </div>
                </AppDialogSection>
                <AppDialogSection>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Description</Label>
                    <span className="text-[10px] text-muted-foreground/75">{editDescription.trim().length} chars</span>
                  </div>
                  <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional description..." rows={3} className="min-h-[92px] resize-none border-0 bg-transparent px-0 py-0 text-[13px] leading-6 shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0" />
                </AppDialogSection>

                <AppDialogSection>
                  <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">Workspaces</Label>
                  <p className="mb-3 text-[11px] text-muted-foreground/70">Give each workspace a name and path so runners can pick them by name when assigning tasks.</p>
                  {editWorkspaces.length > 0 && (
                    <div className="mb-3 flex flex-col gap-1.5">
                      {editWorkspaces.map((ws, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2 py-1.5">
                          <FolderOpen className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                          <Input
                            value={ws.name}
                            onChange={(e) => setEditWorkspaces((prev) => prev.map((w, idx) => idx === i ? { ...w, name: e.target.value } : w))}
                            placeholder="Workspace name"
                            className="h-7 w-[130px] shrink-0 rounded border-border/40 bg-card text-[12px] shadow-none"
                          />
                          <Input
                            value={ws.path}
                            onChange={(e) => setEditWorkspaces((prev) => prev.map((w, idx) => idx === i ? { ...w, path: e.target.value } : w))}
                            placeholder="/path/to/workspace"
                            className="h-7 flex-1 rounded border-border/40 bg-card text-[12px] font-mono shadow-none"
                          />
                          <button
                            type="button"
                            onClick={() => setEditWorkspaces((prev) => prev.filter((_, idx) => idx !== i))}
                            className="rounded p-0.5 text-muted-foreground/50 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      placeholder="Name"
                      className="h-8 w-[130px] shrink-0 rounded-lg border-border/60 bg-card text-[12px] shadow-soft"
                    />
                    <Input
                      value={newWorkspacePath}
                      onChange={(e) => setNewWorkspacePath(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newWorkspacePath.trim()) {
                          e.preventDefault();
                          pushPendingWorkspace();
                        }
                      }}
                      placeholder="/path/to/workspace"
                      className="h-8 flex-1 rounded-lg border-border/60 bg-card text-[12px] font-mono shadow-soft"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!newWorkspacePath.trim()}
                      onClick={pushPendingWorkspace}
                      className="h-8 rounded-lg text-[11px]"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </AppDialogSection>
              </AppDialogBody>
              <AppDialogFooter>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowEditList(false)} className="rounded-full px-3.5 text-[11px] text-muted-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground">Cancel</Button>
                  <Button type="submit" disabled={!editName.trim()} className="rounded-full px-4 text-[11px]">Save changes</Button>
                </div>
              </AppDialogFooter>
            </form>
          </AppDialogContent>
        </Dialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete list"
        description={`Are you sure you want to delete "${list.name}"? All tasks in this list will be permanently removed.`}
        confirmLabel="Delete list"
        onConfirm={handleDeleteList}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
