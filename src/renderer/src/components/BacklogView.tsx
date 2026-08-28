import { useEffect, useState, useMemo } from "react";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import type { Task, TaskPriority } from "@shared/models";
import { useTaskStore } from "../stores/taskStore";
import { useToastStore } from "../stores/toastStore";
import { TaskItem } from "./TaskItem";
import { TaskForm } from "./TaskForm";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

type SortOption =
  | "priority-high"
  | "priority-low"
  | "created-newest"
  | "created-oldest"
  | "title-az"
  | "title-za";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "priority-high", label: "Priority ↓" },
  { value: "priority-low", label: "Priority ↑" },
  { value: "created-newest", label: "Newest" },
  { value: "created-oldest", label: "Oldest" },
  { value: "title-az", label: "A → Z" },
  { value: "title-za", label: "Z → A" },
];

const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

function sortTasks(tasks: Task[], sort: SortOption): Task[] {
  const sorted = [...tasks];
  switch (sort) {
    case "priority-high":
      return sorted.sort(
        (a, b) => PRIORITY_RANK[b.priority]! - PRIORITY_RANK[a.priority]!,
      );
    case "priority-low":
      return sorted.sort(
        (a, b) => PRIORITY_RANK[a.priority]! - PRIORITY_RANK[b.priority]!,
      );
    case "created-newest":
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case "created-oldest":
      return sorted.sort((a, b) => a.createdAt - b.createdAt);
    case "title-az":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "title-za":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    default:
      return sorted;
  }
}

function getTodayMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function BacklogView() {
  const {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    clearError,
  } = useTaskStore();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("created-newest");
  const [showSearch, setShowSearch] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(
      (t) => t.scheduledDate === null && t.status !== "completed",
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q),
      );
    }
    return sortTasks(result, sort);
  }, [tasks, search, sort]);

  const handleCreate = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleInlineSave = async (
    task: Task,
    values: { title: string; priority: TaskPriority; estimatedMinutes: number },
  ) => {
    await updateTask(task.id, values);
  };

  const handleDelete = (task: Task) => setDeletingTask(task);

  const handleMoveToToday = async (task: Task) => {
    const success = await updateTask(task.id, {
      scheduledDate: getTodayMidnight(),
    });
    if (success) {
      addToast("success", `Moved "${task.title}" to Today`);
      return;
    }
    addToast(
      "error",
      useTaskStore.getState().error ?? "Failed to move task to Today.",
    );
  };
  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    const ok = await deleteTask(deletingTask.id);
    if (ok) setDeletingTask(null);
  };
  const handleFormSubmit = async (data: {
    title: string;
    priority: TaskPriority;
    estimatedMinutes: number;
    description: string;
  }) => {
    if (editingTask) return updateTask(editingTask.id, data);
    return createTask(data as Parameters<typeof createTask>[0]);
  };

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      {/* ── View header ── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-text-primary">
            Backlog
          </span>
          {filteredTasks.length > 0 && (
            <span className="text-sm text-text-muted">
              {filteredTasks.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Search toggle */}
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearch("");
            }}
            className="flex h-9 w-9 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-secondary"
            aria-label="Toggle search"
            title="Search"
          >
            {showSearch ? (
              <X className="h-4 w-4" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
          {/* Sort */}
          <div className="relative flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="cursor-pointer appearance-none bg-transparent text-sm text-text-muted hover:text-text-secondary focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {/* Add task */}
          <button
            onClick={handleCreate}
            className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New
          </button>
        </div>
      </div>

      {/* ── Search bar (conditional) ── */}
      {showSearch && (
        <div className="border-b border-border px-5 py-2">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full bg-transparent text-base text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>
      )}

      {/* ── Error bar ── */}
      {error && (
        <div className="flex items-center gap-2 border-b border-danger/20 bg-danger-subtle px-5 py-2.5">
          <span className="flex-1 text-sm text-danger">{error}</span>
          <button
            onClick={clearError}
            className="text-sm text-danger underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Task list ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && tasks.length === 0 ? (
          <EmptyState message="Loading…" />
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            message={
              search.trim()
                ? "No tasks match your search."
                : "Backlog is empty."
            }
            action={
              !search.trim()
                ? { label: "Create a task", onClick: handleCreate }
                : undefined
            }
          />
        ) : (
          <div>
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onInlineSave={handleInlineSave}
                onMoveToToday={handleMoveToToday}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <TaskForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingTask}
      />
      <DeleteConfirmationDialog
        isOpen={!!deletingTask}
        taskTitle={deletingTask?.title ?? ""}
        itemType="task"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTask(null)}
      />
    </div>
  );
}

function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-20">
      <p className="text-sm text-text-muted">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm text-accent hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
