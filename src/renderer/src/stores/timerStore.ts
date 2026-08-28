import { create } from "zustand";

interface TimerStore {
  activeTaskId: string | null;
  elapsedSeconds: number;
  isInitializing: boolean;
  error: string | null;
  initTimer: () => Promise<void>;
  startTimer: (taskId: string) => Promise<boolean>;
  pauseTimer: (taskId?: string) => Promise<boolean>;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  activeTaskId: null,
  elapsedSeconds: 0,
  isInitializing: false,
  error: null,

  initTimer: async () => {
    set({ isInitializing: true, error: null });

    window.api.onTimerTick(({ taskId, elapsedSeconds }) => {
      if (elapsedSeconds === 0 && get().activeTaskId === taskId) {
        set({ activeTaskId: null, elapsedSeconds: 0 });
      } else if (elapsedSeconds > 0) {
        set({ activeTaskId: taskId, elapsedSeconds });
      }
    });

    const result = await window.api.getActiveTimer();
    if (result.ok && result.data) {
      set({
        activeTaskId: result.data.taskId,
        elapsedSeconds: result.data.elapsedSeconds,
        isInitializing: false,
      });
    } else {
      set({ activeTaskId: null, elapsedSeconds: 0, isInitializing: false });
    }
  },

  startTimer: async (taskId: string) => {
    set({ error: null });
    const result = await window.api.startTimer({ taskId });
    if (result.ok) {
      set({ activeTaskId: taskId, elapsedSeconds: 0 });
      return true;
    }
    set({ error: result.error.message });
    return false;
  },

  pauseTimer: async (taskId?: string) => {
    const target = taskId ?? get().activeTaskId;
    if (!target) return true;
    set({ error: null });
    const result = await window.api.pauseTimer({ taskId: target });
    if (result.ok) {
      if (get().activeTaskId === target) {
        set({ activeTaskId: null, elapsedSeconds: 0 });
      }
      return true;
    }
    set({ error: result.error.message });
    return false;
  },
}));
