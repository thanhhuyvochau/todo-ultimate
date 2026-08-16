import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSettingsStore } from "../settingsStore";

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

describe("settingsStore", () => {
  it("loadStatus sets hasKey true when a key exists", async () => {
    const api = setupApi({
      getApiKey: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { hasKey: true } }),
    });

    await useSettingsStore.getState().loadStatus();

    expect(api.getApiKey).toHaveBeenCalled();
    expect(useSettingsStore.getState().hasKey).toBe(true);
  });

  it("loadStatus surfaces an error when getApiKey fails", async () => {
    setupApi({
      getApiKey: vi
        .fn()
        .mockResolvedValue({
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "boom" },
        }),
    });

    await useSettingsStore.getState().loadStatus();

    expect(useSettingsStore.getState().error).toBe("boom");
  });

  it("saveKey calls setApiKey and sets hasKey", async () => {
    const api = setupApi();

    const ok = await useSettingsStore.getState().saveKey("sk-test");

    expect(ok).toBe(true);
    expect(api.setApiKey).toHaveBeenCalledWith({ apiKey: "sk-test" });
    expect(useSettingsStore.getState().hasKey).toBe(true);
  });

  it("saveKey surfaces an error when setApiKey fails", async () => {
    setupApi({
      setApiKey: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "KEYCHAIN_UNAVAILABLE", message: "keychain down" },
      }),
    });

    const ok = await useSettingsStore.getState().saveKey("sk-test");

    expect(ok).toBe(false);
    expect(useSettingsStore.getState().error).toBe("keychain down");
    expect(useSettingsStore.getState().hasKey).toBe(false);
  });

  it("deleteKey clears hasKey", async () => {
    useSettingsStore.setState({ hasKey: true });
    const api = setupApi();

    const ok = await useSettingsStore.getState().deleteKey();

    expect(ok).toBe(true);
    expect(api.deleteApiKey).toHaveBeenCalled();
    expect(useSettingsStore.getState().hasKey).toBe(false);
  });

  it("testConnection sets testResult success on true", async () => {
    setupApi({
      testConnection: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { success: true } }),
    });

    const ok = await useSettingsStore.getState().testConnection();

    expect(ok).toBe(true);
    expect(useSettingsStore.getState().testResult).toBe("success");
  });

  it("testConnection sets testResult failed on false", async () => {
    setupApi({
      testConnection: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { success: false } }),
    });

    const ok = await useSettingsStore.getState().testConnection();

    expect(ok).toBe(false);
    expect(useSettingsStore.getState().testResult).toBe("failed");
  });
});
