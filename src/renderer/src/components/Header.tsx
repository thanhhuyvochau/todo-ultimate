import { Clock } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-bg-secondary px-4">
      <h1 className="text-lg font-semibold text-text-primary">
        AI Task Planner
      </h1>
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Clock className="h-4 w-4" />
        <span>No active timer</span>
      </div>
    </header>
  );
}
