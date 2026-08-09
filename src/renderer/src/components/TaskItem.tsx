import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { Task } from "@shared/models";
import { PriorityBadge } from "./PriorityBadge";

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskItem({ task, onEdit, onDelete }: TaskItemProps) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-3 shadow-sm transition-all hover:border-accent/40">
      <GripVertical className="hidden h-4 w-4 shrink-0 text-text-muted group-hover:block" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {task.title}
        </p>
        <span className="text-xs text-text-muted">
          {formatMinutes(task.estimatedMinutes)}
        </span>
      </div>

      <PriorityBadge priority={task.priority} />

      <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
        <button
          onClick={() => onEdit(task)}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          aria-label={`Edit ${task.title}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(task)}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-danger-subtle hover:text-danger"
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
