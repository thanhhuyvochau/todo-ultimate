import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_POMODORO_DURATIONS,
  POMODORO_DURATIONS,
  usePomodoroStore,
} from "../pomodoroStore";
import { useToastStore } from "../toastStore";

function resetStore(): void {
  usePomodoroStore.setState({
    mode: "focus",
    secondsRemaining: POMODORO_DURATIONS.focus,
    intervalTotalSeconds: POMODORO_DURATIONS.focus,
    hasStartedCurrentInterval: false,
    isRunning: false,
    endsAt: null,
    completedFocusSessions: 0,
    sessionDate: "2026-08-28",
    durations: { ...DEFAULT_POMODORO_DURATIONS },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-28T09:00:00"));
  window.localStorage.clear();
  useToastStore.setState({ toasts: [] });
  resetStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("pomodoroStore", () => {
  it("starts from a deadline and pauses without losing elapsed time", () => {
    usePomodoroStore.getState().start();
    vi.setSystemTime(new Date("2026-08-28T09:00:10"));
    usePomodoroStore.getState().pause();

    const state = usePomodoroStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.endsAt).toBeNull();
    expect(state.hasStartedCurrentInterval).toBe(true);
    expect(state.secondsRemaining).toBe(POMODORO_DURATIONS.focus - 10);
  });

  it("persists and restores configured durations", () => {
    const durations = {
      focusMinutes: 45,
      shortBreakMinutes: 8,
      longBreakMinutes: 25,
    };

    expect(usePomodoroStore.getState().saveDurations(durations)).toBe(true);
    expect(usePomodoroStore.getState().secondsRemaining).toBe(45 * 60);
    expect(usePomodoroStore.getState().intervalTotalSeconds).toBe(45 * 60);

    resetStore();
    usePomodoroStore.getState().initPomodoro();

    expect(usePomodoroStore.getState().durations).toEqual(durations);
    expect(usePomodoroStore.getState().secondsRemaining).toBe(45 * 60);
  });

  it("rejects non-integer and out-of-range durations", () => {
    const result = usePomodoroStore.getState().saveDurations({
      focusMinutes: 25.5,
      shortBreakMinutes: 0,
      longBreakMinutes: 61,
    });

    expect(result).toBe(false);
    expect(usePomodoroStore.getState().durations).toEqual(
      DEFAULT_POMODORO_DURATIONS,
    );
  });

  it("falls back field-by-field for invalid persisted durations", () => {
    window.localStorage.setItem(
      "app.pomodoro",
      JSON.stringify({
        mode: "focus",
        secondsRemaining: 1500,
        isRunning: false,
        endsAt: null,
        completedFocusSessions: 0,
        sessionDate: "2026-08-28",
        durations: {
          focusMinutes: 181,
          shortBreakMinutes: 4.5,
          longBreakMinutes: 30,
        },
      }),
    );

    usePomodoroStore.getState().initPomodoro();

    expect(usePomodoroStore.getState().durations).toEqual({
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 30,
    });
  });

  it("migrates legacy persisted timer state", () => {
    window.localStorage.setItem(
      "app.pomodoro",
      JSON.stringify({
        mode: "focus",
        secondsRemaining: 100,
        isRunning: true,
        endsAt: Date.now() + 40_000,
        completedFocusSessions: 2,
        sessionDate: "2026-08-28",
      }),
    );

    usePomodoroStore.getState().initPomodoro();

    const state = usePomodoroStore.getState();
    expect(state.durations).toEqual(DEFAULT_POMODORO_DURATIONS);
    expect(state.intervalTotalSeconds).toBe(POMODORO_DURATIONS.focus);
    expect(state.hasStartedCurrentInterval).toBe(true);
    expect(state.secondsRemaining).toBe(40);
    expect(state.completedFocusSessions).toBe(2);
  });

  it("keeps a running interval stable when durations change", () => {
    usePomodoroStore.getState().start();
    vi.setSystemTime(new Date("2026-08-28T09:00:10"));
    usePomodoroStore.getState().tick();
    const previousSeconds = usePomodoroStore.getState().secondsRemaining;

    usePomodoroStore.getState().saveDurations({
      focusMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 20,
    });

    expect(usePomodoroStore.getState().isRunning).toBe(true);
    expect(usePomodoroStore.getState().secondsRemaining).toBe(previousSeconds);
    expect(usePomodoroStore.getState().intervalTotalSeconds).toBe(
      POMODORO_DURATIONS.focus,
    );
  });

  it("keeps a paused interval stable while applying new values on reset", () => {
    usePomodoroStore.getState().start();
    vi.setSystemTime(new Date("2026-08-28T09:00:10"));
    usePomodoroStore.getState().pause();
    const previousSeconds = usePomodoroStore.getState().secondsRemaining;

    usePomodoroStore.getState().saveDurations({
      focusMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 20,
    });

    expect(usePomodoroStore.getState().secondsRemaining).toBe(previousSeconds);
    expect(usePomodoroStore.getState().intervalTotalSeconds).toBe(
      POMODORO_DURATIONS.focus,
    );

    usePomodoroStore.getState().reset();
    expect(usePomodoroStore.getState().secondsRemaining).toBe(50 * 60);
    expect(usePomodoroStore.getState().intervalTotalSeconds).toBe(50 * 60);
  });

  it("uses configured durations for manual and automatic transitions", () => {
    usePomodoroStore.getState().saveDurations({
      focusMinutes: 30,
      shortBreakMinutes: 7,
      longBreakMinutes: 20,
    });
    usePomodoroStore.getState().selectMode("shortBreak");
    expect(usePomodoroStore.getState().secondsRemaining).toBe(7 * 60);

    usePomodoroStore.setState({
      mode: "focus",
      secondsRemaining: 1,
      intervalTotalSeconds: 30 * 60,
      hasStartedCurrentInterval: true,
      completedFocusSessions: 0,
    });
    usePomodoroStore.getState().start();
    vi.advanceTimersByTime(1000);
    usePomodoroStore.getState().tick();

    const state = usePomodoroStore.getState();
    expect(state.mode).toBe("shortBreak");
    expect(state.secondsRemaining).toBe(7 * 60);
    expect(state.intervalTotalSeconds).toBe(7 * 60);
    expect(state.hasStartedCurrentInterval).toBe(false);
    expect(useToastStore.getState().toasts[0]?.message).toContain(
      "short break",
    );
  });

  it("moves to a long break after the fourth focus session", () => {
    usePomodoroStore.setState({
      secondsRemaining: 1,
      intervalTotalSeconds: POMODORO_DURATIONS.focus,
      hasStartedCurrentInterval: true,
      completedFocusSessions: 3,
    });
    usePomodoroStore.getState().start();
    vi.advanceTimersByTime(1000);
    usePomodoroStore.getState().tick();

    expect(usePomodoroStore.getState().mode).toBe("longBreak");
    expect(usePomodoroStore.getState().completedFocusSessions).toBe(4);
  });
});
