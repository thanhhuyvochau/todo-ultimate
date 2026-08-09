import { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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
  const completedTasks = useMemo(
    () => todayTasks.filter((t) => t.status === "completed"),
    [todayTasks],
  );

  useEffect(() => {
    setOrderedIds((prev) => {
      const currentIds = new Set(activeTasks.map((t) => t.id));
      const kept = prev.filter((id) => currentIds.has(id));
      const newIds = activeTasks
        .map((t) => t.id)
        .filter((id) => !kept.includes(id));
      return [...kept, ...newIds];
    });
  }, [activeTasks]);

  const sortedActiveTasks = useMemo(() => {
    const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
    return [...activeTasks].sort((a, b) => {
      const aIdx = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bIdx = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aIdx - bIdx;
    });
  }, [activeTasks, orderedIds]);

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
      setToastMessage(
        "Status change blocked. Another task may already be in progress.",
      );
      setToastVisible(true);
    }
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
            {activeTasks.length > 0 && (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedActiveTasks.map((t) => t.id)}>
                  <div className="space-y-2">
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
        <div className="fixed bottom-4 right-4 z-50 flex items-start gap-3 rounded-md border border-danger/20 bg-danger-subtle px-4 py-3 shadow-lg">
          <span className="text-sm text-danger">{toastMessage}</span>
          <button
            onClick={dismissToast}
            className="text-xs font-medium text-danger underline hover:text-red-500"
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
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTask(null)}
      />
    </div>
  );
}
