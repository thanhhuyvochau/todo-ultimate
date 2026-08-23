import { useEffect, useState } from "react";
import { KeyRound, Loader2, Trash2, Zap } from "lucide-react";
import { useSettingsStore } from "../stores/settingsStore";
import { useNetworkStore } from "../stores/networkStore";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

export function ApiKeySettings() {
  const {
    hasKey,
    isLoading,
    isTesting,
    error,
    testResult,
    loadStatus,
    saveKey,
    deleteKey,
    testConnection,
    clearError,
  } = useSettingsStore();

  const isOnline = useNetworkStore((s) => s.isOnline);
  const [apiKey, setApiKey] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    const ok = await saveKey(trimmed);
    if (ok) setApiKey("");
  };

  const handleDelete = async () => {
    setShowDelete(false);
    await deleteKey();
  };

  const status = error
    ? { label: "Error", dot: "bg-danger", cls: "text-danger" }
    : testResult === "success"
      ? { label: "Connection OK", dot: "bg-success", cls: "text-success" }
      : testResult === "failed"
        ? { label: "Connection failed", dot: "bg-danger", cls: "text-danger" }
        : hasKey
          ? { label: "Key saved", dot: "bg-success", cls: "text-success" }
          : {
              label: "No key set",
              dot: "bg-border-focus opacity-40",
              cls: "text-text-muted",
            };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
          <span className="text-sm font-medium text-text-primary">API Key</span>
        </div>
        <span className={`flex items-center gap-1.5 text-xs ${status.cls}`}>
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot}`}
          />
          {status.label}
        </span>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded border border-danger/20 bg-danger-subtle px-3 py-2">
          <span className="flex-1 text-xs text-danger">{error}</span>
          <button
            onClick={clearError}
            className="text-xs text-danger underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          autoComplete="off"
          spellCheck={false}
          className="flex-1 rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={handleSave}
          disabled={isLoading || !apiKey.trim()}
          className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => testConnection()}
          disabled={isTesting || !hasKey || !isOnline}
          className="flex h-8 items-center gap-1.5 rounded-md bg-bg-tertiary px-3 text-xs font-medium text-text-primary transition-colors hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isTesting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          Test Connection
        </button>
        <button
          onClick={() => setShowDelete(true)}
          disabled={!hasKey}
          className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-danger transition-colors hover:bg-danger-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      {testResult === "success" && (
        <p className="mt-2 text-xs text-success">Connection successful.</p>
      )}
      {testResult === "failed" && (
        <p className="mt-2 text-xs text-danger">
          Connection failed — check your key or network.
        </p>
      )}

      <DeleteConfirmationDialog
        isOpen={showDelete}
        taskTitle=""
        itemType="key"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
