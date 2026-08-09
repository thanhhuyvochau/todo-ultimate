import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type DeleteItemType = 'task' | 'rule';

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
  itemType = 'task',
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancel(); return; }
      if (e.key === 'Tab') {
        const dialog = document.querySelector('[data-delete-dialog]');
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last  = focusable[focusable.length - 1]!;
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    cancelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
      <div
        data-delete-dialog
        className="w-full max-w-sm rounded-lg border border-border bg-bg-elevated p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-primary">
              Delete {itemType === 'rule' ? 'rule' : 'task'}?
            </p>
            <p className="mt-1 text-xs text-text-muted">
              <span className="text-text-secondary">&ldquo;{taskTitle}&rdquo;</span>
              {' '}will be permanently removed.
              {itemType === 'rule' && ' Existing tasks will not be affected.'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
