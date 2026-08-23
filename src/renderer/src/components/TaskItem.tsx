import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import {
  Pencil,
  Trash2,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Check,
  X,
  Circle,
  CircleDot,
  CircleCheck,
} from "lucide-react";
import type { Task, TaskStatus, TaskPriority } from "@shared/models";
import { PriorityBadge } from "./PriorityBadge";
import { VarianceBadge } from "./VarianceBadge";
import { Tooltip } from "./ui/Tooltip";

const PRIORITY_CYCLE: TaskPriority[] = ["low", "medium", "high"];

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
}

const STATUS_ACTIONS: Record<TaskStatus, StatusAction[]> = {
  todo: [{ nextStatus: "in_progress", label: "Start" }],
  in_progress: [
    { nextStatus: "todo", label: "Pause" },
    { nextStatus: "completed", label: "Complete" },
  ],
  completed: [],
};

const CheckIcon: Record<TaskStatus, typeof Circle> = {
  todo: Circle,
  in_progress: CircleDot,
  completed: CircleCheck,
};

interface InlineEditValues {
  title: string;
  priority: TaskPriority;
  estimatedMinutes: number;
}

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  onInlineSave?: (task: Task, values: InlineEditValues) => void;
  onMoveToToday?: (task: Task) => void;
  onReturnToBacklog?: (task: Task) => void;
}

export function TaskItem({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onInlineSave,
  onMoveToToday,
  onReturnToBacklog,
}: TaskItemProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editMinutes, setEditMinutes] = useState(String(task.estimatedMinutes));
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const actions = STATUS_ACTIONS[task.status];
  const CheckMark = CheckIcon[task.status];

  useEffect(() => {
    if (!statusOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setStatusOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [statusOpen]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setEditTitle(task.title);
      setEditPriority(task.priority);
      setEditMinutes(String(task.estimatedMinutes));
    }
  }, [task.title, task.priority, task.estimatedMinutes, isEditing]);

  const handleStartEdit = () => {
    if (!onInlineSave) {
      onEdit(task);
      return;
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed.length > 200) return;
    const minutes = parseInt(editMinutes, 10);
    if (isNaN(minutes) || minutes < 1 || minutes > 1440) return;
    onInlineSave!(task, {
      title: trimmed,
      priority: editPriority,
      estimatedMinutes: minutes,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditMinutes(String(task.estimatedMinutes));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const cyclePriority = () => {
    const idx = PRIORITY_CYCLE.indexOf(editPriority);
    setEditPriority(PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]!);
  };

  const isCompleted = task.status === "completed";
  const isInProgress = task.status === "in_progress";
  const showMoveToToday =
    !isEditing &&
    onMoveToToday &&
    task.status === "todo" &&
    task.scheduledDate === null;
  const showReturnToBacklog =
    !isEditing && onReturnToBacklog && task.scheduledDate !== null;

  return (
    <div
      className={[
        "group flex items-center gap-3 border-b border-border px-4 py-2.5 transition-colors duration-100",
        isInProgress ? "bg-accent-subtle/30" : "hover:bg-bg-secondary",
      ].join(" ")}
    >
      {/* Status circle */}
      <button
        onClick={() => {
          if (actions.length === 1) {
            onStatusChange(task, actions[0]!.nextStatus);
          } else if (actions.length > 1) {
            setStatusOpen(!statusOpen);
          }
        }}
        disabled={isCompleted || isEditing}
        aria-label={`Status: ${task.status}`}
        className={[
          "shrink-0 transition-colors duration-100",
          isCompleted
            ? "cursor-default text-success"
            : isInProgress
              ? "cursor-pointer text-accent hover:text-accent-hover"
              : "cursor-pointer text-text-muted hover:text-text-secondary",
        ].join(" ")}
      >
        <CheckMark className="h-4 w-4" strokeWidth={1.5} />
      </button>

      {isEditing ? (
        /* ── Inline edit mode ── */
        <>
          <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={200}
              className="w-full rounded bg-bg-elevated px-2 py-1 text-sm text-text-primary ring-1 ring-border-focus focus:outline-none"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={cyclePriority}
                type="button"
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
              >
                <PriorityBadge priority={editPriority} />
                <span className="capitalize">{editPriority}</span>
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  onKeyDown={handleKeyDown}
                  min={1}
                  max={1440}
                  className="w-16 rounded bg-bg-elevated px-1.5 py-0.5 text-xs text-text-primary ring-1 ring-border focus:outline-none focus:ring-border-focus"
                />
                <span className="text-xs text-text-muted">min</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip label="Save changes">
              <button
                onClick={handleSave}
                className="flex h-6 w-6 items-center justify-center rounded text-accent hover:bg-accent-subtle"
                aria-label="Save changes"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip label="Cancel editing">
              <button
                onClick={handleCancel}
                className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
                aria-label="Cancel editing"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        </>
      ) : (
        /* ── View mode ── */
        <>
          {/* Priority dot */}
          <PriorityBadge priority={task.priority} />

          {/* Title + estimate */}
          <div
            className="min-w-0 flex-1 cursor-pointer"
            onDoubleClick={handleStartEdit}
          >
            <p
              className={[
                "truncate text-sm",
                isCompleted
                  ? "text-text-muted line-through"
                  : isInProgress
                    ? "font-medium text-text-primary"
                    : "text-text-primary",
              ].join(" ")}
            >
              {task.title}
            </p>
          </div>

          {/* Estimate */}
          <span className="shrink-0 font-mono text-xs text-text-muted">
            {formatMinutes(task.estimatedMinutes)}
          </span>
          <VarianceBadge task={task} />

          {/* Actions (shown on hover) */}
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
            {showReturnToBacklog && (
              <Tooltip label="Return to backlog">
                <button
                  onClick={() => onReturnToBacklog!(task)}
                  className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                  aria-label="Return to backlog"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
            {showMoveToToday && (
              <Tooltip label="Move to today">
                <button
                  onClick={() => onMoveToToday!(task)}
                  className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-accent"
                  aria-label="Move to today"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}

            {/* Status change dropdown */}
            {actions.length > 0 && (
              <div className="relative" ref={menuRef}>
                <Tooltip label="Change status">
                  <button
                    onClick={() => setStatusOpen(!statusOpen)}
                    className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                    aria-label="Change status"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                {statusOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-md border border-border bg-bg-elevated py-0.5 shadow-lg">
                    {actions.map((action) => (
                      <button
                        key={action.nextStatus}
                        onClick={() => {
                          onStatusChange(task, action.nextStatus);
                          setStatusOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-bg-tertiary"
                      >
                        {action.nextStatus === "completed" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        )}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Tooltip label="Edit task">
              <button
                onClick={handleStartEdit}
                className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                aria-label="Edit task"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip label="Delete task">
              <button
                onClick={() => onDelete(task)}
                className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-danger-subtle hover:text-danger"
                aria-label="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        </>
      )}
    </div>
  );
}
