import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeySettings } from "../ApiKeySettings";
import { useSettingsStore } from "../../stores/settingsStore";
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
    getApiKey: vi.fn().mockResolvedValue({ ok: true, data: { hasKey: false } }),
    setApiKey: vi.fn().mockResolvedValue({ ok: true, data: { success: true } }),
    deleteApiKey: vi
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
    aiSettings: mockSettings,
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

describe("ApiKeySettings (AiProviderSettings)", () => {
  it("saves a key and clears the input", async () => {
    const api = setupApi();
    render(<ApiKeySettings />);

    const input = screen.getByPlaceholderText("sk-...");
    await userEvent.type(input, "sk-my-key");

    await userEvent.click(screen.getByRole("button", { name: /Save Key/i }));

    await waitFor(() => {
      expect(api.setAiKey).toHaveBeenCalledWith({
        providerId: "deepseek",
        apiKey: "sk-my-key",
      });
    });
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("shows 'No key set' status initially", async () => {
    setupApi();
    render(<ApiKeySettings />);

    await waitFor(() => {
      expect(screen.getByText("No key set")).toBeTruthy();
    });
  });

  it("shows 'Key saved' status and enables delete when a key exists", async () => {
    const keySavedSettings: AiSettings = {
      ...mockSettings,
      providers: {
        ...mockSettings.providers,
        deepseek: { ...mockSettings.providers.deepseek, hasKey: true },
      },
    };
    setupApi({
      getAiSettings: vi
        .fn()
        .mockResolvedValue({ ok: true, data: keySavedSettings }),
    });
    render(<ApiKeySettings />);

    await waitFor(() => {
      expect(screen.getByText("Key saved")).toBeTruthy();
    });
    const deleteButton = screen.getByRole("button", {
      name: /Delete Key/i,
    }) as HTMLButtonElement;
    expect(deleteButton.disabled).toBe(false);
  });

  it("deletes a key after confirmation", async () => {
    const keySavedSettings: AiSettings = {
      ...mockSettings,
      providers: {
        ...mockSettings.providers,
        deepseek: { ...mockSettings.providers.deepseek, hasKey: true },
      },
    };
    const api = setupApi({
      getAiSettings: vi
        .fn()
        .mockResolvedValue({ ok: true, data: keySavedSettings }),
    });
    render(<ApiKeySettings />);

    await waitFor(() => {
      expect(screen.getByText("Key saved")).toBeTruthy();
    });

    await userEvent.click(screen.getByRole("button", { name: /Delete Key/i }));
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(api.deleteAiKey).toHaveBeenCalledWith({ providerId: "deepseek" });
    });
  });

  it("switches tabs and activates a provider", async () => {
    const api = setupApi();
    render(<ApiKeySettings />);

    // Click OpenAI tab
    const openAiTab = screen.getByRole("button", { name: /OpenAI/i });
    await userEvent.click(openAiTab);

    expect(screen.getByText("OpenAI Settings")).toBeTruthy();

    // Click Set as Active
    const setActiveBtn = screen.getByRole("button", { name: /Set as Active/i });
    await userEvent.click(setActiveBtn);

    await waitFor(() => {
      expect(api.updateAiSettings).toHaveBeenCalledWith({
        activeProvider: "openai",
      });
    });
  });
});
