import { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, Lock, X } from "lucide-react";
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

function formatDateHeader(date: Date): string {
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isTimeAnchored(task: Task): boolean {
  if (task.scheduledDate === null) return false;
  const d = new Date(task.scheduledDate);
  return !(d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0);
}

function formatAnchorTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface SortableTaskItemProps {
  id: string;
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  onReturnToBacklog: (task: Task) => void;
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
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const today = getTodayMidnight();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const todayTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.scheduledDate !== null &&
          t.scheduledDate >= today &&
          t.scheduledDate < today + 86_400_000,
      ),
    [tasks, today],
  );

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

  const sortedFlexible = useMemo(() => {
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

  const handleReturnToBacklog = (task: Task) =>
    updateTask(task.id, { scheduledDate: null });

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    const success = await updateTask(task.id, { status: newStatus });
    if (!success) {
      setToast({
        msg: useTaskStore.getState().error ?? "Status change failed.",
        type: "error",
      });
      return;
    }
    const labels: Record<string, string> = {
      in_progress: `Started "${task.title}"`,
      completed: `Completed "${task.title}"`,
      todo: `Paused "${task.title}"`,
    };
    setToast({ msg: labels[newStatus] ?? "Status updated.", type: "success" });
  };

  const handleDelete = (task: Task) => setDeletingTask(task);
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };
  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    const ok = await deleteTask(deletingTask.id);
    if (ok) setDeletingTask(null);
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

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      {/* ── View header ── */}
      <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-text-primary">Today</span>
          <span className="text-sm text-text-muted">
            {formatDateHeader(new Date())}
          </span>
          {activeTasks.length > 0 && (
            <span className="text-sm text-text-muted">
              · {activeTasks.length} remaining
            </span>
          )}
        </div>
      </div>

      {/* ── Error ── */}
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

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && todayTasks.length === 0 ? (
          <EmptyState message="Loading…" />
        ) : todayTasks.length === 0 ? (
          <EmptyState
            message="Nothing scheduled for today."
            sublabel="Move tasks from Backlog or let the AI planner fill your day."
          />
        ) : (
          <div>
            {/* Anchored (fixed-time) tasks */}
            {anchoredTasks.map((task) => (
              <div key={task.id}>
                <div className="flex items-center gap-2 border-b border-border bg-bg-secondary/50 px-5 py-1.5">
                  <Lock
                    className="h-3.5 w-3.5 text-text-muted"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-sm text-text-muted">
                    {formatAnchorTime(task.scheduledDate!)}
                  </span>
                  <span className="text-xs text-text-muted">fixed block</span>
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

            {/* Flexible tasks (drag-to-reorder) */}
            {flexibleTasks.length > 0 && (
              <>
                {anchoredTasks.length > 0 && (
                  <div className="border-b border-border bg-bg-secondary/50 px-5 py-1.5">
                    <span className="text-xs text-text-muted">Flexible</span>
                  </div>
                )}
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                  <SortableContext items={sortedFlexible.map((t) => t.id)}>
                    {sortedFlexible.map((task) => (
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
                  </SortableContext>
                </DndContext>
              </>
            )}

            {/* Completed section */}
            {completedTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                  className="flex w-full items-center gap-2 border-b border-border bg-bg-secondary/30 px-5 py-2 text-sm text-text-muted hover:text-text-secondary"
                >
                  {isCompletedOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  Completed ({completedTasks.length})
                </button>
                {isCompletedOpen &&
                  completedTasks.map((task) => (
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

      {/* ── Toast ── */}
      {toast && (
        <div
          className={[
            "fixed bottom-10 right-4 z-50 flex items-center gap-3 rounded-md border px-3 py-2 text-sm shadow-lg",
            toast.type === "error"
              ? "border-danger/20 bg-danger-subtle text-danger"
              : "border-success/20 bg-success-subtle text-success",
          ].join(" ")}
        >
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            className="opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
  sublabel,
}: {
  message: string;
  sublabel?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 py-20">
      <p className="text-sm text-text-muted">{message}</p>
      {sublabel && (
        <p className="text-xs text-text-muted opacity-60">{sublabel}</p>
      )}
    </div>
  );
}
