import type { Task } from "@/shared/models";

const ON_POINT_TOLERANCE_MINUTES = 5;

function formatDelta(minutes: number): string {
  const sign = minutes > 0 ? "+" : "−";
  return `${sign}${Math.abs(minutes)}m`;
}

interface VarianceBadgeProps {
  task: Task;
}

export function VarianceBadge({ task }: VarianceBadgeProps) {
  if (task.status !== "completed" || task.actualMinutes === null) {
    return null;
  }

  const delta = task.actualMinutes - task.estimatedMinutes;
  if (Math.abs(delta) <= ON_POINT_TOLERANCE_MINUTES) {
    return null;
  }

  const underestimated = delta > 0;
  const color = underestimated ? "text-danger" : "text-success";
  const title = underestimated
    ? `Underestimated by ${Math.abs(delta)}m`
    : `Overestimated by ${Math.abs(delta)}m`;

  return (
    <span
      className={`shrink-0 font-mono text-xs ${color}`}
      title={title}
      aria-label={title}
    >
      {formatDelta(delta)}
    </span>
  );
}
