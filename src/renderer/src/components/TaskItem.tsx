import { useState, useRef, useEffect } from "react";
import {
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ArrowRightCircle,
  ArrowLeftCircle,
  CheckCircle2,
} from "lucide-react";
import type { Task, TaskStatus } from "@shared/models";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

interface StatusAction {
  nextStatus: TaskStatus;
  label: string;
  icon: JSX.Element;
}

const STATUS_ACTIONS: Record<TaskStatus, StatusAction[]> = {
  todo: [
    {
      nextStatus: "in_progress",
      label: "Start",
      icon: <ArrowRightCircle className="h-4 w-4" />,
    },
  ],
  in_progress: [
    {
      nextStatus: "todo",
      label: "Return to Backlog",
      icon: <ArrowLeftCircle className="h-4 w-4" />,
    },
    {
      nextStatus: "completed",
      label: "Complete",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
  ],
  completed: [],
};

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
}

export function TaskItem({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskItemProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const actions = STATUS_ACTIONS[task.status];

  useEffect(() => {
    if (!statusOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStatusOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [statusOpen]);

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

      <StatusBadge status={task.status} />
      <PriorityBadge priority={task.priority} />

      <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
        {actions.length > 0 && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              aria-label="Change task status"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-bg-elevated py-1 shadow-lg">
                {actions.map((action) => (
                  <button
                    key={action.nextStatus}
                    onClick={() => {
                      onStatusChange(task, action.nextStatus);
                      setStatusOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-tertiary"
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
