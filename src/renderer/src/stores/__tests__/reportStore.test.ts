import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  PerformanceReportContent,
  PerformanceReportSummary,
} from "@/shared/models";
import { useReportStore, resolveReportTimeframe } from "../reportStore";

type ApiMock = Record<string, ReturnType<typeof vi.fn>>;

const sampleSummary: PerformanceReportSummary = {
  id: "r1",
  timeframeStart: 1000,
  timeframeEnd: 2000,
  promptVersion: "v1",
  createdAt: 5000,
  efficiencyScore: 72,
  totalCompleted: 1,
};

const sampleReport: PerformanceReportContent = {
  timeframe: { start: 1000, end: 2000 },
  generatedAt: 3000,
  metrics: {
    totalCompleted: 1,
    overallVariance: 15,
    meanAbsoluteVariance: 15,
    byPriority: {
      low: { meanVariance: 0, meanVarianceRatio: null, count: 0 },
      medium: { meanVariance: 0, meanVarianceRatio: null, count: 0 },
      high: { meanVariance: 15, meanVarianceRatio: 1.5, count: 1 },
    },
    efficiencyScore: 72,
    trendDirection: "improving",
  },
  patterns: [],
  advice: [],
  summary: "You underestimate high-priority tasks.",
};

function setupApi(overrides: ApiMock = {}): ApiMock {
  const apiMock: ApiMock = {
    generateReport: vi.fn().mockResolvedValue({ ok: true, data: sampleReport }),
    listReports: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getReport: vi.fn().mockResolvedValue({ ok: true, data: sampleReport }),
    deleteReport: vi
      .fn()
      .mockResolvedValue({ ok: true, data: { success: true } }),
    ...overrides,
  };
  (window as unknown as Record<string, unknown>).api = apiMock;
  return apiMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
  useReportStore.setState({
    report: null,
    reports: [],
    viewingCachedId: null,
    isLoadingHistory: false,
    preset: "7",
    customStart: "",
    customEnd: "",
    isGenerating: false,
    error: null,
  });
});

describe("reportStore", () => {
  it("generateReport computes a timeframe and stores the report", async () => {
    const api = setupApi();

    const ok = await useReportStore.getState().generateReport();

    expect(ok).toBe(true);
    expect(api.generateReport).toHaveBeenCalledTimes(1);
    const arg = api.generateReport.mock.calls[0]?.[0] as {
      timeframeStart: number;
      timeframeEnd: number;
    };
    expect(arg.timeframeStart).toBeLessThan(arg.timeframeEnd);
    expect(useReportStore.getState().report).toEqual(sampleReport);
    expect(useReportStore.getState().isGenerating).toBe(false);
  });

  it("generateReport surfaces an error when the API fails", async () => {
    setupApi({
      generateReport: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "AI_AUTH_FAILED", message: "boom" },
      }),
    });

    const ok = await useReportStore.getState().generateReport();

    expect(ok).toBe(false);
    expect(useReportStore.getState().error).toBe("boom");
    expect(useReportStore.getState().report).toBeNull();
  });

  it("generateReport rejects an invalid custom range without calling the API", async () => {
    const api = setupApi();
    useReportStore.setState({
      preset: "custom",
      customStart: "2026-08-16",
      customEnd: "2026-08-01",
    });

    const ok = await useReportStore.getState().generateReport();

    expect(ok).toBe(false);
    expect(api.generateReport).not.toHaveBeenCalled();
    expect(useReportStore.getState().error).toBe("Select a valid date range.");
  });

  it("generateReport reloads history after success", async () => {
    const api = setupApi({
      listReports: vi
        .fn()
        .mockResolvedValue({ ok: true, data: [sampleSummary] }),
    });

    await useReportStore.getState().generateReport();

    expect(api.listReports).toHaveBeenCalledTimes(1);
    expect(useReportStore.getState().reports).toEqual([sampleSummary]);
  });

  it("loadReports populates the history list", async () => {
    const api = setupApi({
      listReports: vi
        .fn()
        .mockResolvedValue({ ok: true, data: [sampleSummary] }),
    });

    await useReportStore.getState().loadReports();

    expect(api.listReports).toHaveBeenCalledTimes(1);
    expect(useReportStore.getState().reports).toEqual([sampleSummary]);
    expect(useReportStore.getState().isLoadingHistory).toBe(false);
  });

  it("viewReport loads a cached report and tracks its id", async () => {
    setupApi({
      getReport: vi.fn().mockResolvedValue({ ok: true, data: sampleReport }),
    });

    const ok = await useReportStore.getState().viewReport("r1");

    expect(ok).toBe(true);
    expect(useReportStore.getState().report).toEqual(sampleReport);
    expect(useReportStore.getState().viewingCachedId).toBe("r1");
  });

  it("deleteReport removes the entry and clears it if currently viewing", async () => {
    const api = setupApi({
      deleteReport: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { success: true } }),
      listReports: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    });
    useReportStore.setState({ report: sampleReport, viewingCachedId: "r1" });

    const ok = await useReportStore.getState().deleteReport("r1");

    expect(ok).toBe(true);
    expect(useReportStore.getState().report).toBeNull();
    expect(useReportStore.getState().viewingCachedId).toBeNull();
    expect(api.deleteReport).toHaveBeenCalledWith({ id: "r1" });
  });
});

describe("resolveReportTimeframe", () => {
  it("computes a preset range that ends around now", () => {
    const now = Date.now();
    const range = resolveReportTimeframe("7", "", "");

    expect(range.timeframeEnd).toBeGreaterThanOrEqual(now - 1000);
    expect(range.timeframeStart).toBeLessThan(range.timeframeEnd);
  });

  it("computes a custom range from date strings", () => {
    const range = resolveReportTimeframe("custom", "2026-08-01", "2026-08-07");

    expect(range.timeframeStart).toBe(
      new Date("2026-08-01T00:00:00.000").getTime(),
    );
    expect(range.timeframeEnd).toBe(
      new Date("2026-08-07T23:59:59.999").getTime(),
    );
  });
});
