import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeySettings } from "../ApiKeySettings";
import { useSettingsStore } from "../../stores/settingsStore";

type ApiMock = Record<string, ReturnType<typeof vi.fn>>;

function setupApi(overrides: ApiMock = {}): ApiMock {
  const apiMock: ApiMock = {
    getApiKey: vi.fn().mockResolvedValue({ ok: true, data: { hasKey: false } }),
    setApiKey: vi.fn().mockResolvedValue({ ok: true, data: { success: true } }),
    deleteApiKey: vi
      .fn()
      .mockResolvedValue({ ok: true, data: { success: true } }),
    testConnection: vi
      .fn()
      .mockResolvedValue({ ok: true, data: { success: true } }),
    ...overrides,
  };
  (window as unknown as Record<string, unknown>).api = apiMock;
  return apiMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
  useSettingsStore.setState({
    hasKey: false,
    isLoading: false,
    isTesting: false,
    error: null,
    testResult: "idle",
  });
});

describe("ApiKeySettings", () => {
  it("saves a key and clears the input", async () => {
    const api = setupApi();
    render(<ApiKeySettings />);

    const input = screen.getByPlaceholderText("sk-...");
    await userEvent.type(input, "sk-my-key");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(api.setApiKey).toHaveBeenCalledWith({ apiKey: "sk-my-key" });
    });
    expect((input as HTMLInputElement).value).toBe("");
    expect(useSettingsStore.getState().hasKey).toBe(true);
  });

  it("shows 'No key set' status initially", async () => {
    setupApi();
    render(<ApiKeySettings />);

    await waitFor(() => {
      expect(screen.getByText("No key set")).toBeTruthy();
    });
  });

  it("shows 'Key saved' status and enables delete when a key exists", async () => {
    setupApi({
      getApiKey: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { hasKey: true } }),
    });
    render(<ApiKeySettings />);

    await waitFor(() => {
      expect(screen.getByText("Key saved")).toBeTruthy();
    });
    const deleteButton = screen.getByRole("button", {
      name: "Delete",
    }) as HTMLButtonElement;
    expect(deleteButton.disabled).toBe(false);
  });

  it("deletes a key after confirmation", async () => {
    const api = setupApi({
      getApiKey: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { hasKey: true } }),
    });
    render(<ApiKeySettings />);

    await waitFor(() => {
      expect(screen.getByText("Key saved")).toBeTruthy();
    });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(api.deleteApiKey).toHaveBeenCalled();
    });
    expect(useSettingsStore.getState().hasKey).toBe(false);
  });

  it("reports a failed connection", async () => {
    setupApi({
      getApiKey: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { hasKey: true } }),
      testConnection: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { success: false } }),
    });
    render(<ApiKeySettings />);

    await waitFor(() => {
      const testButton = screen.getByRole("button", {
        name: "Test Connection",
      }) as HTMLButtonElement;
      expect(testButton.disabled).toBe(false);
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Test Connection" }),
    );

    await waitFor(() => {
      expect(screen.getByText(/check your key or network/)).toBeTruthy();
    });
  });
});
