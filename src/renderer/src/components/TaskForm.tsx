import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2,
  X,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import type { Task, TaskPriority } from "@shared/models";
import { useTaskStore } from "../stores/taskStore";
import { MarkdownEditor } from "./MarkdownEditor";

const DESCRIPTION_MAX_LENGTH = 100000;
const AUTO_SAVE_DELAY = 1500;

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    priority: TaskPriority;
    estimatedMinutes: number;
    description: string;
  }) => Promise<boolean>;
  initialData?: Task | null;
}

function validateTitle(value: string): string | null {
  if (!value.trim()) return "Title is required.";
  if (value.trim().length > 200)
    return "Title must be 200 characters or fewer.";
  return null;
}

function validateEstimatedMinutes(value: string): string | null {
  const num = Number(value);
  if (!value || !Number.isInteger(num) || num < 1 || num > 1440) {
    return "Estimated minutes must be a whole number between 1 and 1440.";
  }
  return null;
}

function getRelativeTime(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 5) return "Saved just now";
  if (seconds < 60) return `Saved ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return "Saved 1 min ago";
  return `Saved ${minutes} min ago`;
}

export function TaskForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [minutesError, setMinutesError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPreview, setIsPreview] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitiallyLoadedRef = useRef(false);
  const updateTask = useTaskStore((s) => s.updateTask);

  const isEditing = !!initialData;

  const clearAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setTitle(initialData.title);
      setEstimatedMinutes(String(initialData.estimatedMinutes));
      setPriority(initialData.priority);
      setDescription(initialData.description ?? "");
    } else {
      setTitle("");
      setEstimatedMinutes("");
      setPriority("medium");
      setDescription("");
    }
    setTitleError(null);
    setMinutesError(null);
    setIsSubmitting(false);
    setIsPreview(false);
    setLastSavedAt(null);
    setDescriptionDirty(false);
    setShowUnsavedWarning(false);
    setAutoSaveError(null);
    hasInitiallyLoadedRef.current = false;
    titleRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseRequest();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  useEffect(() => {
    return () => {
      clearAutoSaveTimer();
    };
  }, [clearAutoSaveTimer]);

  useEffect(() => {
    if (!isEditing || !initialData || !isOpen) return;
    if (!hasInitiallyLoadedRef.current) {
      hasInitiallyLoadedRef.current = true;
      return;
    }

    clearAutoSaveTimer();

    autoSaveTimerRef.current = setTimeout(async () => {
      const success = await updateTask(initialData.id, {
        description: description || null,
      });
      if (success) {
        setLastSavedAt(Date.now());
        setDescriptionDirty(false);
        setAutoSaveError(null);
      } else {
        setAutoSaveError("Auto-save failed. Click to retry.");
      }
    }, AUTO_SAVE_DELAY);

    return () => {
      clearAutoSaveTimer();
    };
  }, [
    description,
    isEditing,
    initialData,
    isOpen,
    updateTask,
    clearAutoSaveTimer,
  ]);

  if (!isOpen) return null;

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setTitleError(validateTitle(value));
  };

  const handleMinutesChange = (value: string) => {
    setEstimatedMinutes(value);
    setMinutesError(validateEstimatedMinutes(value));
  };

  const handleDescriptionChange = (html: string) => {
    setDescription(html);
    setDescriptionDirty(true);
    setAutoSaveError(null);
  };

  const handleRetryAutoSave = async () => {
    if (!initialData) return;
    setAutoSaveError(null);
    const success = await updateTask(initialData.id, {
      description: description || null,
    });
    if (success) {
      setLastSavedAt(Date.now());
      setDescriptionDirty(false);
      setAutoSaveError(null);
    } else {
      setAutoSaveError("Save failed. Try again.");
    }
  };

  const handleCloseRequest = () => {
    if (descriptionDirty && isEditing) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleDiscardUnsaved = () => {
    setShowUnsavedWarning(false);
    setDescriptionDirty(false);
    onClose();
  };

  const handleSubmit = async () => {
    const tError = validateTitle(title);
    const mError = validateEstimatedMinutes(estimatedMinutes);
    setTitleError(tError);
    setMinutesError(mError);
    if (tError || mError) return;

    clearAutoSaveTimer();
    setIsSubmitting(true);
    const success = await onSubmit({
      title: title.trim(),
      priority,
      estimatedMinutes: Number(estimatedMinutes),
      description: description || "",
    });
    if (success) {
      setDescriptionDirty(false);
      setLastSavedAt(Date.now());
      onClose();
    } else {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    !!title.trim() &&
    !!estimatedMinutes &&
    !titleError &&
    !minutesError &&
    !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-bg-surface p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">
            {isEditing ? "Edit Task" : "New Task"}
          </h2>
          <button
            onClick={handleCloseRequest}
            className="rounded-md p-1 text-text-muted transition-colors hover:text-text-primary"
            aria-label="Close form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-text-primary"
              htmlFor="task-title"
            >
              Title
            </label>
            <input
              ref={titleRef}
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              maxLength={200}
              placeholder="What needs to be done?"
              className={`w-full rounded-md border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary ${titleError ? "border-danger" : "border-border"}`}
            />
            {titleError && (
              <p className="mt-1 text-xs text-danger">{titleError}</p>
            )}
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-text-primary"
              htmlFor="task-minutes"
            >
              Estimated Time (minutes)
            </label>
            <input
              id="task-minutes"
              type="number"
              min={1}
              max={1440}
              value={estimatedMinutes}
              onChange={(e) => handleMinutesChange(e.target.value)}
              placeholder="e.g. 30"
              className={`w-full rounded-md border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary ${minutesError ? "border-danger" : "border-border"}`}
            />
            {minutesError && (
              <p className="mt-1 text-xs text-danger">{minutesError}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary ${
                    priority === option.value
                      ? "border-accent bg-accent-subtle text-accent"
                      : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-elevated"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">
                Description
                <span className="ml-1 text-xs text-text-muted">(optional)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsPreview((p) => !p)}
                className="inline-flex items-center gap-1 rounded p-0.5 text-xs text-text-muted transition-colors hover:text-text-primary"
                title={isPreview ? "Switch to edit mode" : "Preview"}
              >
                {isPreview ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </>
                )}
              </button>
            </div>
            <MarkdownEditor
              key={initialData?.id ?? "new"}
              initialContent={description}
              onChange={handleDescriptionChange}
              editable={!isPreview}
              minHeight={150}
              maxLength={DESCRIPTION_MAX_LENGTH}
            />
            {isEditing && lastSavedAt !== null && !descriptionDirty && (
              <div className="mt-1 flex items-center gap-1 text-xs text-success">
                <Check className="h-3 w-3" />
                <span>{getRelativeTime(lastSavedAt)}</span>
              </div>
            )}
            {autoSaveError && (
              <div className="mt-1 flex items-center gap-1 text-xs text-danger">
                <span>{autoSaveError}</span>
                <button
                  type="button"
                  onClick={handleRetryAutoSave}
                  className="inline-flex items-center gap-0.5 font-medium underline hover:text-red-500"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleCloseRequest}
            disabled={isSubmitting}
            className="rounded-md bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save" : "Create"}
          </button>
        </div>

        {showUnsavedWarning && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-bg-surface/95">
            <div className="mx-6 w-full max-w-xs rounded-lg border border-border bg-bg-elevated p-5 shadow-lg">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-subtle">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Unsaved Changes
                  </h3>
                  <p className="mt-1 text-xs text-text-secondary">
                    You have unsaved description changes. Discard them?
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowUnsavedWarning(false)}
                  className="rounded-md bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                >
                  Keep Editing
                </button>
                <button
                  onClick={handleDiscardUnsaved}
                  className="rounded-md bg-warning px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
