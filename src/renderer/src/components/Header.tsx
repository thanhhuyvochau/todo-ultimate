import { Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-accent" strokeWidth={2.5} />
        <span className="text-sm font-semibold tracking-tight text-text-primary">
          Focus
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-bg-tertiary" />
        <span className="font-mono">No active task</span>
      </div>
    </header>
  );
}
