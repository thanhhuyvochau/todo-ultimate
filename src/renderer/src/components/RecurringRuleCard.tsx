import { Edit2, Trash2 } from "lucide-react";
import type { RecurringRule } from "@shared/models";
import { useRecurringRuleStore } from "../stores/recurringRuleStore";
import { PriorityBadge } from "./PriorityBadge";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const DAY_LABELS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface RecurringRuleCardProps {
  rule: RecurringRule;
  onEdit: (rule: RecurringRule) => void;
  onDeleteRequest: (rule: RecurringRule) => void;
}

export function RecurringRuleCard({
  rule,
  onEdit,
  onDeleteRequest,
}: RecurringRuleCardProps) {
  const toggleRule = useRecurringRuleStore((s) => s.toggleRule);

  const frequencyDetail = (() => {
    if (rule.frequency === "weekly" && rule.daysOfWeek?.length) {
      return rule.daysOfWeek.map((d) => DAY_LABELS_SHORT[d]).join(", ");
    }
    if (rule.frequency === "monthly" && rule.dayOfMonth) {
      return `Day ${rule.dayOfMonth}`;
    }
    return null;
  })();

  const timeLabel = rule.timeAnchor
    ? (() => {
        const d = new Date(rule.timeAnchor);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      })()
    : null;

  return (
    <div
      className={`rounded-lg border bg-bg-surface p-4 shadow-sm transition-colors hover:border-accent/40 ${
        !rule.isActive ? "opacity-50" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-text-primary truncate">
              {rule.title}
            </h3>
            <PriorityBadge priority={rule.priority} />
          </div>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/20">
              {FREQUENCY_LABELS[rule.frequency] ?? rule.frequency}
            </span>
            {frequencyDetail && (
              <span className="text-xs text-text-muted">{frequencyDetail}</span>
            )}
            {timeLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {timeLabel}
              </span>
            )}
            <span className="text-xs text-text-muted">
              {rule.estimatedMinutes} min
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => toggleRule(rule.id)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
            style={{
              backgroundColor: rule.isActive
                ? "var(--color-accent)"
                : "var(--color-border)",
            }}
            role="switch"
            aria-checked={rule.isActive}
            aria-label={rule.isActive ? "Disable rule" : "Enable rule"}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                rule.isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>

          <button
            onClick={() => onEdit(rule)}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            aria-label="Edit rule"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDeleteRequest(rule)}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-danger-subtle hover:text-danger"
            aria-label="Delete rule"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {rule.description && (
        <p className="mt-2 text-xs text-text-secondary line-clamp-2">
          {rule.description}
        </p>
      )}
    </div>
  );
}
