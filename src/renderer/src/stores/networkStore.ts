import { create } from "zustand";

const DEBOUNCE_MS = 1000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

interface NetworkStore {
  isOnline: boolean;
  initNetwork: () => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  isOnline: navigator.onLine,

  initNetwork: () => {
    if (initialized) return;
    initialized = true;

    const apply = (online: boolean) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => set({ isOnline: online }), DEBOUNCE_MS);
    };

    window.addEventListener("online", () => apply(true));
    window.addEventListener("offline", () => apply(false));
  },
}));
