import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import type { RecurringFrequency, TaskPriority } from "@shared/models";
import { useRecurringRuleStore } from "../stores/recurringRuleStore";
import { Tooltip } from "./ui/Tooltip";

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function validateDayOfMonth(value: string): string | null {
  const num = Number(value);
  if (!value || !Number.isInteger(num) || num < 1 || num > 31) {
    return "Day of month must be between 1 and 31.";
  }
  return null;
}

interface RecurringRuleFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id: string;
    title: string;
    priority: TaskPriority;
    estimatedMinutes: number;
    frequency: RecurringFrequency;
    description: string | null;
    timeAnchor: number | null;
    daysOfWeek: number[] | null;
    dayOfMonth: number | null;
  } | null;
}

function timeAnchorToInput(ms: number | null): string {
  if (ms === null) return "";
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function inputToTimeAnchor(value: string): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (h === undefined || m === undefined) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function RecurringRuleForm({
  isOpen,
  onClose,
  initialData,
}: RecurringRuleFormProps) {
  const [title, setTitle] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [frequency, setFrequency] = useState<RecurringFrequency>("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [description, setDescription] = useState("");
  const [timeAnchor, setTimeAnchor] = useState("");

  const [titleError, setTitleError] = useState<string | null>(null);
  const [minutesError, setMinutesError] = useState<string | null>(null);
  const [dayOfMonthError, setDayOfMonthError] = useState<string | null>(null);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const createRule = useRecurringRuleStore((s) => s.createRule);
  const updateRule = useRecurringRuleStore((s) => s.updateRule);
  const isEditing = !!initialData;

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setTitle(initialData.title);
      setEstimatedMinutes(String(initialData.estimatedMinutes));
      setPriority(initialData.priority);
      setFrequency(initialData.frequency);
      setDaysOfWeek(initialData.daysOfWeek ?? []);
      setDayOfMonth(
        initialData.dayOfMonth !== null ? String(initialData.dayOfMonth) : "",
      );
      setDescription(initialData.description ?? "");
      setTimeAnchor(timeAnchorToInput(initialData.timeAnchor));
    } else {
      setTitle("");
      setEstimatedMinutes("");
      setPriority("medium");
      setFrequency("daily");
      setDaysOfWeek([]);
      setDayOfMonth("");
      setDescription("");
      setTimeAnchor("");
    }
    setTitleError(null);
    setMinutesError(null);
    setDayOfMonthError(null);
    setDaysError(null);
    setIsSubmitting(false);
    titleRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, initialData, onClose]);

  if (!isOpen) return null;

  const handleDayToggle = (day: number) => {
    setDaysOfWeek((prev) => {
      const next = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day];
      setDaysError(
        next.length === 0 && frequency === "weekly"
          ? "Select at least one day."
          : null,
      );
      return next;
    });
  };

  const handleFrequencyChange = (f: RecurringFrequency) => {
    setFrequency(f);
    setDaysError(null);
    setDayOfMonthError(null);
    if (f === "weekly" && daysOfWeek.length === 0) {
      setDaysError("Select at least one day.");
    }
    if (f === "monthly" && !dayOfMonth) {
      setDayOfMonthError("Day of month is required.");
    }
  };

  const handleSubmit = async () => {
    const tError = validateTitle(title);
    const mError = validateEstimatedMinutes(estimatedMinutes);
    setTitleError(tError);
    setMinutesError(mError);

    if (frequency === "weekly" && daysOfWeek.length === 0) {
      setDaysError("Select at least one day.");
    }
    if (frequency === "monthly") {
      const dError = validateDayOfMonth(dayOfMonth);
      setDayOfMonthError(dError);
      if (dError) return;
    }

    const hasWeeklyError = frequency === "weekly" && daysOfWeek.length === 0;
    if (tError || mError || hasWeeklyError) return;

    setIsSubmitting(true);
    let success: boolean;
    if (isEditing && initialData) {
      success = await updateRule(initialData.id, {
        title: title.trim(),
        priority,
        estimatedMinutes: Number(estimatedMinutes),
        frequency,
        description: description || null,
        timeAnchor: inputToTimeAnchor(timeAnchor),
        daysOfWeek: frequency === "weekly" ? daysOfWeek : null,
        dayOfMonth: frequency === "monthly" ? Number(dayOfMonth) : null,
      });
    } else {
      success = await createRule({
        title: title.trim(),
        priority,
        estimatedMinutes: Number(estimatedMinutes),
        frequency,
        description: description || null,
        timeAnchor: inputToTimeAnchor(timeAnchor),
        daysOfWeek: frequency === "weekly" ? daysOfWeek : null,
        dayOfMonth: frequency === "monthly" ? Number(dayOfMonth) : null,
      });
    }
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
      <div className="w-full max-w-lg rounded-xl border border-border bg-bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">
            {isEditing ? "Edit Rule" : "New Recurring Task"}
          </h2>
          <Tooltip label="Close form">
            <button
              onClick={onClose}
              className="rounded-md p-1 text-text-muted transition-colors hover:text-text-primary"
              aria-label="Close form"
            >
              <X className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-text-primary"
              htmlFor="rule-title"
            >
              Title
            </label>
            <input
              ref={titleRef}
              id="rule-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(validateTitle(e.target.value));
              }}
              maxLength={200}
              placeholder="What repeats?"
              className={`w-full rounded-md border bg-bg-elevated px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary ${
                titleError ? "border-danger" : "border-border"
              }`}
            />
            {titleError && (
              <p className="mt-1 text-xs text-danger">{titleError}</p>
            )}
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-text-primary"
              htmlFor="rule-minutes"
            >
              Estimated Time (minutes)
            </label>
            <input
              id="rule-minutes"
              type="number"
              min={1}
              max={1440}
              value={estimatedMinutes}
              onChange={(e) => {
                setEstimatedMinutes(e.target.value);
                setMinutesError(validateEstimatedMinutes(e.target.value));
              }}
              placeholder="e.g. 30"
              className={`w-full rounded-md border bg-bg-elevated px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary ${
                minutesError ? "border-danger" : "border-border"
              }`}
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
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Frequency
            </label>
            <div className="flex gap-2">
              {FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleFrequencyChange(option.value)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary ${
                    frequency === option.value
                      ? "border-accent bg-accent-subtle text-accent"
                      : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-elevated"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {frequency === "weekly" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Days of Week
              </label>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDayToggle(idx)}
                    className={`h-10 w-10 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary ${
                      daysOfWeek.includes(idx)
                        ? "bg-accent text-white"
                        : "bg-bg-tertiary text-text-secondary hover:bg-bg-elevated"
                    }`}
                    aria-label={label}
                  >
                    {label.charAt(0)}
                  </button>
                ))}
              </div>
              {daysError && (
                <p className="mt-1 text-xs text-danger">{daysError}</p>
              )}
            </div>
          )}

          {frequency === "monthly" && (
            <div>
              <label
                className="mb-1 block text-sm font-medium text-text-primary"
                htmlFor="rule-day-of-month"
              >
                Day of Month
              </label>
              <input
                id="rule-day-of-month"
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => {
                  setDayOfMonth(e.target.value);
                  setDayOfMonthError(validateDayOfMonth(e.target.value));
                }}
                placeholder="1–31"
                className={`w-full rounded-md border bg-bg-elevated px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary ${
                  dayOfMonthError ? "border-danger" : "border-border"
                }`}
              />
              {dayOfMonthError && (
                <p className="mt-1 text-xs text-danger">{dayOfMonthError}</p>
              )}
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                className="text-sm font-medium text-text-primary"
                htmlFor="rule-time-anchor"
              >
                Time Anchor
                <span className="ml-1 text-xs text-text-muted">(optional)</span>
              </label>
              {timeAnchor && (
                <button
                  type="button"
                  onClick={() => setTimeAnchor("")}
                  className="text-xs text-text-muted transition-colors hover:text-danger"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              id="rule-time-anchor"
              type="time"
              value={timeAnchor}
              onChange={(e) => setTimeAnchor(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2.5 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-text-primary"
              htmlFor="rule-description"
            >
              Description
              <span className="ml-1 text-xs text-text-muted">(optional)</span>
            </label>
            <textarea
              id="rule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100000}
              rows={3}
              placeholder="Notes about this recurring task..."
              className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
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
