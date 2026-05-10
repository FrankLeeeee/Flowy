import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Task, List, Runner, Label as LabelType, TaskStatus } from "../../types";
import {
  fetchTasks,
  fetchRunners,
  fetchLabels,
  createTask,
  deleteTask,
  getTask,
  updateTask,
  fetchLists,
  updateList,
  deleteList,
} from "../../api/client";
import TaskTodoView from "@/components/tasks/TaskTodoView";
import MobileFilterSheet from "@/components/mobile/MobileFilterSheet";
import MobilePageLayout from "@/components/mobile/MobilePageLayout";
import CreateTaskModal from "@/components/tasks/CreateTaskModal";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmojiPicker from "@/components/EmojiPicker";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AppDialogBody,
  AppDialogContent,
  AppDialogEyebrow,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogSection,
  APP_DIALOG_TONE_STYLES,
} from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getToneStyles } from "@/lib/semanticColors";
import {
  ArrowLeft,
  SlidersHorizontal,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  DateFilterState,
  defaultDateFilter,
  filterTasksByDate,
} from "@/lib/dateFilter";

export default function MobileListDetail() {
  const neutralTone = getToneStyles("neutral");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [list, setList] = useState<List | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allLists, setAllLists] = useState<List[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [allLabels, setAllLabels] = useState<LabelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("_all");
  const [priorityFilter, setPriorityFilter] = useState("_all");
  const [runnerFilter, setRunnerFilter] = useState("_all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] =
    useState<DateFilterState>(defaultDateFilter());

  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);
  const [showEditList, setShowEditList] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasActiveFilters =
    statusFilter !== "_all" ||
    priorityFilter !== "_all" ||
    runnerFilter !== "_all" ||
    search !== "" ||
    dateFilter.mode !== "today";

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const filters: Record<string, string> = { list: id };
      if (statusFilter !== "_all") filters.status = statusFilter;
      if (priorityFilter !== "_all") filters.priority = priorityFilter;
      if (runnerFilter !== "_all") filters.runner = runnerFilter;
      if (search) filters.search = search;

      const [t, ls, r, l] = await Promise.all([
        fetchTasks(filters),
        fetchLists(),
        fetchRunners(),
        fetchLabels(),
      ]);
      const found = ls.find((p) => p.id === id);
      if (!found) {
        setError("List not found");
        setLoading(false);
        return;
      }
      setList(found);
      setAllLists(ls);
      setTasks(t);
      setRunners(r);
      setAllLabels(l);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter, priorityFilter, runnerFilter, search]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);
  useEffect(() => {
    const iv = setInterval(loadData, 10_000);
    return () => clearInterval(iv);
  }, [loadData]);

  useEffect(() => {
    const handler = () => setShowCreate(true);
    window.addEventListener("flowy:mobile-create", handler);
    return () => window.removeEventListener("flowy:mobile-create", handler);
  }, []);

  const handleCreateTask = async (data: Parameters<typeof createTask>[0]) => {
    await createTask(data);
    setShowCreate(false);
    loadData();
  };
  const confirmDeleteTask = async () => {
    if (!deleteTaskTarget) return;
    const taskId = deleteTaskTarget.id;
    setDeleteTaskTarget(null);
    await deleteTask(taskId);
    setDetailTask(null);
    loadData();
  };
  const handleTaskUpdate = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setDetailTask(updated);
  };
  const handleTaskClick = async (task: Task) => {
    try {
      setDetailTask(await getTask(task.id));
    } catch {
      setDetailTask(task);
    }
  };
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try { await updateTask(taskId, { status: newStatus }); }
    catch { loadData(); }
  };

  const openEditList = () => {
    if (!list) return;
    setEditName(list.name);
    setEditIcon(list.icon ?? null);
    setEditDescription(list.description ?? "");
    setShowEditList(true);
  };
  const handleEditList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list || !editName.trim()) return;
    try {
      const updated = await updateList(list.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        icon: editIcon,
      });
      setList(updated);
      setShowEditList(false);
    } catch (e) {
      setError(
        axios.isAxiosError<{ error?: string }>(e)
          ? (e.response?.data?.error ?? e.message)
          : e instanceof Error
            ? e.message
            : "Failed to update list",
      );
    }
  };
  const handleDeleteList = async () => {
    if (!list) return;
    try {
      await deleteList(list.id);
      setShowDeleteConfirm(false);
      navigate("/lists");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete list");
      setShowDeleteConfirm(false);
    }
  };

  // Apply date filter using the mandatory task date.
  const visibleTasks = filterTasksByDate(tasks, dateFilter);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="p-4 text-center py-20">
        <p className="text-[14px] text-muted-foreground/80">List not found</p>
        <Button
          variant="link"
          onClick={() => navigate("/lists")}
          className="mt-2 text-[13px] text-primary"
        >
          Back to Lists
        </Button>
      </div>
    );
  }

  return (
    <MobilePageLayout
      className="motion-drilldown"
      header={
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/lists")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 active:bg-muted/50"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold tracking-tight text-foreground truncate flex items-center gap-1.5">
                {list.icon && (
                  <span className="text-[18px] leading-none">{list.icon}</span>
                )}
                {list.name}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                  neutralTone.pill,
                )}
              >
                {visibleTasks.length} tasks
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 transition-colors active:bg-muted/50",
                hasActiveFilters && "border-primary/40 bg-primary/5",
              )}
            >
              <SlidersHorizontal
                className={cn(
                  "h-4 w-4",
                  hasActiveFilters ? "text-primary" : "text-muted-foreground",
                )}
              />
              {hasActiveFilters && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 active:bg-muted/50"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={openEditList}
                  className="text-[13px]"
                >
                  <Pencil className="h-3.5 w-3.5 mr-2 opacity-60" />
                  Edit List
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive focus:text-destructive text-[13px]"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2 opacity-60" />
                  Delete List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      }
    >

      {error && (
        <div className="mx-4 mt-3 rounded-xl px-3 py-2 text-[13px] text-destructive bg-destructive/10 ring-1 ring-destructive/15">
          {error}
        </div>
      )}

      {/* Task list */}
      <div className="px-4 pt-4">
        <TaskTodoView
          tasks={visibleTasks}
          allLabels={allLabels}
          runners={runners}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Filter sheet */}
      <MobileFilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        runners={runners}
        search={search}
        onSearchChange={setSearch}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        runnerFilter={runnerFilter}
        onRunnerChange={setRunnerFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        showStatus
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
      />

      {/* Modals */}
      <CreateTaskModal
        open={showCreate}
        lists={allLists}
        defaultListId={list.id}
        onSubmit={handleCreateTask}
        onClose={() => setShowCreate(false)}
      />
      {detailTask && (
        <TaskDetailModal
          open={!!detailTask}
          task={detailTask}
          runners={runners}
          onUpdate={handleTaskUpdate}
          onDelete={() => setDeleteTaskTarget(detailTask)}
          onClose={() => setDetailTask(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleteTaskTarget}
        title="Delete task"
        description={
          deleteTaskTarget
            ? `Delete "${deleteTaskTarget.title}"? Its execution history and output will be removed.`
            : ""
        }
        confirmLabel="Delete task"
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeleteTaskTarget(null)}
      />

      {/* Edit List Dialog */}
      <Dialog
        open={showEditList}
        onOpenChange={(open) => {
          if (!open) setShowEditList(false);
        }}
      >
        <AppDialogContent className="sm:max-w-[460px]">
          <AppDialogHeader>
            <DialogTitle className="sr-only">Edit list</DialogTitle>
            <DialogDescription className="sr-only">
              Update the list name, icon and description.
            </DialogDescription>
            <AppDialogEyebrow>
              <Pencil className="h-3 w-3" /> List settings
            </AppDialogEyebrow>
            <h2 className="hidden text-[18px] font-semibold tracking-[-0.025em] text-foreground sm:block">
              Edit {list.name}
            </h2>
          </AppDialogHeader>
          <form onSubmit={handleEditList} className="flex flex-col gap-4">
            <AppDialogBody>
              <AppDialogSection tone="primary">
                <Label
                  className={cn(
                    "mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]",
                    APP_DIALOG_TONE_STYLES.primary.label,
                  )}
                >
                  List Name
                </Label>
                <div className="flex items-center gap-2">
                  <EmojiPicker value={editIcon} onChange={setEditIcon} />
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="List name"
                    autoFocus
                    required
                    className="h-auto border-0 bg-transparent px-0 py-0 text-[18px] font-semibold tracking-[-0.02em] text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </AppDialogSection>
              <AppDialogSection>
                <Label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
                  Description
                </Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="min-h-[92px] resize-none border-0 bg-transparent px-0 py-0 text-[13px] leading-6 shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </AppDialogSection>
            </AppDialogBody>
            <AppDialogFooter>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEditList(false)}
                  className="rounded-full px-3.5 text-[11px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!editName.trim()}
                  className="rounded-full px-4 text-[11px]"
                >
                  Save changes
                </Button>
              </div>
            </AppDialogFooter>
          </form>
        </AppDialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete list"
        description={`Are you sure you want to delete "${list.name}"? All tasks will be permanently removed.`}
        confirmLabel="Delete list"
        onConfirm={handleDeleteList}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </MobilePageLayout>
  );
}
