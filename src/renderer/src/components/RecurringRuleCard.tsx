import { Edit2, Trash2, Clock } from "lucide-react";
import type { RecurringRule } from "@shared/models";
import { useRecurringRuleStore } from "../stores/recurringRuleStore";
import { PriorityBadge } from "./PriorityBadge";
import { Tooltip } from "./ui/Tooltip";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
      return rule.daysOfWeek.map((d) => DAY_SHORT[d]).join(", ");
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
      className={[
        "group flex items-center gap-3 border-b border-border px-0 py-3 transition-opacity",
        !rule.isActive ? "opacity-40" : "",
      ].join(" ")}
    >
      {/* Toggle */}
      <Tooltip label={rule.isActive ? "Disable rule" : "Enable rule"}>
        <button
          onClick={() => toggleRule(rule.id)}
          role="switch"
          aria-checked={rule.isActive}
          aria-label={rule.isActive ? "Disable rule" : "Enable rule"}
          className={[
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            rule.isActive ? "bg-accent" : "bg-bg-tertiary",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform duration-200",
              rule.isActive ? "translate-x-4" : "translate-x-0.5",
            ].join(" ")}
          />
        </button>
      </Tooltip>

      {/* Priority dot */}
      <PriorityBadge priority={rule.priority} />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-primary">{rule.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
          <span>{FREQUENCY_LABELS[rule.frequency] ?? rule.frequency}</span>
          {frequencyDetail && <span>· {frequencyDetail}</span>}
          {timeLabel && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {timeLabel}
            </span>
          )}
          <span className="font-mono">{rule.estimatedMinutes}m</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Tooltip label="Edit rule">
          <button
            onClick={() => onEdit(rule)}
            className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
            aria-label="Edit rule"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip label="Delete rule">
          <button
            onClick={() => onDeleteRequest(rule)}
            className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-danger-subtle hover:text-danger"
            aria-label="Delete rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
