import { useEffect, useState } from "react";
import { KeyRound, Key, WifiOff } from "lucide-react";
import { useSettingsStore } from "../stores/settingsStore";
import { useNetworkStore } from "../stores/networkStore";

export function StatusFooter() {
  const hasApiKey = useSettingsStore((s) => s.hasKey);
  const loadStatus = useSettingsStore((s) => s.loadStatus);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border px-5">
      <div className="flex items-center gap-4">
        {!isOnline && (
          <span className="flex items-center gap-1.5 text-xs text-warning">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — AI features unavailable
          </span>
        )}
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success opacity-70" />
          Saved
        </span>
      </div>
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          {hasApiKey ? (
            <KeyRound className="h-3.5 w-3.5 text-success opacity-60" />
          ) : (
            <Key className="h-3.5 w-3.5 text-warning opacity-60" />
          )}
          {hasApiKey ? "API ready" : "No API key"}
        </span>
        <span className="font-mono text-xs text-text-muted">{timeStr}</span>
      </div>
    </footer>
  );
}
