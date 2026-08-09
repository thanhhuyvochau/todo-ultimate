import type { TaskStatus } from '@shared/models';

const config: Record<TaskStatus, { dot: string; label: string }> = {
  todo:        { dot: 'border border-border-focus opacity-40',     label: 'Todo' },
  in_progress: { dot: 'bg-accent',                                 label: 'Active' },
  completed:   { dot: 'bg-success',                                label: 'Done' },
};

interface StatusBadgeProps {
  status: TaskStatus;
  showLabel?: boolean;
}

export function StatusBadge({ status, showLabel = false }: StatusBadgeProps) {
  const { dot, label } = config[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {showLabel && (
        <span className="text-2xs text-text-muted">{label}</span>
      )}
    </span>
  );
}
