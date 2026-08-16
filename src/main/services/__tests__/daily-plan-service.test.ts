import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import type { DailyPlanRequest, DailyPlanSchedule } from "@/shared/models";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../../db/database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

const mockGenerateDailyPlan = vi.fn();

vi.mock("../deepseekService", () => ({
  generateDailyPlan: (input: unknown) => mockGenerateDailyPlan(input),
}));

let db: Database.Database;

async function getService() {
  return await import("../daily-plan-service");
}

function insertTask(row: {
  id: string;
  title?: string;
  priority?: string;
  status?: string;
  estimatedMinutes: number;
  isRecurringChild?: number;
  scheduledDate?: number | null;
}) {
  db.prepare(
    `
    INSERT INTO tasks (id, title, priority, status, estimated_minutes, actual_minutes, is_recurring_child, recurring_rule_id, scheduled_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, null, ?, null, ?, 1000, 1000)
  `,
  ).run(
    row.id,
    row.title ?? row.id,
    row.priority ?? "medium",
    row.status ?? "todo",
    row.estimatedMinutes,
    row.isRecurringChild ?? 0,
    row.scheduledDate === undefined ? null : row.scheduledDate,
  );
}

const schedule: DailyPlanSchedule = {
  date: 1723536000000,
  focusHours: 6,
  primaryGoal: "Ship it",
  schedule: [],
  unscheduledTasks: [],
  summary: "done",
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
  mockGenerateDailyPlan.mockResolvedValue(schedule);
});

describe("daily-plan-service", () => {
  it("throws VALIDATION_ERROR for non-positive focus hours", async () => {
    const service = await getService();

    await expect(
      service.generateDailyPlan({ focusHours: 0, primaryGoal: "x" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(mockGenerateDailyPlan).not.toHaveBeenCalled();
  });

  it("partitions fixed blocks from flexible backlog and passes variance", async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    insertTask({
      id: "fixed-1",
      title: "Evening Read",
      priority: "low",
      estimatedMinutes: 30,
      isRecurringChild: 1,
      scheduledDate: todayStart.getTime() + 20 * 60 * 60 * 1000,
    });
    insertTask({
      id: "flex-1",
      title: "Write code",
      priority: "high",
      estimatedMinutes: 60,
    });
    insertTask({
      id: "flex-2",
      title: "Plan week",
      priority: "low",
      estimatedMinutes: 30,
    });

    const service = await getService();
    await service.generateDailyPlan({ focusHours: 6, primaryGoal: "Ship it" });

    const request = mockGenerateDailyPlan.mock
      .calls[0]?.[0] as DailyPlanRequest;

    expect(request.fixedBlocks).toEqual([
      {
        taskId: "fixed-1",
        title: "Evening Read",
        startTime: todayStart.getTime() + 20 * 60 * 60 * 1000,
        durationMinutes: 30,
      },
    ]);
    expect(request.tasks.map((t) => t.id)).toEqual(["flex-1", "flex-2"]);
    expect(request.tasks[0]?.priority).toBe("high");
    expect(request.historicalVariance).toBeTruthy();
  });

  it("excludes non-anchored or non-today recurring children from fixed blocks", async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    insertTask({
      id: "recurring-flex",
      title: "Daily",
      estimatedMinutes: 10,
      isRecurringChild: 1,
      scheduledDate: null,
    });
    insertTask({
      id: "yesterday-fixed",
      title: "Old",
      estimatedMinutes: 20,
      isRecurringChild: 1,
      scheduledDate: todayStart.getTime() - 24 * 60 * 60 * 1000,
    });

    const service = await getService();
    await service.generateDailyPlan({ focusHours: 2, primaryGoal: "" });

    const request = mockGenerateDailyPlan.mock
      .calls[0]?.[0] as DailyPlanRequest;

    expect(request.fixedBlocks).toEqual([]);
    expect(request.tasks.map((t) => t.id)).toEqual([
      "recurring-flex",
      "yesterday-fixed",
    ]);
  });
});
