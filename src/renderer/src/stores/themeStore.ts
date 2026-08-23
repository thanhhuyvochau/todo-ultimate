import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "app.theme";

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // storage unavailable — fall through to default
  }
  return "dark";
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("light", theme === "light");
}

function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage unavailable — ignore
  }
}

export function initTheme(): Theme {
  const theme = readStoredTheme();
  applyTheme(theme);
  return theme;
}

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: readStoredTheme(),

  toggleTheme: () => {
    const next: Theme =
      useThemeStore.getState().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    persistTheme(next);
    set({ theme: next });
  },

  setTheme: (theme) => {
    applyTheme(theme);
    persistTheme(theme);
    set({ theme });
  },
}));
