import { create } from "zustand";

export type ApiKeyTestResult = "idle" | "success" | "failed";

interface SettingsStore {
  hasKey: boolean;
  isLoading: boolean;
  isTesting: boolean;
  error: string | null;
  testResult: ApiKeyTestResult;
  loadStatus: () => Promise<void>;
  saveKey: (apiKey: string) => Promise<boolean>;
  deleteKey: () => Promise<boolean>;
  testConnection: () => Promise<boolean>;
  clearError: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  hasKey: false,
  isLoading: false,
  isTesting: false,
  error: null,
  testResult: "idle",

  loadStatus: async () => {
    set({ isLoading: true, error: null });
    const result = await window.api.getApiKey();
    if (result.ok) {
      set({ hasKey: result.data.hasKey, isLoading: false });
    } else {
      set({ error: result.error.message, isLoading: false });
    }
  },

  saveKey: async (apiKey) => {
    set({ isLoading: true, error: null });
    const result = await window.api.setApiKey({ apiKey });
    if (result.ok) {
      set({ hasKey: true, isLoading: false, testResult: "idle" });
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  deleteKey: async () => {
    set({ isLoading: true, error: null });
    const result = await window.api.deleteApiKey();
    if (result.ok) {
      set({ hasKey: false, isLoading: false, testResult: "idle" });
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  testConnection: async () => {
    set({ isTesting: true, error: null });
    const result = await window.api.testConnection();
    set({ isTesting: false });
    if (result.ok && result.data.success) {
      set({ testResult: "success" });
      return true;
    }
    set({ testResult: "failed" });
    return false;
  },

  clearError: () => set({ error: null }),
}));
