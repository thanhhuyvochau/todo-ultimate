import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PomodoroSettings } from "../PomodoroSettings";
import {
  DEFAULT_POMODORO_DURATIONS,
  POMODORO_DURATIONS,
  usePomodoroStore,
} from "../../stores/pomodoroStore";
import { useToastStore } from "../../stores/toastStore";

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
  window.localStorage.clear();
  useToastStore.setState({ toasts: [] });
  resetStore();
});

describe("PomodoroSettings", () => {
  it("renders the configured durations and saves valid edits", async () => {
    const user = userEvent.setup();
    render(<PomodoroSettings />);

    const focusInput = screen.getByLabelText("Focus time");
    expect((focusInput as HTMLInputElement).value).toBe("25");
    expect(
      (screen.getByLabelText("Short break") as HTMLInputElement).value,
    ).toBe("5");
    expect(
      (screen.getByLabelText("Long break") as HTMLInputElement).value,
    ).toBe("15");

    await user.clear(focusInput);
    await user.type(focusInput, "45");
    await user.clear(screen.getByLabelText("Short break"));
    await user.type(screen.getByLabelText("Short break"), "10");
    await user.clear(screen.getByLabelText("Long break"));
    await user.type(screen.getByLabelText("Long break"), "20");
    await user.click(screen.getByRole("button", { name: "Save durations" }));

    expect(usePomodoroStore.getState().durations).toEqual({
      focusMinutes: 45,
      shortBreakMinutes: 10,
      longBreakMinutes: 20,
    });
    expect(useToastStore.getState().toasts[0]?.message).toBe(
      "Pomodoro durations saved.",
    );
  });

  it("shows an inline boundary error and prevents saving invalid edits", async () => {
    const user = userEvent.setup();
    render(<PomodoroSettings />);

    const focusInput = screen.getByLabelText("Focus time");
    await user.clear(focusInput);
    await user.type(focusInput, "181");
    await user.tab();

    expect(screen.getByRole("alert").textContent).toContain("1 to 180 minutes");
    expect(
      (
        screen.getByRole("button", {
          name: "Save durations",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(usePomodoroStore.getState().durations).toEqual(
      DEFAULT_POMODORO_DURATIONS,
    );
  });
});
