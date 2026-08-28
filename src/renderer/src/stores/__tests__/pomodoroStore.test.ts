import { beforeEach, describe, expect, it, vi } from "vitest";
import { POMODORO_DURATIONS, usePomodoroStore } from "../pomodoroStore";
import { useToastStore } from "../toastStore";

function resetStore(): void {
  usePomodoroStore.setState({
    mode: "focus",
    secondsRemaining: POMODORO_DURATIONS.focus,
    isRunning: false,
    endsAt: null,
    completedFocusSessions: 0,
    sessionDate: "2026-08-28",
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-28T09:00:00"));
  window.localStorage.clear();
  useToastStore.setState({ toasts: [] });
  resetStore();
});

describe("pomodoroStore", () => {
  it("starts from a deadline and pauses without losing elapsed time", () => {
    usePomodoroStore.getState().start();
    vi.setSystemTime(new Date("2026-08-28T09:00:10"));
    usePomodoroStore.getState().pause();

    const state = usePomodoroStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.endsAt).toBeNull();
    expect(state.secondsRemaining).toBe(POMODORO_DURATIONS.focus - 10);
  });

  it("moves to a short break when a focus session completes", () => {
    usePomodoroStore.setState({ secondsRemaining: 1 });
    usePomodoroStore.getState().start();
    vi.advanceTimersByTime(1000);
    usePomodoroStore.getState().tick();

    const state = usePomodoroStore.getState();
    expect(state.mode).toBe("shortBreak");
    expect(state.secondsRemaining).toBe(POMODORO_DURATIONS.shortBreak);
    expect(state.completedFocusSessions).toBe(1);
    expect(state.isRunning).toBe(false);
    expect(useToastStore.getState().toasts[0]?.message).toContain(
      "short break",
    );
  });

  it("moves to a long break after the fourth focus session", () => {
    usePomodoroStore.setState({
      secondsRemaining: 1,
      completedFocusSessions: 3,
    });
    usePomodoroStore.getState().start();
    vi.advanceTimersByTime(1000);
    usePomodoroStore.getState().tick();

    expect(usePomodoroStore.getState().mode).toBe("longBreak");
    expect(usePomodoroStore.getState().completedFocusSessions).toBe(4);
  });

  it("restores and reconciles a running timer from local storage", () => {
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
    expect(state.isRunning).toBe(true);
    expect(state.secondsRemaining).toBe(40);
    expect(state.completedFocusSessions).toBe(2);
  });
});
