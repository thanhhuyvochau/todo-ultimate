import { create } from "zustand";
import type { Task, TaskPriority, TaskStatus } from "@shared/models";

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: (filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    query?: string;
  }) => Promise<void>;
  createTask: (data: {
    title: string;
    priority: TaskPriority;
    estimatedMinutes: number;
    description?: string;
  }) => Promise<boolean>;
  updateTask: (
    id: string,
    patch: Partial<
      Pick<
        Task,
        "title" | "priority" | "estimatedMinutes" | "description" | "status"
      >
    >,
  ) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async (filters) => {
    set({ isLoading: true, error: null });
    const result = await window.api.getTasks(filters ?? {});
    if (result.ok) {
      set({ tasks: result.data, isLoading: false });
    } else {
      set({ error: result.error.message, isLoading: false });
    }
  },

  createTask: async (data) => {
    set({ isLoading: true, error: null });
    const now = Date.now();
    const taskData = {
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      status: "todo" as TaskStatus,
      estimatedMinutes: data.estimatedMinutes,
      actualMinutes: null,
      isRecurringChild: false,
      recurringRuleId: null,
      scheduledDate: null,
      createdAt: now,
      updatedAt: now,
    };
    const result = await window.api.createTask(taskData);
    if (result.ok) {
      set((state) => ({
        tasks: [result.data, ...state.tasks],
        isLoading: false,
      }));
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  updateTask: async (id, patch) => {
    set({ isLoading: true, error: null });
    const result = await window.api.updateTask({ id, ...patch });
    if (result.ok) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? result.data : t)),
        isLoading: false,
      }));
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    const result = await window.api.deleteTask({ id });
    if (result.ok) {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        isLoading: false,
      }));
      return true;
    }
    set({ error: result.error.message, isLoading: false });
    return false;
  },

  clearError: () => set({ error: null }),
}));
