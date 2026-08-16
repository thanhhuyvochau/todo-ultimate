import { create } from "zustand";
import { arrayMove } from "@dnd-kit/sortable";
import type { DailyPlan, DailyPlanSchedule } from "@/shared/models";

interface PlanStore {
  plan: DailyPlanSchedule | null;
  focusHours: number;
  primaryGoal: string;
  isGenerating: boolean;
  isApproving: boolean;
  error: string | null;
  existingTodayPlan: DailyPlan | null;
  setFocusHours: (hours: number) => void;
  setPrimaryGoal: (goal: string) => void;
  generatePlan: () => Promise<boolean>;
  loadTodayPlan: () => Promise<void>;
  updateBudget: (taskId: string, budgetedMinutes: number) => void;
  removeTask: (taskId: string) => void;
  reorder: (activeId: string, overId: string) => void;
  approvePlan: () => Promise<boolean>;
  discardPlan: () => void;
  clearError: () => void;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  plan: null,
  focusHours: 6,
  primaryGoal: "",
  isGenerating: false,
  isApproving: false,
  error: null,
  existingTodayPlan: null,

  setFocusHours: (hours) => set({ focusHours: hours }),
  setPrimaryGoal: (goal) => set({ primaryGoal: goal }),

  generatePlan: async () => {
    set({ isGenerating: true, error: null });
    const result = await window.api.generatePlan({
      focusHours: get().focusHours,
      primaryGoal: get().primaryGoal,
    });
    if (result.ok) {
      set({ plan: result.data, isGenerating: false });
      return true;
    }
    set({ error: result.error.message, isGenerating: false });
    return false;
  },

  loadTodayPlan: async () => {
    const result = await window.api.getTodayPlan();
    if (result.ok) {
      set({ existingTodayPlan: result.data });
    }
  },

  updateBudget: (taskId, budgetedMinutes) => {
    const plan = get().plan;
    if (!plan) return;
    set({
      plan: {
        ...plan,
        schedule: plan.schedule.map((block) =>
          block.taskId === taskId ? { ...block, budgetedMinutes } : block,
        ),
      },
    });
  },

  removeTask: (taskId) => {
    const plan = get().plan;
    if (!plan) return;
    set({
      plan: {
        ...plan,
        schedule: plan.schedule.filter((block) => block.taskId !== taskId),
        unscheduledTasks: [...plan.unscheduledTasks, taskId],
      },
    });
  },

  reorder: (activeId, overId) => {
    const plan = get().plan;
    if (!plan) return;
    const schedule = plan.schedule;
    const activeIndex = schedule.findIndex(
      (block) => block.taskId === activeId,
    );
    const overIndex = schedule.findIndex((block) => block.taskId === overId);
    if (activeIndex === -1 || overIndex === -1) return;
    const activeBlock = schedule[activeIndex];
    const overBlock = schedule[overIndex];
    if (!activeBlock || !overBlock) return;
    if (activeBlock.isFixed || overBlock.isFixed) return;
    set({
      plan: { ...plan, schedule: arrayMove(schedule, activeIndex, overIndex) },
    });
  },

  approvePlan: async () => {
    const plan = get().plan;
    if (!plan) return false;
    set({ isApproving: true, error: null });
    const result = await window.api.approvePlan(plan);
    if (result.ok) {
      set({ plan: null, isApproving: false, existingTodayPlan: result.data });
      return true;
    }
    set({ error: result.error.message, isApproving: false });
    return false;
  },

  discardPlan: () => set({ plan: null, error: null }),

  clearError: () => set({ error: null }),
}));
