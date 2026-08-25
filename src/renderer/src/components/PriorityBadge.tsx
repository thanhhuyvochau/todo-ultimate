import type { TaskPriority } from "@shared/models";

const dotClass: Record<TaskPriority, string> = {
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

const label: Record<TaskPriority, string> = {
  high: "High",
  medium: "Med",
  low: "Low",
};

interface PriorityBadgeProps {
  priority: TaskPriority;
  showLabel?: boolean;
}

export function PriorityBadge({
  priority,
  showLabel = false,
}: PriorityBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotClass[priority]}`}
      />
      {showLabel && (
        <span className="text-xs text-text-muted">{label[priority]}</span>
      )}
    </span>
  );
}
