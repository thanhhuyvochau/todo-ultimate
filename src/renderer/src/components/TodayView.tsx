import { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import type { Task, TaskStatus } from "@shared/models";
import { useTaskStore } from "../stores/taskStore";
import { TaskItem } from "./TaskItem";
import { TaskForm } from "./TaskForm";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function isTimeAnchored(task: Task): boolean {
  if (task.scheduledDate === null) return false;
  const d = new Date(task.scheduledDate);
  return !(d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0);
}

function formatAnchorTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  onReturnToBacklog: (task: Task) => void;
}

interface SortableTaskItemProps extends TaskItemProps {
  id: string;
}

function SortableTaskItem({ id, ...props }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskItem {...props} />
    </div>
  );
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<"error" | "success">("error");
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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
  const anchoredTasks = useMemo(
    () =>
      activeTasks
        .filter(isTimeAnchored)
        .sort((a, b) => (a.scheduledDate ?? 0) - (b.scheduledDate ?? 0)),
    [activeTasks],
  );
  const flexibleTasks = useMemo(
    () => activeTasks.filter((t) => !isTimeAnchored(t)),
    [activeTasks],
  );
  const completedTasks = useMemo(
    () => todayTasks.filter((t) => t.status === "completed"),
    [todayTasks],
  );

  useEffect(() => {
    setOrderedIds((prev) => {
      const currentIds = new Set(flexibleTasks.map((t) => t.id));
      const kept = prev.filter((id) => currentIds.has(id));
      const newIds = flexibleTasks
        .map((t) => t.id)
        .filter((id) => !kept.includes(id));
      return [...kept, ...newIds];
    });
  }, [flexibleTasks]);

  const sortedActiveTasks = useMemo(() => {
    const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
    return [...flexibleTasks].sort((a, b) => {
      const aIdx = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bIdx = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aIdx - bIdx;
    });
  }, [flexibleTasks, orderedIds]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedIds((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleReturnToBacklog = (task: Task) => {
    updateTask(task.id, { scheduledDate: null });
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    const success = await updateTask(task.id, { status: newStatus });
    if (!success) {
      setToastType("error");
      setToastMessage(useTaskStore.getState().error ?? "Status change failed.");
      setToastVisible(true);
      return;
    }
    const statusLabels: Record<string, string> = {
      in_progress: `Started "${task.title}"`,
      completed: `Completed "${task.title}"`,
      todo: `Returned "${task.title}" to backlog`,
    };
    setToastType("success");
    setToastMessage(statusLabels[newStatus] ?? "Status updated.");
    setToastVisible(true);
  };

  const dismissToast = () => {
    setToastVisible(false);
  };

  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => {
      setToastVisible(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toastVisible]);

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
            {(anchoredTasks.length > 0 || flexibleTasks.length > 0) && (
              <>
                {anchoredTasks.map((task) => (
                  <div key={task.id} className="relative">
                    <div className="mb-1 flex items-center gap-1.5 px-1">
                      <Lock className="h-3 w-3 text-accent" />
                      <span className="text-xs font-medium text-accent">
                        {formatAnchorTime(task.scheduledDate!)}
                      </span>
                      <span className="text-xs text-text-muted">
                        Fixed time block — managed by recurring rule
                      </span>
                    </div>
                    <TaskItem
                      task={task}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                      onReturnToBacklog={handleReturnToBacklog}
                    />
                  </div>
                ))}
                {flexibleTasks.length > 0 && (
                  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <SortableContext items={sortedActiveTasks.map((t) => t.id)}>
                      <div className="space-y-2">
                        {anchoredTasks.length > 0 &&
                          flexibleTasks.length > 0 && (
                            <div className="my-3 border-t border-border" />
                          )}
                        {sortedActiveTasks.map((task) => (
                          <SortableTaskItem
                            key={task.id}
                            id={task.id}
                            task={task}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onStatusChange={handleStatusChange}
                            onReturnToBacklog={handleReturnToBacklog}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </>
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
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {toastVisible && toastMessage && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-start gap-3 rounded-md border px-4 py-3 shadow-lg ${
            toastType === "error"
              ? "border-danger/20 bg-danger-subtle"
              : "border-success/20 bg-success-subtle"
          }`}
        >
          <span
            className={`text-sm ${toastType === "error" ? "text-danger" : "text-success"}`}
          >
            {toastMessage}
          </span>
          <button
            onClick={dismissToast}
            className={`text-xs font-medium underline ${
              toastType === "error" ? "text-danger" : "text-success"
            }`}
          >
            Dismiss
          </button>
        </div>
      )}

      <TaskForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
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
