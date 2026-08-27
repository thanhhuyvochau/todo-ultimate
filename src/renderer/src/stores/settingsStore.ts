import { create } from "zustand";
import type { AiProviderId, AiSettings } from "@/shared/models";
import { DEFAULT_PROVIDER_PRESETS } from "@/shared/models";

export type ApiKeyTestResult = "idle" | "success" | "failed";

interface SettingsStore {
  aiSettings: AiSettings | null;
  activeProvider: AiProviderId;
  selectedProviderTab: AiProviderId;
  hasKey: boolean;
  isLoading: boolean;
  isTesting: boolean;
  error: string | null;
  testResults: Record<AiProviderId, ApiKeyTestResult>;
  testResult: ApiKeyTestResult; // for backward compatibility

  loadSettings: () => Promise<void>;
  loadStatus: () => Promise<void>;
  setSelectedProviderTab: (providerId: AiProviderId) => void;
  setActiveProvider: (providerId: AiProviderId) => Promise<boolean>;
  updateProviderModel: (
    providerId: AiProviderId,
    model: string,
  ) => Promise<boolean>;
  updateProviderBaseUrl: (
    providerId: AiProviderId,
    baseUrl: string,
  ) => Promise<boolean>;
  saveKey: (providerIdOrKey: string, maybeKey?: string) => Promise<boolean>;
  deleteKey: (providerId?: AiProviderId) => Promise<boolean>;
  testConnection: (providerId?: AiProviderId) => Promise<boolean>;
  clearError: () => void;
}

const initialTestResults: Record<AiProviderId, ApiKeyTestResult> = {
  deepseek: "idle",
  openai: "idle",
  anthropic: "idle",
  gemini: "idle",
  custom: "idle",
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  aiSettings: null,
  activeProvider: "deepseek",
  selectedProviderTab: "deepseek",
  hasKey: false,
  isLoading: false,
  isTesting: false,
  error: null,
  testResults: { ...initialTestResults },
  testResult: "idle",

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    const result = await window.api.getAiSettings();
    if (result.ok) {
      const settings = result.data;
      const activeHasKey =
        settings.providers[settings.activeProvider]?.hasKey ?? false;
      set({
        aiSettings: settings,
        activeProvider: settings.activeProvider,
        hasKey: activeHasKey,
        isLoading: false,
      });
    } else {
      set({ error: result.error.message, isLoading: false });
    }
  },

  loadStatus: async () => {
    await get().loadSettings();
  },

  setSelectedProviderTab: (providerId: AiProviderId) => {
    set({ selectedProviderTab: providerId, error: null });
  },

  setActiveProvider: async (providerId: AiProviderId) => {
    set({ isLoading: true, error: null });
    const result = await window.api.updateAiSettings({
      activeProvider: providerId,
    });
    if (result.ok) {
      const settings = result.data;
      const activeHasKey =
        settings.providers[settings.activeProvider]?.hasKey ?? false;
      set({
        aiSettings: settings,
        activeProvider: settings.activeProvider,
        hasKey: activeHasKey,
        isLoading: false,
      });
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  updateProviderModel: async (providerId: AiProviderId, model: string) => {
    set({ isLoading: true, error: null });
    const result = await window.api.updateAiSettings({
      providerConfig: {
        providerId,
        selectedModel: model,
      },
    });
    if (result.ok) {
      set({ aiSettings: result.data, isLoading: false });
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  updateProviderBaseUrl: async (providerId: AiProviderId, baseUrl: string) => {
    set({ isLoading: true, error: null });
    const result = await window.api.updateAiSettings({
      providerConfig: {
        providerId,
        baseUrl,
      },
    });
    if (result.ok) {
      set({ aiSettings: result.data, isLoading: false });
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  saveKey: async (providerIdOrKey: string, maybeKey?: string) => {
    set({ isLoading: true, error: null });
    const currentTab = get().selectedProviderTab;
    const providerId: AiProviderId =
      maybeKey !== undefined
        ? (providerIdOrKey as AiProviderId)
        : currentTab in DEFAULT_PROVIDER_PRESETS
          ? currentTab
          : "deepseek";
    const apiKey = maybeKey !== undefined ? maybeKey : providerIdOrKey;

    const result = await window.api.setAiKey({ providerId, apiKey });
    if (result.ok) {
      await get().loadSettings();
      set((state) => ({
        testResults: { ...state.testResults, [providerId]: "idle" },
        testResult: "idle",
        isLoading: false,
      }));
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  deleteKey: async (targetProviderId?: AiProviderId) => {
    set({ isLoading: true, error: null });
    const providerId = targetProviderId ?? get().selectedProviderTab;
    const result = await window.api.deleteAiKey({ providerId });
    if (result.ok) {
      await get().loadSettings();
      set((state) => ({
        testResults: { ...state.testResults, [providerId]: "idle" },
        testResult: "idle",
        isLoading: false,
      }));
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  testConnection: async (targetProviderId?: AiProviderId) => {
    const providerId = targetProviderId ?? get().selectedProviderTab;
    set({ isTesting: true, error: null });
    const result = await window.api.testConnection({ providerId });
    set({ isTesting: false });

    if (result.ok && result.data.success) {
      set((state) => ({
        testResults: { ...state.testResults, [providerId]: "success" },
        testResult: "success",
      }));
      return true;
    }

    set((state) => ({
      testResults: { ...state.testResults, [providerId]: "failed" },
      testResult: "failed",
    }));
    return false;
  },

  clearError: () => set({ error: null }),
}));
