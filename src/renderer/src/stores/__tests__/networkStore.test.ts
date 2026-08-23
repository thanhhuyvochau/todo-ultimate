import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useNetworkStore } from "../networkStore";

beforeEach(() => {
  vi.useFakeTimers();
  useNetworkStore.getState().initNetwork();
  useNetworkStore.setState({ isOnline: true });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("networkStore", () => {
  it("defaults to online", () => {
    expect(useNetworkStore.getState().isOnline).toBe(true);
  });

  it("flips offline after the debounce when an offline event fires", () => {
    window.dispatchEvent(new Event("offline"));
    vi.advanceTimersByTime(1000);

    expect(useNetworkStore.getState().isOnline).toBe(false);
  });

  it("flips back online after the debounce when an online event fires", () => {
    window.dispatchEvent(new Event("offline"));
    vi.advanceTimersByTime(1000);
    window.dispatchEvent(new Event("online"));
    vi.advanceTimersByTime(1000);

    expect(useNetworkStore.getState().isOnline).toBe(true);
  });

  it("debounces rapid transitions to avoid flicker", () => {
    window.dispatchEvent(new Event("offline"));
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new Event("online"));
    vi.advanceTimersByTime(500);

    expect(useNetworkStore.getState().isOnline).toBe(true);

    vi.advanceTimersByTime(500);
    expect(useNetworkStore.getState().isOnline).toBe(true);
  });
});
