import { useState, useEffect, useCallback } from "react";
import { Task, List, Runner, Label, TaskStatus } from "../../types";
import {
  fetchTasks,
  fetchLists,
  fetchRunners,
  fetchLabels,
  createTask,
  deleteTask,
  getTask,
  updateTask,
} from "../../api/client";
import TaskTodoView from "@/components/tasks/TaskTodoView";
import MobilePageLayout from "@/components/mobile/MobilePageLayout";
import MobileFilterSheet from "@/components/mobile/MobileFilterSheet";
import CreateTaskModal from "@/components/tasks/CreateTaskModal";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getToneStyles } from "@/lib/semanticColors";
import {
  DateFilterState,
  defaultDateFilter,
  filterTasksByDate,
} from "@/lib/dateFilter";
import { SlidersHorizontal } from "lucide-react";

export default function MobileInbox() {
  const successTone = getToneStyles("success");
  const neutralTone = getToneStyles("neutral");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

  const [priorityFilter, setPriorityFilter] = useState("_all");
  const [runnerFilter, setRunnerFilter] = useState("_all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] =
    useState<DateFilterState>(defaultDateFilter());

  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const hasActiveFilters =
    priorityFilter !== "_all" ||
    runnerFilter !== "_all" ||
    search !== "" ||
    dateFilter.mode !== "today";

  const loadData = useCallback(async () => {
    try {
      const filters: {
        inbox: "1";
        priority?: string;
        runner?: string;
        search?: string;
      } = { inbox: "1" };
      if (priorityFilter !== "_all") filters.priority = priorityFilter;
      if (runnerFilter !== "_all") filters.runner = runnerFilter;
      if (search) filters.search = search;

      const [t, ls, r, l] = await Promise.all([
        fetchTasks(filters),
        fetchLists(),
        fetchRunners(),
        fetchLabels(),
      ]);
      setTasks(t.filter((task) => task.status !== "cancelled"));
      setLists(ls);
      setRunners(r);
      setAllLabels(l);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, runnerFilter, search]);

  useEffect(() => {
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
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await deleteTask(id);
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

  const visibleTasks = filterTasksByDate(tasks, dateFilter);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <MobilePageLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">
              Inbox
            </h1>
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1",
                  neutralTone.pill,
                )}
              >
                {tasks.length} active
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1",
                  successTone.pill,
                )}
              >
                {runners.length} runners
              </span>
            </div>
          </div>
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
        </div>
      }
    >
      <div className="px-4 pt-4">
        <TaskTodoView
          tasks={visibleTasks}
          allLabels={allLabels}
          runners={runners}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
        />
      </div>

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
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
      />

      <CreateTaskModal
        open={showCreate}
        lists={lists}
        onSubmit={handleCreateTask}
        onClose={() => setShowCreate(false)}
      />
      {detailTask && (
        <TaskDetailModal
          open={!!detailTask}
          task={detailTask}
          runners={runners}
          onUpdate={handleTaskUpdate}
          onDelete={() => setDeleteTarget(detailTask)}
          onClose={() => setDetailTask(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete task"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.title}"? Its execution history and output will be removed.`
            : ""
        }
        confirmLabel="Delete task"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </MobilePageLayout>
  );
}
