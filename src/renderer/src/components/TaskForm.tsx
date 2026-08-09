import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import type { Task, TaskPriority } from "@shared/models";

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
  const titleRef = useRef<HTMLInputElement>(null);

  const isEditing = !!initialData;

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
    titleRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, initialData, onClose]);

  if (!isOpen) return null;

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setTitleError(validateTitle(value));
  };

  const handleMinutesChange = (value: string) => {
    setEstimatedMinutes(value);
    setMinutesError(validateEstimatedMinutes(value));
  };

  const handleSubmit = async () => {
    const tError = validateTitle(title);
    const mError = validateEstimatedMinutes(estimatedMinutes);
    setTitleError(tError);
    setMinutesError(mError);
    if (tError || mError) return;

    setIsSubmitting(true);
    const success = await onSubmit({
      title: title.trim(),
      priority,
      estimatedMinutes: Number(estimatedMinutes),
      description: description.trim() || "",
    });
    if (success) {
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
            onClick={onClose}
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
            <label
              className="mb-1 block text-sm font-medium text-text-primary"
              htmlFor="task-description"
            >
              Description
              <span className="ml-1 text-xs text-text-muted">(optional)</span>
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Add notes or context..."
              className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
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
      </div>
    </div>
  );
}
