import { useEffect, useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Task } from "@shared/models";
import { useTaskStore } from "../stores/taskStore";
import { TaskItem } from "./TaskItem";
import { TaskForm } from "./TaskForm";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

function getTodayMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function TodayView() {
  const {
    tasks,
    isLoading,
    error,
    fetchTasks,
    updateTask,
    deleteTask,
    clearError,
  } = useTaskStore();

  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const today = getTodayMidnight();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const todayTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.scheduledDate !== null &&
        t.scheduledDate >= today &&
        t.scheduledDate < today + 86_400_000,
    );
  }, [tasks, today]);

  const activeTasks = useMemo(
    () => todayTasks.filter((t) => t.status !== "completed"),
    [todayTasks],
  );
  const completedTasks = useMemo(
    () => todayTasks.filter((t) => t.status === "completed"),
    [todayTasks],
  );

  const handleReturnToBacklog = (task: Task) => {
    updateTask(task.id, { scheduledDate: null });
  };

  const handleDelete = (task: Task) => {
    setDeletingTask(task);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    const success = await deleteTask(deletingTask.id);
    if (success) {
      setDeletingTask(null);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: {
    title: string;
    priority: string;
    estimatedMinutes: number;
    description: string;
  }) => {
    if (!editingTask) return false;
    return updateTask(editingTask.id, data as Parameters<typeof updateTask>[1]);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <div className="border-b border-border p-4">
        <h1 className="text-2xl font-bold text-text-primary">
          Today — {formatDate(new Date())}
        </h1>
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

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && todayTasks.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-muted">Loading tasks...</p>
          </div>
        ) : todayTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-sm text-text-muted">
              Nothing scheduled for today.
            </p>
            <p className="text-xs text-text-muted">
              Add tasks from the Backlog or wait for your morning plan.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.length > 0 && (
              <div className="space-y-2">
                {activeTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={() => {}}
                    onReturnToBacklog={handleReturnToBacklog}
                  />
                ))}
              </div>
            )}

            {completedTasks.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary"
                >
                  {isCompletedOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Completed ({completedTasks.length})
                </button>
                {isCompletedOpen && (
                  <div className="mt-2 space-y-2">
                    {completedTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onStatusChange={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
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
