import { useEffect, useState, useMemo } from "react";
import { Plus } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "@shared/models";
import { useTaskStore } from "../stores/taskStore";
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
  { value: "priority-high", label: "Priority (High → Low)" },
  { value: "priority-low", label: "Priority (Low → High)" },
  { value: "created-newest", label: "Created (Newest)" },
  { value: "created-oldest", label: "Created (Oldest)" },
  { value: "title-az", label: "Title (A-Z)" },
  { value: "title-za", label: "Title (Z-A)" },
];

const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

function sortTasks(tasks: Task[], sort: SortOption): Task[] {
  const sorted = [...tasks];
  switch (sort) {
    case "priority-high":
      return sorted.sort(
        (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority],
      );
    case "priority-low":
      return sorted.sort(
        (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(query));
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

  const handleDelete = (task: Task) => {
    setDeletingTask(task);
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    await updateTask(task.id, { status: newStatus });
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    const success = await deleteTask(deletingTask.id);
    if (success) {
      setDeletingTask(null);
    }
  };

  const handleFormSubmit = async (data: {
    title: string;
    priority: TaskPriority;
    estimatedMinutes: number;
    description: string;
  }) => {
    if (editingTask) {
      return updateTask(editingTask.id, data);
    }
    return createTask(data as Parameters<typeof createTask>[0]);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h1 className="text-2xl font-bold text-text-primary">Backlog</h1>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="ml-auto text-xs font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="flex-1 rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && tasks.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-muted">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-sm text-text-muted">
              {search.trim()
                ? "No tasks match your search."
                : "Your backlog is empty. Create your first task to get started."}
            </p>
            {!search.trim() && (
              <button
                onClick={handleCreate}
                className="rounded-md bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
              >
                Create a task
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      <TaskForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        initialData={editingTask}
      />

      <DeleteConfirmationDialog
        isOpen={!!deletingTask}
        taskTitle={deletingTask?.title ?? ""}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTask(null)}
      />
    </div>
  );
}
