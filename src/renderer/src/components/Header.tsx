import { Zap, Pause, Play } from "lucide-react";
import { useTimerStore } from "../stores/timerStore";
import { useTaskStore } from "../stores/taskStore";
import { Tooltip } from "./ui/Tooltip";

function formatSeconds(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function Header() {
  const { activeTaskId, elapsedSeconds, pauseTimer, startTimer } =
    useTimerStore();
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  const handleToggleTimer = async () => {
    if (!activeTaskId) return;
    if (elapsedSeconds > 0) {
      await pauseTimer(activeTaskId);
      await updateTask(activeTaskId, { status: "todo" });
    } else {
      await startTimer(activeTaskId);
    }
  };

  return (
    <header className="flex h-11 shrink-0 items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-accent" strokeWidth={2.5} />
        <span className="text-sm font-semibold tracking-tight text-text-primary">
          Focus
        </span>
      </div>

      {activeTaskId ? (
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-bg-secondary px-3 py-1 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="truncate max-w-[180px] font-medium text-text-primary">
            {activeTask?.title ?? "Active Task"}
          </span>
          <span className="font-mono text-text-secondary">
            {formatSeconds(elapsedSeconds)}
          </span>
          <Tooltip label="Pause timer" side="bottom">
            <button
              onClick={handleToggleTimer}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-tertiary text-text-primary transition-colors hover:bg-border"
              aria-label="Pause timer"
            >
              <Pause className="h-3 w-3 fill-current" />
            </button>
          </Tooltip>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-bg-tertiary" />
          <span className="font-mono">No active timer</span>
        </div>
      )}
    </header>
  );
}
