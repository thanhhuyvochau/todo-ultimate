import { create } from "zustand";
import { useToastStore } from "./toastStore";

export type PomodoroMode = "focus" | "shortBreak" | "longBreak";

export const POMODORO_DURATIONS: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const STORAGE_KEY = "app.pomodoro";

interface PersistedPomodoroState {
  mode: PomodoroMode;
  secondsRemaining: number;
  isRunning: boolean;
  endsAt: number | null;
  completedFocusSessions: number;
  sessionDate: string;
}

interface PomodoroStore extends PersistedPomodoroState {
  initPomodoro: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  selectMode: (mode: PomodoroMode) => void;
  tick: (now?: number) => void;
}

function getLocalDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultState(): PersistedPomodoroState {
  return {
    mode: "focus",
    secondsRemaining: POMODORO_DURATIONS.focus,
    isRunning: false,
    endsAt: null,
    completedFocusSessions: 0,
    sessionDate: getLocalDateKey(),
  };
}

function isPomodoroMode(value: unknown): value is PomodoroMode {
  return value === "focus" || value === "shortBreak" || value === "longBreak";
}

function readStoredState(): PersistedPomodoroState {
  const fallback = getDefaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedPomodoroState>;
    if (!isPomodoroMode(parsed.mode)) return fallback;

    const sessionDate = getLocalDateKey();
    return {
      mode: parsed.mode,
      secondsRemaining:
        typeof parsed.secondsRemaining === "number" && parsed.secondsRemaining >= 0
          ? Math.min(parsed.secondsRemaining, POMODORO_DURATIONS[parsed.mode])
          : POMODORO_DURATIONS[parsed.mode],
      isRunning: parsed.isRunning === true && typeof parsed.endsAt === "number",
      endsAt: typeof parsed.endsAt === "number" ? parsed.endsAt : null,
      completedFocusSessions:
        parsed.sessionDate === sessionDate &&
        typeof parsed.completedFocusSessions === "number"
          ? Math.max(0, Math.floor(parsed.completedFocusSessions))
          : 0,
      sessionDate,
    };
  } catch {
    return fallback;
  }
}

function persistedSlice(state: PomodoroStore): PersistedPomodoroState {
  const {
    mode,
    secondsRemaining,
    isRunning,
    endsAt,
    completedFocusSessions,
    sessionDate,
  } = state;
  return { mode, secondsRemaining, isRunning, endsAt, completedFocusSessions, sessionDate };
}

function persistState(state: PersistedPomodoroState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The timer remains available in memory if browser storage is unavailable.
  }
}

function nextMode(mode: PomodoroMode, completedSessions: number): PomodoroMode {
  if (mode !== "focus") return "focus";
  return completedSessions % 4 === 0 ? "longBreak" : "shortBreak";
}

const initialState = readStoredState();

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  ...initialState,

  initPomodoro: () => {
    set(readStoredState());
    get().tick();
  },

  start: () => {
    const state = get();
    if (state.isRunning || state.secondsRemaining <= 0) return;
    set({ isRunning: true, endsAt: Date.now() + state.secondsRemaining * 1000 });
    persistState(persistedSlice(get()));
  },

  pause: () => {
    const state = get();
    if (!state.isRunning || state.endsAt === null) return;
    set({
      isRunning: false,
      endsAt: null,
      secondsRemaining: Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000)),
    });
    persistState(persistedSlice(get()));
  },

  reset: () => {
    const { mode } = get();
    set({ isRunning: false, endsAt: null, secondsRemaining: POMODORO_DURATIONS[mode] });
    persistState(persistedSlice(get()));
  },

  skip: () => {
    const state = get();
    const mode = nextMode(state.mode, state.completedFocusSessions);
    set({ mode, secondsRemaining: POMODORO_DURATIONS[mode], isRunning: false, endsAt: null });
    persistState(persistedSlice(get()));
  },

  selectMode: (mode) => {
    set({ mode, secondsRemaining: POMODORO_DURATIONS[mode], isRunning: false, endsAt: null });
    persistState(persistedSlice(get()));
  },

  tick: (now = Date.now()) => {
    const state = get();
    const today = getLocalDateKey(new Date(now));
    if (today !== state.sessionDate) set({ completedFocusSessions: 0, sessionDate: today });

    const current = get();
    if (!current.isRunning || current.endsAt === null) {
      persistState(persistedSlice(current));
      return;
    }

    const secondsRemaining = Math.max(0, Math.ceil((current.endsAt - now) / 1000));
    if (secondsRemaining > 0) {
      if (secondsRemaining !== current.secondsRemaining) {
        set({ secondsRemaining });
        persistState(persistedSlice(get()));
      }
      return;
    }

    const completedFocusSessions = current.completedFocusSessions + (current.mode === "focus" ? 1 : 0);
    const mode = nextMode(current.mode, completedFocusSessions);
    set({
      mode,
      secondsRemaining: POMODORO_DURATIONS[mode],
      isRunning: false,
      endsAt: null,
      completedFocusSessions,
    });
    persistState(persistedSlice(get()));
    const message = current.mode === "focus"
      ? mode === "longBreak"
        ? "Focus complete — take a long break."
        : "Focus complete — take a short break."
      : "Break complete — ready for another focus session?";
    useToastStore.getState().addToast("success", message);
  },
}));
