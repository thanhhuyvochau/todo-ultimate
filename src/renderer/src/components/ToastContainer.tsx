import { useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from "lucide-react";
import {
  useToastStore,
  type Toast,
  type ToastType,
} from "../stores/toastStore";

const AUTO_DISMISS_MS = 5000;

interface ToastStyle {
  icon: typeof Info;
  container: string;
  iconColor: string;
}

const TOAST_STYLES: Record<ToastType, ToastStyle> = {
  success: {
    icon: CheckCircle2,
    container: "border-success/20 bg-success-subtle text-success",
    iconColor: "text-success",
  },
  error: {
    icon: AlertCircle,
    container: "border-danger/20 bg-danger-subtle text-danger",
    iconColor: "text-danger",
  },
  warning: {
    icon: AlertTriangle,
    container: "border-warning/20 bg-warning-subtle text-warning",
    iconColor: "text-warning",
  },
  info: {
    icon: Info,
    container: "border-info/20 bg-info-subtle text-info",
    iconColor: "text-info",
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismissToast = useToastStore((s) => s.dismissToast);
  const style = TOAST_STYLES[toast.type];
  const Icon = style.icon;
  const autoDismiss = toast.type !== "error";

  useEffect(() => {
    if (!autoDismiss) return;
    const timer = setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, autoDismiss, dismissToast]);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 rounded-md border px-3 py-2 text-xs shadow-lg ${style.container}`}
      role="status"
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${style.iconColor}`} />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => dismissToast(toast.id)}
        className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-10 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
