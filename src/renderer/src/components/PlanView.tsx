import { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Check,
  X,
  Loader2,
  Sparkles,
  Inbox,
  GripVertical,
} from "lucide-react";
import type { PlannedTaskBlock } from "@/shared/models";
import { usePlanStore } from "../stores/planStore";
import { useTaskStore } from "../stores/taskStore";
import { PlanBlockRow } from "./PlanBlockRow";
import { ApprovePlanDialog } from "./ApprovePlanDialog";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableBlockRowProps {
  block: PlannedTaskBlock;
  onUpdateBudget: (taskId: string, budgetedMinutes: number) => void;
  onRemove: (taskId: string) => void;
}

function SortableBlockRow({
  block,
  onUpdateBudget,
  onRemove,
}: SortableBlockRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.taskId, disabled: block.isFixed });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <PlanBlockRow
        block={block}
        dragHandle={
          block.isFixed ? undefined : (
            <button
              {...attributes}
              {...listeners}
              className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
              aria-label="Reorder"
              title="Drag to reorder"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )
        }
        onUpdateBudget={onUpdateBudget}
        onRemove={onRemove}
      />
    </div>
  );
}

export function PlanView({ onApproved }: { onApproved: () => void }) {
  const {
    plan,
    focusHours,
    primaryGoal,
    isGenerating,
    isApproving,
    error,
    existingTodayPlan,
    setFocusHours,
    setPrimaryGoal,
    generatePlan,
    loadTodayPlan,
    updateBudget,
    removeTask,
    reorder,
    approvePlan,
    discardPlan,
    clearError,
  } = usePlanStore();
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);

  const [showApprove, setShowApprove] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const titleMap = useMemo(
    () => new Map(tasks.map((t) => [t.id, t.title])),
    [tasks],
  );

  useEffect(() => {
    loadTodayPlan();
    fetchTasks();
  }, [loadTodayPlan, fetchTasks]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleGenerate = async () => {
    const ok = await generatePlan();
    if (!ok) {
      setToast({
        msg: usePlanStore.getState().error ?? "Plan generation failed.",
        type: "error",
      });
    }
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      reorder(active.id as string, over.id as string);
    },
    [reorder],
  );

  const handleApprove = async () => {
    setShowApprove(false);
    const ok = await approvePlan();
    if (ok) {
      await fetchTasks();
      onApproved();
    } else {
      setToast({
        msg: usePlanStore.getState().error ?? "Approval failed.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <div className="flex h-11 shrink-0 items-center border-b border-border px-4">
        <span className="text-sm font-semibold text-text-primary">
          Daily Plan
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-danger/20 bg-danger-subtle px-4 py-2">
          <span className="flex-1 text-xs text-danger">{error}</span>
          <button
            onClick={clearError}
            className="text-xs text-danger underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {!plan ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
          <div className="text-center">
            <Sparkles className="mx-auto h-8 w-8 text-accent" />
            <h2 className="mt-3 text-lg font-medium text-text-primary">
              Plan your day
            </h2>
            <p className="mt-1 max-w-sm text-xs text-text-muted">
              The AI proposes a schedule from your backlog, fixed commitments,
              and historical accuracy.
            </p>
          </div>
          <div className="w-full max-w-sm space-y-4">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                Available focus hours
              </label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={Number.isFinite(focusHours) ? focusHours : ""}
                onChange={(e) => setFocusHours(Number(e.target.value))}
                className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                Primary goal (optional)
              </label>
              <input
                type="text"
                value={primaryGoal}
                onChange={(e) => setPrimaryGoal(e.target.value)}
                placeholder="e.g. Finish API integration"
                className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !(focusHours > 0)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Daily Plan
            </button>
            {existingTodayPlan?.isApproved && (
              <p className="text-center text-xs text-warning">
                A plan is already approved for today. Generating a new one will
                replace it on approval.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-bg-surface p-4">
              <p className="text-sm font-medium text-text-primary">
                {plan.primaryGoal || "Daily plan"}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{plan.summary}</p>
              <p className="mt-2 text-xs text-text-muted">
                {plan.schedule.length} scheduled ·{" "}
                {plan.unscheduledTasks.length} unscheduled · {plan.focusHours}h
                focus
              </p>
            </div>

            {plan.schedule.length === 0 ? (
              <p className="py-8 text-center text-xs text-text-muted">
                No tasks were scheduled.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-bg-surface">
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                  <SortableContext items={plan.schedule.map((b) => b.taskId)}>
                    {plan.schedule.map((block) => (
                      <SortableBlockRow
                        key={block.taskId}
                        block={block}
                        onUpdateBudget={updateBudget}
                        onRemove={removeTask}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {plan.unscheduledTasks.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-surface p-4">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Inbox className="h-3.5 w-3.5" />
                  <span>Not scheduled ({plan.unscheduledTasks.length})</span>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-text-secondary">
                  {plan.unscheduledTasks.map((id) => (
                    <li key={id}>{titleMap.get(id) ?? id}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2 pb-4">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 rounded-md bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-border disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerate
              </button>
              <button
                onClick={discardPlan}
                disabled={isApproving}
                className="rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50"
              >
                Discard
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setShowApprove(true)}
                disabled={isApproving || plan.schedule.length === 0}
                className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Approve Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={[
            "fixed bottom-10 right-4 z-50 flex items-center gap-3 rounded-md border px-3 py-2 text-xs shadow-lg",
            toast.type === "error"
              ? "border-danger/20 bg-danger-subtle text-danger"
              : "border-success/20 bg-success-subtle text-success",
          ].join(" ")}
        >
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            className="opacity-60 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <ApprovePlanDialog
        isOpen={showApprove}
        taskCount={plan?.schedule.length ?? 0}
        alreadyApproved={existingTodayPlan?.isApproved ?? false}
        onConfirm={handleApprove}
        onCancel={() => setShowApprove(false)}
      />
    </div>
  );
}
