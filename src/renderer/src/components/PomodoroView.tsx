import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import {
  POMODORO_DURATIONS,
  usePomodoroStore,
  type PomodoroMode,
} from "../stores/pomodoroStore";
import { PomodoroProgress } from "./PomodoroProgress";
import { Tooltip } from "./ui/Tooltip";

const MODES: { id: PomodoroMode; label: string }[] = [
  { id: "focus", label: "Focus" },
  { id: "shortBreak", label: "Short break" },
  { id: "longBreak", label: "Long break" },
];

export function PomodoroView() {
  const {
    mode,
    secondsRemaining,
    isRunning,
    completedFocusSessions,
    start,
    pause,
    reset,
    skip,
    selectMode,
  } = usePomodoroStore();
  const activeMode = MODES.find((item) => item.id === mode)!;
  const completedInCycle = completedFocusSessions % 4;
  const cyclePosition =
    completedFocusSessions > 0 && completedInCycle === 0 ? 4 : completedInCycle;

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
        <span className="text-lg font-semibold text-text-primary">
          Pomodoro
        </span>
      </div>
      <div className="flex flex-1 overflow-y-auto p-6">
        <div className="m-auto flex w-full max-w-xl flex-col items-center rounded-xl border border-border bg-bg-surface px-8 py-7 shadow-sm">
          <div
            className="flex rounded-lg bg-bg-tertiary p-1"
            aria-label="Pomodoro mode"
          >
            {MODES.map((item) => (
              <button
                key={item.id}
                onClick={() => selectMode(item.id)}
                aria-pressed={mode === item.id}
                className={[
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  mode === item.id
                    ? "bg-bg-elevated text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="my-7">
            <PomodoroProgress
              label={activeMode.label}
              secondsRemaining={secondsRemaining}
              totalSeconds={POMODORO_DURATIONS[mode]}
            />
          </div>
          <div className="flex items-center gap-3">
            <Tooltip label="Reset timer" side="bottom">
              <button
                onClick={reset}
                aria-label="Reset timer"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </Tooltip>
            <button
              onClick={isRunning ? pause : start}
              className="flex min-w-32 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              {isRunning ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              {isRunning ? "Pause" : "Start"}
            </button>
            <Tooltip label="Skip interval" side="bottom">
              <button
                onClick={skip}
                aria-label="Skip interval"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
          <div className="mt-7 flex flex-col items-center gap-2">
            <div
              className="flex gap-2"
              aria-label={`${cyclePosition} of 4 focus sessions in this cycle`}
            >
              {[0, 1, 2, 3].map((position) => (
                <span
                  key={position}
                  className={`h-2 w-8 rounded-full ${position < cyclePosition ? "bg-accent" : "bg-bg-tertiary"}`}
                />
              ))}
            </div>
            <p className="text-sm text-text-muted">
              {completedFocusSessions} focus{" "}
              {completedFocusSessions === 1 ? "session" : "sessions"} completed
              today
            </p>
          </div>
          <p className="mt-5 text-center text-xs text-text-muted">
            25 min focus · 5 min short break · 15 min long break after four
            sessions
          </p>
        </div>
      </div>
    </div>
  );
}
