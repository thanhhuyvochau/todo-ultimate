import { create } from "zustand";
import type {
  PerformanceReportContent,
  PerformanceReportSummary,
} from "@/shared/models";

export type ReportTimeframePreset = "7" | "14" | "30" | "custom";

interface ReportStore {
  report: PerformanceReportContent | null;
  reports: PerformanceReportSummary[];
  viewingCachedId: string | null;
  isLoadingHistory: boolean;
  preset: ReportTimeframePreset;
  customStart: string;
  customEnd: string;
  isGenerating: boolean;
  error: string | null;
  setPreset: (preset: ReportTimeframePreset) => void;
  setCustomRange: (start: string, end: string) => void;
  generateReport: () => Promise<boolean>;
  loadReports: () => Promise<void>;
  viewReport: (id: string) => Promise<boolean>;
  deleteReport: (id: string) => Promise<boolean>;
  clearError: () => void;
  clearReport: () => void;
}

const PRESET_DAYS: Record<Exclude<ReportTimeframePreset, "custom">, number> = {
  "7": 7,
  "14": 14,
  "30": 30,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dateToEpochMs(value: string, endOfDay: boolean): number {
  const d = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return d.getTime();
}

export function resolveReportTimeframe(
  preset: ReportTimeframePreset,
  customStart: string,
  customEnd: string,
): { timeframeStart: number; timeframeEnd: number } {
  if (preset === "custom") {
    return {
      timeframeStart: dateToEpochMs(customStart, false),
      timeframeEnd: dateToEpochMs(customEnd, true),
    };
  }
  const days = PRESET_DAYS[preset];
  const end = Date.now();
  return { timeframeStart: end - days * DAY_MS, timeframeEnd: end };
}

export const useReportStore = create<ReportStore>((set, get) => ({
  report: null,
  reports: [],
  viewingCachedId: null,
  isLoadingHistory: false,
  preset: "7",
  customStart: "",
  customEnd: "",
  isGenerating: false,
  error: null,

  setPreset: (preset) => set({ preset, error: null }),
  setCustomRange: (start, end) => set({ customStart: start, customEnd: end }),

  generateReport: async () => {
    const { preset, customStart, customEnd } = get();
    const { timeframeStart, timeframeEnd } = resolveReportTimeframe(
      preset,
      customStart,
      customEnd,
    );
    if (
      !Number.isFinite(timeframeStart) ||
      !Number.isFinite(timeframeEnd) ||
      timeframeStart >= timeframeEnd
    ) {
      set({ error: "Select a valid date range." });
      return false;
    }
    set({ isGenerating: true, error: null });
    const result = await window.api.generateReport({
      timeframeStart,
      timeframeEnd,
    });
    if (result.ok) {
      set({
        report: result.data,
        viewingCachedId: null,
        isGenerating: false,
      });
      await get().loadReports();
      return true;
    }
    set({ error: result.error.message, isGenerating: false });
    return false;
  },

  loadReports: async () => {
    set({ isLoadingHistory: true });
    const result = await window.api.listReports();
    if (result.ok) {
      set({ reports: result.data, isLoadingHistory: false });
    } else {
      set({ isLoadingHistory: false });
    }
  },

  viewReport: async (id) => {
    const result = await window.api.getReport({ id });
    if (result.ok) {
      set({ report: result.data, viewingCachedId: id, error: null });
      return true;
    }
    set({ error: result.error.message });
    return false;
  },

  deleteReport: async (id) => {
    const result = await window.api.deleteReport({ id });
    if (result.ok) {
      const { viewingCachedId } = get();
      if (viewingCachedId === id) {
        set({ report: null, viewingCachedId: null });
      }
      await get().loadReports();
      return true;
    }
    set({ error: result.error.message });
    return false;
  },

  clearError: () => set({ error: null }),
  clearReport: () => set({ report: null, viewingCachedId: null }),
}));
