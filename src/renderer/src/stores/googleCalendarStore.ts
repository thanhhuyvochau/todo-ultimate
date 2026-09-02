import { create } from "zustand";
import type {
  GoogleCalendarSettings,
  UpdateGoogleCalendarSettingsInput,
} from "@/shared/models";

interface GoogleCalendarStore {
  settings: GoogleCalendarSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  load: () => Promise<void>;
  update: (input: UpdateGoogleCalendarSettingsInput) => Promise<boolean>;
  connect: () => Promise<boolean>;
  sync: () => Promise<boolean>;
  clearError: () => void;
}

export const useGoogleCalendarStore = create<GoogleCalendarStore>((set) => ({
  settings: null,
  isLoading: false,
  isSaving: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    const result = await window.api.getGoogleCalendarSettings();
    if (result.ok) {
      set({ settings: result.data, isLoading: false });
      return;
    }
    set({ error: result.error.message, isLoading: false });
  },

  update: async (input) => {
    set({ isSaving: true, error: null });
    const result = await window.api.updateGoogleCalendarSettings(input);
    if (result.ok) {
      set({ settings: result.data, isSaving: false });
      return true;
    }
    set({ error: result.error.message, isSaving: false });
    return false;
  },

  connect: async () => {
    set({ isSaving: true, error: null });
    const result = await window.api.connectGoogleCalendar();
    if (result.ok) {
      set({ isSaving: false });
      return true;
    }
    set({ error: result.error.message, isSaving: false });
    return false;
  },

  sync: async () => {
    set({ isSaving: true, error: null });
    const result = await window.api.syncGoogleCalendar();
    if (result.ok) {
      set({ settings: result.data, isSaving: false });
      return true;
    }
    set({ error: result.error.message, isSaving: false });
    return false;
  },

  clearError: () => set({ error: null }),
}));
