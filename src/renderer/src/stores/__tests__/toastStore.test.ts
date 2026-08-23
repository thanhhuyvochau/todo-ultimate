import { describe, it, expect, beforeEach } from "vitest";
import { useToastStore } from "../toastStore";

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe("toastStore", () => {
  it("adds a toast with type and message", () => {
    useToastStore.getState().addToast("success", "Saved");

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.type).toBe("success");
    expect(toasts[0]?.message).toBe("Saved");
  });

  it("dismisses a toast by id", () => {
    useToastStore.getState().addToast("error", "Failed");
    const id = useToastStore.getState().toasts[0]!.id;

    useToastStore.getState().dismissToast(id);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("assigns unique ids to multiple toasts", () => {
    useToastStore.getState().addToast("info", "one");
    useToastStore.getState().addToast("info", "two");

    const ids = useToastStore.getState().toasts.map((t) => t.id);
    expect(ids[0]).not.toBe(ids[1]);
  });
});
