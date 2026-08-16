import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import type { PerformanceReportContent, ReportParams } from "@/shared/models";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../../db/database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

const mockGeneratePerformanceReport = vi.fn();

vi.mock("../deepseekService", () => ({
  generatePerformanceReport: (params: unknown) =>
    mockGeneratePerformanceReport(params),
}));

let db: Database.Database;

async function getService() {
  return await import("../report-service");
}

function insertCompletedTask(row: {
  id: string;
  title?: string;
  priority?: string;
  estimatedMinutes: number;
  actualMinutes: number;
  completedAt: number;
}) {
  db.prepare(
    `
    INSERT INTO tasks (id, title, description, priority, status, estimated_minutes, actual_minutes, is_recurring_child, recurring_rule_id, scheduled_date, completed_at, created_at, updated_at)
    VALUES (?, ?, null, ?, 'completed', ?, ?, 0, null, null, ?, 1000, 1000)
  `,
  ).run(
    row.id,
    row.title ?? row.id,
    row.priority ?? "medium",
    row.estimatedMinutes,
    row.actualMinutes,
    row.completedAt,
  );
}

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
  patterns: [
    {
      title: "Underestimates high-priority work",
      description: "High-priority tasks took longer than expected.",
      severity: "warning",
    },
  ],
  advice: [
    {
      category: "estimation",
      recommendation: "Pad high-priority estimates.",
      actionableTip: "Add 20% buffer to high-priority estimates.",
    },
  ],
  summary: "You underestimate high-priority tasks.",
};

beforeEach(() => {
  vi.clearAllMocks();
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      estimated_minutes INTEGER NOT NULL,
      actual_minutes INTEGER,
      is_recurring_child INTEGER DEFAULT 0,
      recurring_rule_id TEXT,
      scheduled_date INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  testDbReady.mockReturnValue(db);
  mockGeneratePerformanceReport.mockResolvedValue(sampleReport);
});

describe("report-service", () => {
  it("throws VALIDATION_ERROR for an invalid timeframe", async () => {
    const service = await getService();

    await expect(
      service.generateReport({ timeframeStart: 2000, timeframeEnd: 1000 }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      service.generateReport({ timeframeStart: 1000, timeframeEnd: 1000 }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(mockGeneratePerformanceReport).not.toHaveBeenCalled();
  });

  it("returns a no-data fallback without calling the AI", async () => {
    const service = await getService();

    const report = await service.generateReport({
      timeframeStart: 1000,
      timeframeEnd: 2000,
    });

    expect(report.metrics.totalCompleted).toBe(0);
    expect(report.metrics.efficiencyScore).toBe(0);
    expect(report.summary).toContain("No data");
    expect(mockGeneratePerformanceReport).not.toHaveBeenCalled();
  });

  it("passes completed tasks and metrics to the AI", async () => {
    insertCompletedTask({
      id: "c1",
      title: "Ship it",
      priority: "high",
      estimatedMinutes: 30,
      actualMinutes: 45,
      completedAt: 1500,
    });
    insertCompletedTask({
      id: "c2",
      title: "Email",
      priority: "low",
      estimatedMinutes: 20,
      actualMinutes: 10,
      completedAt: 1600,
    });

    const service = await getService();
    await service.generateReport({
      timeframeStart: 1000,
      timeframeEnd: 2000,
    });

    expect(mockGeneratePerformanceReport).toHaveBeenCalledTimes(1);
    const params = mockGeneratePerformanceReport.mock
      .calls[0]?.[0] as ReportParams;

    expect(params.completedTasks).toHaveLength(2);
    expect(params.completedTasks.map((t) => t.actualMinutes)).toEqual([45, 10]);
    expect(params.metrics.totalCompleted).toBe(2);
    expect(params.timeframeStart).toBe(1000);
    expect(params.timeframeEnd).toBe(2000);
  });

  it("propagates AI errors", async () => {
    insertCompletedTask({
      id: "c1",
      title: "Ship it",
      estimatedMinutes: 30,
      actualMinutes: 45,
      completedAt: 1500,
    });
    mockGeneratePerformanceReport.mockRejectedValueOnce(
      Object.assign(new Error("No API key configured."), {
        code: "AI_AUTH_FAILED",
      }),
    );

    const service = await getService();

    await expect(
      service.generateReport({ timeframeStart: 1000, timeframeEnd: 2000 }),
    ).rejects.toMatchObject({ code: "AI_AUTH_FAILED" });
  });
});
