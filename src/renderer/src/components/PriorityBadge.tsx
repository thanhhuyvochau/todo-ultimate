import type { TaskPriority } from "@shared/models";

function priorityLabel(priority: TaskPriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

const variantClasses: Record<TaskPriority, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  medium:
    "bg-amber-500/10 text-amber-400 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
};

interface PriorityBadgeProps {
  priority: TaskPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${variantClasses[priority]}`}
    >
      {priorityLabel(priority)}
    </span>
  );
}
