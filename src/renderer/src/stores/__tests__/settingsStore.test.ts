import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSettingsStore } from "../settingsStore";
import type { AiSettings } from "@/shared/models";

type ApiMock = Record<string, ReturnType<typeof vi.fn>>;

const mockSettings: AiSettings = {
  activeProvider: "deepseek",
  providers: {
    deepseek: {
      providerId: "deepseek",
      selectedModel: "deepseek-chat",
      hasKey: false,
    },
    openai: {
      providerId: "openai",
      selectedModel: "gpt-4o",
      hasKey: false,
    },
    anthropic: {
      providerId: "anthropic",
      selectedModel: "claude-3-7-sonnet-latest",
      hasKey: false,
    },
    gemini: {
      providerId: "gemini",
      selectedModel: "gemini-2.0-flash",
      hasKey: false,
    },
    custom: {
      providerId: "custom",
      selectedModel: "llama3.2",
      baseUrl: "http://localhost:11434/v1",
      hasKey: false,
    },
  },
};

function setupApi(overrides: ApiMock = {}): ApiMock {
  const apiMock: ApiMock = {
    getAiSettings: vi.fn().mockResolvedValue({ ok: true, data: mockSettings }),
    updateAiSettings: vi.fn().mockImplementation((input) =>
      Promise.resolve({
        ok: true,
        data: {
          ...mockSettings,
          activeProvider: input.activeProvider || mockSettings.activeProvider,
        },
      }),
    ),
    setAiKey: vi.fn().mockResolvedValue({ ok: true, data: { success: true } }),
    deleteAiKey: vi
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
    aiSettings: null,
    activeProvider: "deepseek",
    selectedProviderTab: "deepseek",
    hasKey: false,
    isLoading: false,
    isTesting: false,
    error: null,
    testResults: {
      deepseek: "idle",
      openai: "idle",
      anthropic: "idle",
      gemini: "idle",
      custom: "idle",
    },
    testResult: "idle",
  });
});

describe("settingsStore", () => {
  it("loadSettings sets aiSettings and hasKey", async () => {
    const customSettings: AiSettings = {
      ...mockSettings,
      providers: {
        ...mockSettings.providers,
        deepseek: { ...mockSettings.providers.deepseek, hasKey: true },
      },
    };
    const api = setupApi({
      getAiSettings: vi
        .fn()
        .mockResolvedValue({ ok: true, data: customSettings }),
    });

    await useSettingsStore.getState().loadSettings();

    expect(api.getAiSettings).toHaveBeenCalled();
    expect(useSettingsStore.getState().hasKey).toBe(true);
    expect(useSettingsStore.getState().aiSettings).toEqual(customSettings);
  });

  it("setActiveProvider updates the active provider in backend and store", async () => {
    const api = setupApi();

    const ok = await useSettingsStore.getState().setActiveProvider("openai");

    expect(ok).toBe(true);
    expect(api.updateAiSettings).toHaveBeenCalledWith({
      activeProvider: "openai",
    });
    expect(useSettingsStore.getState().activeProvider).toBe("openai");
  });

  it("saveKey calls setAiKey with target provider and reloads", async () => {
    const api = setupApi();

    const ok = await useSettingsStore
      .getState()
      .saveKey("openai", "sk-openai-key");

    expect(ok).toBe(true);
    expect(api.setAiKey).toHaveBeenCalledWith({
      providerId: "openai",
      apiKey: "sk-openai-key",
    });
  });

  it("deleteKey calls deleteAiKey for selected tab", async () => {
    useSettingsStore.setState({ selectedProviderTab: "anthropic" });
    const api = setupApi();

    const ok = await useSettingsStore.getState().deleteKey();

    expect(ok).toBe(true);
    expect(api.deleteAiKey).toHaveBeenCalledWith({
      providerId: "anthropic",
    });
  });

  it("testConnection sets testResults success on true", async () => {
    useSettingsStore.setState({ selectedProviderTab: "gemini" });
    setupApi({
      testConnection: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { success: true } }),
    });

    const ok = await useSettingsStore.getState().testConnection();

    expect(ok).toBe(true);
    expect(useSettingsStore.getState().testResults.gemini).toBe("success");
    expect(useSettingsStore.getState().testResult).toBe("success");
  });

  it("testConnection sets testResults failed on false", async () => {
    useSettingsStore.setState({ selectedProviderTab: "custom" });
    setupApi({
      testConnection: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { success: false } }),
    });

    const ok = await useSettingsStore.getState().testConnection();

    expect(ok).toBe(false);
    expect(useSettingsStore.getState().testResults.custom).toBe("failed");
    expect(useSettingsStore.getState().testResult).toBe("failed");
  });
});
