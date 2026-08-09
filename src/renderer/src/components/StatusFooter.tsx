import { useEffect, useState } from "react";
import { CheckCircle2, Key, KeyRound, Clock } from "lucide-react";

export function StatusFooter() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    window.api.getApiKey().then((result) => {
      if (result.ok) setHasApiKey(result.data.hasKey);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-bg-secondary px-4 text-xs text-text-muted">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-success" />
          All changes saved
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          {hasApiKey ? (
            <KeyRound className="h-3 w-3 text-success" />
          ) : (
            <Key className="h-3 w-3 text-warning" />
          )}
          {hasApiKey ? "API key set" : "Set API key in Settings"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeStr}
        </span>
      </div>
    </footer>
  );
}
