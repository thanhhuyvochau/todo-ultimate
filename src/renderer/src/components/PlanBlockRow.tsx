import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Lock, X, Check, Clock } from "lucide-react";
import type { PlannedTaskBlock } from "@/shared/models";
import { PriorityBadge } from "./PriorityBadge";

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface PlanBlockRowProps {
  block: PlannedTaskBlock;
  dragHandle?: ReactNode;
  onUpdateBudget: (taskId: string, budgetedMinutes: number) => void;
  onRemove: (taskId: string) => void;
}

export function PlanBlockRow({
  block,
  dragHandle,
  onUpdateBudget,
  onRemove,
}: PlanBlockRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [budgetValue, setBudgetValue] = useState(String(block.budgetedMinutes));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) setBudgetValue(String(block.budgetedMinutes));
  }, [block.budgetedMinutes, isEditing]);

  const handleSave = () => {
    const minutes = parseInt(budgetValue, 10);
    if (isNaN(minutes) || minutes < 1 || minutes > 1440) return;
    onUpdateBudget(block.taskId, minutes);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
    }
  };

  const endTime = block.scheduledStart + block.budgetedMinutes * 60_000;

  return (
    <div className="group flex items-center gap-3 border-b border-border px-5 py-3.5 transition-colors duration-100 hover:bg-bg-secondary">
      <div className="flex w-6 shrink-0 justify-center">
        {dragHandle ?? (
          <Lock className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
        )}
      </div>

      <div className="flex w-32 shrink-0 items-center gap-1.5 font-mono text-sm text-text-muted">
        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span>
          {formatTime(block.scheduledStart)} – {formatTime(endTime)}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <PriorityBadge priority={block.priority} />
        <span className="truncate text-base text-text-primary">
          {block.title}
        </span>
        {block.rationale && (
          <span className="hidden truncate text-xs text-text-muted md:inline">
            · {block.rationale}
          </span>
        )}
      </div>

      {isEditing ? (
        <div className="flex shrink-0 items-center gap-1">
          <input
            ref={inputRef}
            type="number"
            value={budgetValue}
            onChange={(e) => setBudgetValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            min={1}
            max={1440}
            className="w-20 rounded bg-bg-elevated px-2 py-1 text-sm text-text-primary ring-1 ring-border-focus focus:outline-none"
          />
          <button
            onClick={handleSave}
            className="flex h-8 w-8 items-center justify-center rounded text-accent hover:bg-accent-subtle"
            aria-label="Save budget"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="shrink-0 font-mono text-sm text-text-muted hover:text-accent"
          aria-label="Edit time budget"
          title="Edit time budget"
        >
          {formatMinutes(block.budgetedMinutes)}
        </button>
      )}

      {!block.isFixed && (
        <button
          onClick={() => onRemove(block.taskId)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-text-muted opacity-0 transition-opacity duration-100 hover:bg-danger-subtle hover:text-danger group-hover:opacity-100"
          aria-label={`Remove ${block.title} from plan`}
          title="Remove from plan"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
