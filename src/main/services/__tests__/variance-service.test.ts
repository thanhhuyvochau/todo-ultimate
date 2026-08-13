import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../../db/database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

let db: Database.Database;

async function getVarianceService() {
  return await import("../variance-service");
}

function insertTask(row: {
  id: string;
  title?: string;
  priority?: string;
  status?: string;
  estimatedMinutes: number;
  actualMinutes?: number | null;
  isRecurringChild?: number;
  completedAt?: number | null;
}) {
  db.prepare(
    `
    INSERT INTO tasks (id, title, priority, status, estimated_minutes, actual_minutes, is_recurring_child, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1000, 1000)
  `,
  ).run(
    row.id,
    row.title ?? row.id,
    row.priority ?? "medium",
    row.status ?? "completed",
    row.estimatedMinutes,
    row.actualMinutes === undefined ? null : row.actualMinutes,
    row.isRecurringChild ?? 0,
    row.completedAt === undefined ? 2000 : row.completedAt,
  );
}

beforeEach(() => {
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
});

describe("variance-service", () => {
  it("returns empty metrics when no completed tasks exist", async () => {
    const service = await getVarianceService();
    const metrics = service.getVarianceMetrics();

    expect(metrics.totalCompleted).toBe(0);
    expect(metrics.overallMeanVariance).toBe(0);
    expect(metrics.overallMeanAbsoluteVariance).toBe(0);
    expect(metrics.overallMeanVarianceRatio).toBeNull();
    expect(metrics.byPriority.high.count).toBe(0);
    expect(metrics.byTaskType.manual.count).toBe(0);
    expect(metrics.underestimationRate).toBe(0);
  });

  it("computes aggregate metrics across priority, type, rates and outliers", async () => {
    insertTask({
      id: "a",
      priority: "low",
      estimatedMinutes: 30,
      actualMinutes: 45,
    }); // Δ +15, ratio 1.5
    insertTask({
      id: "b",
      priority: "high",
      estimatedMinutes: 60,
      actualMinutes: 45,
    }); // Δ -15, ratio 0.75
    insertTask({
      id: "c",
      priority: "high",
      isRecurringChild: 1,
      estimatedMinutes: 10,
      actualMinutes: 10,
    }); // Δ 0, ratio 1.0, on point
    insertTask({
      id: "d",
      priority: "medium",
      estimatedMinutes: 5,
      actualMinutes: 60,
    }); // Δ +55, ratio 12, outlier

    const service = await getVarianceService();
    const metrics = service.getVarianceMetrics();

    expect(metrics.totalCompleted).toBe(4);
    expect(metrics.overallMeanVariance).toBeCloseTo(13.75);
    expect(metrics.overallMeanAbsoluteVariance).toBeCloseTo(21.25);
    expect(metrics.overallMeanVarianceRatio).toBeCloseTo(3.8125);

    expect(metrics.underestimationRate).toBeCloseTo(0.5);
    expect(metrics.overestimationRate).toBeCloseTo(0.25);
    expect(metrics.onPointRate).toBeCloseTo(0.25);
    expect(metrics.outlierCount).toBe(1);

    expect(metrics.byPriority.low.meanVariance).toBeCloseTo(15);
    expect(metrics.byPriority.low.count).toBe(1);
    expect(metrics.byPriority.medium.meanVariance).toBeCloseTo(55);
    expect(metrics.byPriority.medium.outlierCount).toBe(1);
    expect(metrics.byPriority.high.meanVariance).toBeCloseTo(-7.5);
    expect(metrics.byPriority.high.meanVarianceRatio).toBeCloseTo(0.875);
    expect(metrics.byPriority.high.count).toBe(2);

    expect(metrics.byTaskType.manual.meanVariance).toBeCloseTo(55 / 3);
    expect(metrics.byTaskType.manual.meanVarianceRatio).toBeCloseTo(4.75);
    expect(metrics.byTaskType.manual.count).toBe(3);
    expect(metrics.byTaskType.recurring.meanVariance).toBeCloseTo(0);
    expect(metrics.byTaskType.recurring.count).toBe(1);
  });

  it("filters completed tasks by timeframe", async () => {
    insertTask({
      id: "old",
      estimatedMinutes: 20,
      actualMinutes: 40,
      completedAt: 1000,
    });
    insertTask({
      id: "recent",
      estimatedMinutes: 20,
      actualMinutes: 30,
      completedAt: 3000,
    });

    const service = await getVarianceService();
    const metrics = service.getVarianceMetrics({ start: 2000, end: 4000 });

    expect(metrics.totalCompleted).toBe(1);
    expect(metrics.overallMeanVariance).toBeCloseTo(10);
  });

  it("skips tasks with null actual minutes", async () => {
    insertTask({
      id: "done",
      estimatedMinutes: 30,
      actualMinutes: 45,
    });
    insertTask({
      id: "no-actual",
      estimatedMinutes: 30,
      actualMinutes: null,
    });

    const service = await getVarianceService();
    const metrics = service.getVarianceMetrics();

    expect(metrics.totalCompleted).toBe(1);
    expect(metrics.overallMeanVariance).toBeCloseTo(15);
  });

  it("getTaskVariance returns null for unknown task", async () => {
    const service = await getVarianceService();
    expect(service.getTaskVariance("missing")).toBeNull();
  });

  it("getTaskVariance computes delta, ratio and outlier flag", async () => {
    insertTask({
      id: "task-x",
      estimatedMinutes: 10,
      actualMinutes: 45,
    });

    const service = await getVarianceService();
    const variance = service.getTaskVariance("task-x");

    expect(variance).not.toBeNull();
    expect(variance?.varianceMinutes).toBe(35);
    expect(variance?.varianceRatio).toBeCloseTo(4.5);
    expect(variance?.isOutlier).toBe(false);

    insertTask({
      id: "task-y",
      estimatedMinutes: 2,
      actualMinutes: 30,
    });
    const outlier = service.getTaskVariance("task-y");
    expect(outlier?.isOutlier).toBe(true);
  });

  it("formatVarianceContext renders the AI prompt snippet", async () => {
    insertTask({
      id: "p",
      priority: "high",
      estimatedMinutes: 50,
      actualMinutes: 65,
    }); // Δ +15

    const service = await getVarianceService();
    const metrics = service.getVarianceMetrics();
    const context = service.formatVarianceContext(metrics);

    expect(context).toContain("Historical estimation accuracy:");
    expect(context).toContain(
      "Overall bias: +15 min (tendency to underestimate)",
    );
    expect(context).toContain(
      "High-priority tasks: 1.3x actual/estimated ratio",
    );
    expect(context).toContain("0% of estimates within 5 min accuracy");
  });
});
