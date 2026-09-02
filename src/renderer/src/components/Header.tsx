import { useEffect, useState } from "react";
import { Zap, Pause, Sun, Moon, TriangleAlert } from "lucide-react";
import { useTimerStore } from "../stores/timerStore";
import { useTaskStore } from "../stores/taskStore";
import { useThemeStore } from "../stores/themeStore";
import { Tooltip } from "./ui/Tooltip";
import { useGoogleCalendarStore } from "../stores/googleCalendarStore";

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
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const calendarSettings = useGoogleCalendarStore((s) => s.settings);
  const loadCalendarSettings = useGoogleCalendarStore((s) => s.load);
  const [showCalendarWarning, setShowCalendarWarning] = useState(false);

  useEffect(() => {
    void loadCalendarSettings();
    const refresh = window.setInterval(
      () => void loadCalendarSettings(),
      60_000,
    );
    return () => window.clearInterval(refresh);
  }, [loadCalendarSettings]);

  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const themeLabel =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

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
    <header className="flex h-14 shrink-0 items-center justify-between px-5">
      <div className="flex items-center gap-2.5">
        <Zap className="h-5 w-5 text-accent" strokeWidth={2.5} />
        <span className="text-base font-semibold tracking-tight text-text-primary">
          Focus
        </span>
      </div>

      <div className="flex items-center gap-3">
        {calendarSettings?.syncError && (
          <div className="relative">
            <Tooltip label="Google Calendar needs attention" side="bottom">
              <button
                onClick={() => setShowCalendarWarning((visible) => !visible)}
                className="flex h-8 w-8 items-center justify-center rounded text-warning hover:bg-warning-subtle"
                aria-label="Show Google Calendar sync warning"
              >
                <TriangleAlert className="h-4 w-4" />
              </button>
            </Tooltip>
            {showCalendarWarning && (
              <div className="absolute right-0 top-10 z-20 w-72 rounded-md border border-warning/20 bg-bg-elevated p-3 text-sm text-text-secondary shadow-lg">
                <p className="font-medium text-warning">
                  Google Calendar sync paused
                </p>
                <p className="mt-1">{calendarSettings.syncError}</p>
              </div>
            )}
          </div>
        )}
        {activeTaskId ? (
          <div className="flex items-center gap-2.5 rounded-full border border-border bg-bg-secondary px-4 py-1.5 text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate max-w-[200px] font-medium text-text-primary">
              {activeTask?.title ?? "Active Task"}
            </span>
            <span className="font-mono text-text-secondary">
              {formatSeconds(elapsedSeconds)}
            </span>
            <Tooltip label="Pause timer" side="bottom">
              <button
                onClick={handleToggleTimer}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-tertiary text-text-primary transition-colors hover:bg-border"
                aria-label="Pause timer"
              >
                <Pause className="h-3.5 w-3.5 fill-current" />
              </button>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-bg-tertiary" />
            <span className="font-mono">No active timer</span>
          </div>
        )}

        <Tooltip label={themeLabel}>
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-secondary"
            aria-label={themeLabel}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
