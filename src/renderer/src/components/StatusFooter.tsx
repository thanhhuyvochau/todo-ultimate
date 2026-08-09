import { useEffect, useState } from 'react';
import { KeyRound, Key } from 'lucide-react';

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

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border px-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-2xs text-text-muted">
          <span className="h-1 w-1 rounded-full bg-success opacity-70" />
          Saved
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1 text-2xs text-text-muted">
          {hasApiKey ? (
            <KeyRound className="h-2.5 w-2.5 text-success opacity-60" />
          ) : (
            <Key className="h-2.5 w-2.5 text-warning opacity-60" />
          )}
          {hasApiKey ? 'API ready' : 'No API key'}
        </span>
        <span className="font-mono text-2xs text-text-muted">{timeStr}</span>
      </div>
    </footer>
  );
}
