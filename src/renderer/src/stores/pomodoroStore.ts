import { create } from "zustand";
import { useToastStore } from "./toastStore";

export type PomodoroMode = "focus" | "shortBreak" | "longBreak";

export interface PomodoroDurations {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

export type PomodoroDurationField = keyof PomodoroDurations;
export type PomodoroDurationErrors = Partial<
  Record<PomodoroDurationField, string>
>;

export const DEFAULT_POMODORO_DURATIONS: PomodoroDurations = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

export const POMODORO_DURATIONS: Record<PomodoroMode, number> = {
  focus: DEFAULT_POMODORO_DURATIONS.focusMinutes * 60,
  shortBreak: DEFAULT_POMODORO_DURATIONS.shortBreakMinutes * 60,
  longBreak: DEFAULT_POMODORO_DURATIONS.longBreakMinutes * 60,
};

const STORAGE_KEY = "app.pomodoro";

interface PersistedPomodoroState {
  mode: PomodoroMode;
  secondsRemaining: number;
  intervalTotalSeconds: number;
  hasStartedCurrentInterval: boolean;
  isRunning: boolean;
  endsAt: number | null;
  completedFocusSessions: number;
  sessionDate: string;
  durations: PomodoroDurations;
}

interface PomodoroStore extends PersistedPomodoroState {
  initPomodoro: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  selectMode: (mode: PomodoroMode) => void;
  saveDurations: (durations: PomodoroDurations) => boolean;
  tick: (now?: number) => void;
}

export function getPomodoroDurationSeconds(
  mode: PomodoroMode,
  durations: PomodoroDurations,
): number {
  switch (mode) {
    case "focus":
      return durations.focusMinutes * 60;
    case "shortBreak":
      return durations.shortBreakMinutes * 60;
    case "longBreak":
      return durations.longBreakMinutes * 60;
  }
}

export function validatePomodoroDurations(
  durations: PomodoroDurations,
): PomodoroDurationErrors {
  const errors: PomodoroDurationErrors = {};
  const fields: [PomodoroDurationField, number, number][] = [
    ["focusMinutes", 1, 180],
    ["shortBreakMinutes", 1, 60],
    ["longBreakMinutes", 1, 60],
  ];

  for (const [field, minimum, maximum] of fields) {
    const value = durations[field];
    if (!Number.isInteger(value)) {
      errors[field] = "Enter a whole number of minutes.";
    } else if (value < minimum || value > maximum) {
      errors[field] = `Enter a value from ${minimum} to ${maximum} minutes.`;
    }
  }

  return errors;
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
    intervalTotalSeconds: POMODORO_DURATIONS.focus,
    hasStartedCurrentInterval: false,
    isRunning: false,
    endsAt: null,
    completedFocusSessions: 0,
    sessionDate: getLocalDateKey(),
    durations: { ...DEFAULT_POMODORO_DURATIONS },
  };
}

function isPomodoroMode(value: unknown): value is PomodoroMode {
  return value === "focus" || value === "shortBreak" || value === "longBreak";
}

function parseStoredDurations(value: unknown): PomodoroDurations {
  const candidate = value as Partial<PomodoroDurations> | null;
  const defaults = DEFAULT_POMODORO_DURATIONS;
  const durations: PomodoroDurations = {
    focusMinutes: candidate?.focusMinutes ?? defaults.focusMinutes,
    shortBreakMinutes:
      candidate?.shortBreakMinutes ?? defaults.shortBreakMinutes,
    longBreakMinutes: candidate?.longBreakMinutes ?? defaults.longBreakMinutes,
  };
  const errors = validatePomodoroDurations(durations);

  return {
    focusMinutes: errors.focusMinutes
      ? defaults.focusMinutes
      : durations.focusMinutes,
    shortBreakMinutes: errors.shortBreakMinutes
      ? defaults.shortBreakMinutes
      : durations.shortBreakMinutes,
    longBreakMinutes: errors.longBreakMinutes
      ? defaults.longBreakMinutes
      : durations.longBreakMinutes,
  };
}

function readStoredState(): PersistedPomodoroState {
  const fallback = getDefaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedPomodoroState>;
    if (!isPomodoroMode(parsed.mode)) return fallback;

    const durations = parseStoredDurations(parsed.durations);
    const defaultIntervalTotal = getPomodoroDurationSeconds(
      parsed.mode,
      durations,
    );
    const intervalTotalSeconds =
      typeof parsed.intervalTotalSeconds === "number" &&
      Number.isFinite(parsed.intervalTotalSeconds) &&
      parsed.intervalTotalSeconds > 0
        ? Math.floor(parsed.intervalTotalSeconds)
        : defaultIntervalTotal;
    const secondsRemaining =
      typeof parsed.secondsRemaining === "number" &&
      Number.isFinite(parsed.secondsRemaining) &&
      parsed.secondsRemaining >= 0
        ? Math.min(Math.floor(parsed.secondsRemaining), intervalTotalSeconds)
        : intervalTotalSeconds;
    const isRunning =
      parsed.isRunning === true && typeof parsed.endsAt === "number";
    const sessionDate = getLocalDateKey();

    return {
      mode: parsed.mode,
      secondsRemaining,
      intervalTotalSeconds,
      hasStartedCurrentInterval:
        typeof parsed.hasStartedCurrentInterval === "boolean"
          ? parsed.hasStartedCurrentInterval
          : isRunning || secondsRemaining < intervalTotalSeconds,
      isRunning,
      endsAt: typeof parsed.endsAt === "number" ? parsed.endsAt : null,
      completedFocusSessions:
        parsed.sessionDate === sessionDate &&
        typeof parsed.completedFocusSessions === "number" &&
        Number.isFinite(parsed.completedFocusSessions)
          ? Math.max(0, Math.floor(parsed.completedFocusSessions))
          : 0,
      sessionDate,
      durations,
    };
  } catch {
    return fallback;
  }
}

function persistedSlice(state: PomodoroStore): PersistedPomodoroState {
  const {
    mode,
    secondsRemaining,
    intervalTotalSeconds,
    hasStartedCurrentInterval,
    isRunning,
    endsAt,
    completedFocusSessions,
    sessionDate,
    durations,
  } = state;
  return {
    mode,
    secondsRemaining,
    intervalTotalSeconds,
    hasStartedCurrentInterval,
    isRunning,
    endsAt,
    completedFocusSessions,
    sessionDate,
    durations,
  };
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

function getFreshInterval(mode: PomodoroMode, durations: PomodoroDurations) {
  const intervalTotalSeconds = getPomodoroDurationSeconds(mode, durations);
  return {
    intervalTotalSeconds,
    secondsRemaining: intervalTotalSeconds,
    hasStartedCurrentInterval: false,
  };
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
    set({
      isRunning: true,
      endsAt: Date.now() + state.secondsRemaining * 1000,
      hasStartedCurrentInterval: true,
    });
    persistState(persistedSlice(get()));
  },

  pause: () => {
    const state = get();
    if (!state.isRunning || state.endsAt === null) return;
    set({
      isRunning: false,
      endsAt: null,
      secondsRemaining: Math.max(
        0,
        Math.ceil((state.endsAt - Date.now()) / 1000),
      ),
    });
    persistState(persistedSlice(get()));
  },

  reset: () => {
    const { mode, durations } = get();
    set({
      isRunning: false,
      endsAt: null,
      ...getFreshInterval(mode, durations),
    });
    persistState(persistedSlice(get()));
  },

  skip: () => {
    const state = get();
    const mode = nextMode(state.mode, state.completedFocusSessions);
    set({
      mode,
      isRunning: false,
      endsAt: null,
      ...getFreshInterval(mode, state.durations),
    });
    persistState(persistedSlice(get()));
  },

  selectMode: (mode) => {
    const { durations } = get();
    set({
      mode,
      isRunning: false,
      endsAt: null,
      ...getFreshInterval(mode, durations),
    });
    persistState(persistedSlice(get()));
  },

  saveDurations: (durations) => {
    if (Object.keys(validatePomodoroDurations(durations)).length > 0) {
      return false;
    }

    const state = get();
    const shouldRefreshCurrentInterval =
      !state.isRunning && !state.hasStartedCurrentInterval;
    set({
      durations,
      ...(shouldRefreshCurrentInterval
        ? getFreshInterval(state.mode, durations)
        : {}),
    });
    persistState(persistedSlice(get()));
    return true;
  },

  tick: (now = Date.now()) => {
    const state = get();
    const today = getLocalDateKey(new Date(now));
    if (today !== state.sessionDate) {
      set({ completedFocusSessions: 0, sessionDate: today });
      persistState(persistedSlice(get()));
    }

    const current = get();
    if (!current.isRunning || current.endsAt === null) return;

    const secondsRemaining = Math.max(
      0,
      Math.ceil((current.endsAt - now) / 1000),
    );
    if (secondsRemaining > 0) {
      if (secondsRemaining !== current.secondsRemaining) {
        set({ secondsRemaining });
        persistState(persistedSlice(get()));
      }
      return;
    }

    const completedFocusSessions =
      current.completedFocusSessions + (current.mode === "focus" ? 1 : 0);
    const mode = nextMode(current.mode, completedFocusSessions);
    set({
      mode,
      isRunning: false,
      endsAt: null,
      completedFocusSessions,
      ...getFreshInterval(mode, current.durations),
    });
    persistState(persistedSlice(get()));
    const message =
      current.mode === "focus"
        ? mode === "longBreak"
          ? "Focus complete — take a long break."
          : "Focus complete — take a short break."
        : "Break complete — ready for another focus session?";
    useToastStore.getState().addToast("success", message);
  },
}));
