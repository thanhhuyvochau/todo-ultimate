import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RendererApi } from "@shared/api";
import { useTimerStore } from "../timerStore";

const startTimer = vi.fn();

beforeEach(() => {
  startTimer.mockReset();
  Object.defineProperty(window, "api", {
    configurable: true,
    value: { startTimer } as unknown as RendererApi,
  });
  useTimerStore.setState({
    activeTaskId: "old-task",
    elapsedSeconds: 125,
    isInitializing: false,
    error: null,
  });
});

describe("timerStore.startTimer", () => {
  it("updates the header source immediately and resets prior elapsed time", async () => {
    startTimer.mockResolvedValue({ ok: true, data: { logId: "log-1" } });

    const success = await useTimerStore.getState().startTimer("new-task");

    expect(success).toBe(true);
    expect(useTimerStore.getState()).toMatchObject({
      activeTaskId: "new-task",
      elapsedSeconds: 0,
      error: null,
    });
  });

  it("preserves the prior header state when the backend rejects the start", async () => {
    startTimer.mockResolvedValue({
      ok: false,
      error: {
        code: "STATE_TRANSITION_ILLEGAL",
        message:
          "Cannot start a task that is in the backlog. Move it to Today first.",
      },
    });

    const success = await useTimerStore.getState().startTimer("backlog-task");

    expect(success).toBe(false);
    expect(useTimerStore.getState()).toMatchObject({
      activeTaskId: "old-task",
      elapsedSeconds: 125,
      error:
        "Cannot start a task that is in the backlog. Move it to Today first.",
    });
  });
});
