import { create } from "zustand";
import type {
  RecurringRule,
  RecurringFrequency,
  TaskPriority,
} from "@shared/models";

interface RecurringRuleStore {
  rules: RecurringRule[];
  isLoading: boolean;
  error: string | null;
  fetchRules: () => Promise<void>;
  createRule: (data: {
    title: string;
    priority: TaskPriority;
    estimatedMinutes: number;
    frequency: RecurringFrequency;
    description?: string | null;
    timeAnchor?: number | null;
    daysOfWeek?: number[] | null;
    dayOfMonth?: number | null;
  }) => Promise<boolean>;
  updateRule: (
    id: string,
    patch: Partial<
      Pick<
        RecurringRule,
        | "title"
        | "priority"
        | "estimatedMinutes"
        | "frequency"
        | "description"
        | "timeAnchor"
        | "daysOfWeek"
        | "dayOfMonth"
      >
    >,
  ) => Promise<boolean>;
  deleteRule: (id: string) => Promise<boolean>;
  toggleRule: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useRecurringRuleStore = create<RecurringRuleStore>((set) => ({
  rules: [],
  isLoading: false,
  error: null,

  fetchRules: async () => {
    set({ isLoading: true, error: null });
    const result = await window.api.getRecurringRules();
    if (result.ok) {
      set({ rules: result.data, isLoading: false });
    } else {
      set({ error: result.error.message, isLoading: false });
    }
  },

  createRule: async (data) => {
    set({ isLoading: true, error: null });
    const result = await window.api.createRecurringRule({
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      estimatedMinutes: data.estimatedMinutes,
      frequency: data.frequency,
      timeAnchor: data.timeAnchor ?? null,
      daysOfWeek: data.daysOfWeek ?? null,
      dayOfMonth: data.dayOfMonth ?? null,
    });
    if (result.ok) {
      set((state) => ({
        rules: [result.data, ...state.rules],
        isLoading: false,
      }));
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  updateRule: async (id, patch) => {
    set({ isLoading: true, error: null });
    const result = await window.api.updateRecurringRule({ id, ...patch });
    if (result.ok) {
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? result.data : r)),
        isLoading: false,
      }));
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  deleteRule: async (id) => {
    set({ isLoading: true, error: null });
    const result = await window.api.deleteRecurringRule({ id });
    if (result.ok) {
      set((state) => ({
        rules: state.rules.filter((r) => r.id !== id),
        isLoading: false,
      }));
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  toggleRule: async (id) => {
    set({ isLoading: true, error: null });
    const result = await window.api.toggleRecurringRule({ id });
    if (result.ok) {
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? result.data : r)),
        isLoading: false,
      }));
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  clearError: () => set({ error: null }),
}));
