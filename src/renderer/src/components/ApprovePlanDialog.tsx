import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ApprovePlanDialogProps {
  isOpen: boolean;
  taskCount: number;
  alreadyApproved: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ApprovePlanDialog({
  isOpen,
  taskCount,
  alreadyApproved,
  onConfirm,
  onCancel,
}: ApprovePlanDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        const dialog = document.querySelector("[data-approve-dialog]");
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    confirmRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
      <div
        data-approve-dialog
        className="w-full max-w-sm rounded-xl border border-border bg-bg-elevated p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-medium text-text-primary">
              Approve plan?
            </p>
            <p className="mt-1 text-sm text-text-muted">
              This will schedule {taskCount} task{taskCount === 1 ? "" : "s"}{" "}
              for today.
              {alreadyApproved &&
                " A plan is already approved for today; it will be replaced."}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
