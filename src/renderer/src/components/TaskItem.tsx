import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import {
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ArrowRightCircle,
  ArrowLeftCircle,
  CheckCircle2,
  Calendar,
  Square,
  Check,
  X,
} from "lucide-react";
import type { Task, TaskStatus, TaskPriority } from "@shared/models";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";

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
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditMinutes(String(task.estimatedMinutes));
  };

  const handleTitleDblClick = () => {
    handleStartEdit();
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

  const showMoveToToday =
    !isEditing &&
    onMoveToToday &&
    task.status === "todo" &&
    task.scheduledDate === null;
  const showReturnToBacklog =
    !isEditing && onReturnToBacklog && task.scheduledDate !== null;

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-3 shadow-sm transition-all hover:border-accent/40">
      <GripVertical className="hidden h-4 w-4 shrink-0 text-text-muted group-hover:block" />

      <div className="flex shrink-0 items-center">
        <Square className="h-4 w-4 text-text-muted opacity-50" />
      </div>

      {isEditing ? (
        <>
          <div className="min-w-0 flex-1 space-y-1.5">
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={200}
              className="w-full rounded-md border border-accent bg-bg-elevated px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={cyclePriority}
                className="inline-flex items-center"
                type="button"
              >
                <PriorityBadge priority={editPriority} />
              </button>
              <input
                type="number"
                value={editMinutes}
                onChange={(e) => setEditMinutes(e.target.value)}
                onKeyDown={handleKeyDown}
                min={1}
                max={1440}
                className="w-20 rounded-md border border-border bg-bg-elevated px-2 py-0.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <span className="text-xs text-text-muted">min</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={handleSave}
              className="rounded-md p-1 text-accent transition-colors hover:bg-accent-subtle"
              aria-label="Save changes"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              aria-label="Cancel editing"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            className="min-w-0 flex-1 cursor-pointer"
            onDoubleClick={handleTitleDblClick}
          >
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
            {showReturnToBacklog && (
              <button
                onClick={() => onReturnToBacklog!(task)}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-info"
                aria-label={`Return ${task.title} to backlog`}
              >
                <ArrowLeftCircle className="h-4 w-4" />
              </button>
            )}
            {showMoveToToday && (
              <button
                onClick={() => onMoveToToday!(task)}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-accent"
                aria-label={`Move ${task.title} to today`}
              >
                <Calendar className="h-4 w-4" />
              </button>
            )}
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
              onClick={handleStartEdit}
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
        </>
      )}
    </div>
  );
}
