import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

type DeleteItemType = "task" | "rule";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  taskTitle: string;
  itemType?: DeleteItemType;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  isOpen,
  taskTitle,
  itemType = "task",
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        const dialog = document.querySelector("[data-delete-dialog]");
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
    cancelRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        data-delete-dialog
        className="w-full max-w-lg rounded-xl border border-border bg-bg-surface p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-subtle">
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary">
              {itemType === "rule" ? "Delete Rule?" : "Delete Task?"}
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Are you sure you want to delete &lsquo;{taskTitle}&rsquo;?{" "}
              {itemType === "rule"
                ? "This won't remove already-generated tasks."
                : "This action cannot be undone."}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-text-muted transition-colors hover:text-text-primary"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded-md bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
