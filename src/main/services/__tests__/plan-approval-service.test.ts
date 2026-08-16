import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import Database from "better-sqlite3";
import type { DailyPlanSchedule } from "@/shared/models";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../../db/database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

let db: Database.Database;

async function getService() {
  return await import("../plan-approval-service");
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function insertTask(row: { id: string; title?: string; status?: string }) {
  db.prepare(
    `
    INSERT INTO tasks (id, title, priority, status, estimated_minutes, actual_minutes, is_recurring_child, recurring_rule_id, scheduled_date, completed_at, created_at, updated_at)
    VALUES (?, ?, 'medium', ?, 30, null, 0, null, null, null, 1000, 1000)
  `,
  ).run(row.id, row.title ?? row.id, row.status ?? "todo");
}

function makeSchedule(
  overrides: Partial<DailyPlanSchedule> = {},
): DailyPlanSchedule {
  return {
    date: startOfToday(),
    focusHours: 6,
    primaryGoal: "Ship it",
    schedule: [
      {
        taskId: "flex-1",
        title: "Write code",
        priority: "high",
        estimatedMinutes: 60,
        budgetedMinutes: 50,
        scheduledStart: startOfToday() + 9 * 60 * 60 * 1000,
        isFixed: false,
        rationale: "High priority first.",
      },
      {
        taskId: "fixed-1",
        title: "Evening Read",
        priority: "low",
        estimatedMinutes: 30,
        budgetedMinutes: 30,
        scheduledStart: startOfToday() + 20 * 60 * 60 * 1000,
        isFixed: true,
        rationale: "Recurring commitment.",
      },
    ],
    unscheduledTasks: [],
    summary: "A focused day.",
    ...overrides,
  };
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

    CREATE TABLE IF NOT EXISTS daily_plans (
      id TEXT PRIMARY KEY,
      date INTEGER NOT NULL,
      focus_hours REAL,
      primary_goal TEXT,
      plan_json TEXT NOT NULL,
      is_approved INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  testDbReady.mockReturnValue(db);
});

afterAll(() => {
  if (db && db.open) db.close();
});

describe("plan-approval-service", () => {
  it("throws VALIDATION_ERROR for non-positive focus hours", async () => {
    const service = await getService();
    expect(() =>
      service.approvePlan(makeSchedule({ focusHours: 0 })),
    ).toThrowError(/positive/);
  });

  it("schedules flexible tasks for today and leaves fixed blocks untouched", async () => {
    insertTask({ id: "flex-1" });
    insertTask({ id: "fixed-1" });

    const service = await getService();
    const plan = service.approvePlan(makeSchedule());

    expect(plan.isApproved).toBe(true);

    const flex = db
      .prepare("SELECT scheduled_date FROM tasks WHERE id = ?")
      .get("flex-1") as { scheduled_date: number | null };
    const fixed = db
      .prepare("SELECT scheduled_date FROM tasks WHERE id = ?")
      .get("fixed-1") as { scheduled_date: number | null };

    expect(flex.scheduled_date).toBe(startOfToday());
    expect(fixed.scheduled_date).toBeNull();
  });

  it("rolls back atomically when a planned task is missing", async () => {
    insertTask({ id: "flex-1" });
    insertTask({ id: "fixed-1" });

    const service = await getService();
    const schedule = makeSchedule();
    schedule.schedule = [
      {
        taskId: "flex-1",
        title: "Write code",
        priority: "high",
        estimatedMinutes: 60,
        budgetedMinutes: 50,
        scheduledStart: startOfToday() + 9 * 60 * 60 * 1000,
        isFixed: false,
        rationale: "First.",
      },
      {
        taskId: "flex-missing",
        title: "Ghost",
        priority: "low",
        estimatedMinutes: 15,
        budgetedMinutes: 15,
        scheduledStart: startOfToday() + 10 * 60 * 60 * 1000,
        isFixed: false,
        rationale: "Gone.",
      },
      {
        taskId: "fixed-1",
        title: "Evening Read",
        priority: "low",
        estimatedMinutes: 30,
        budgetedMinutes: 30,
        scheduledStart: startOfToday() + 20 * 60 * 60 * 1000,
        isFixed: true,
        rationale: "Recurring commitment.",
      },
    ];

    expect(() => service.approvePlan(schedule)).toThrowError(
      /no longer exists/,
    );

    const flex = db
      .prepare("SELECT scheduled_date FROM tasks WHERE id = ?")
      .get("flex-1") as { scheduled_date: number | null };
    expect(flex.scheduled_date).toBeNull();

    const planCount = db
      .prepare("SELECT COUNT(*) AS count FROM daily_plans")
      .get() as { count: number };
    expect(planCount.count).toBe(0);
  });

  it("rolls back when a planned task is no longer in todo state", async () => {
    insertTask({ id: "flex-1", status: "completed" });
    insertTask({ id: "fixed-1" });

    const service = await getService();
    expect(() => service.approvePlan(makeSchedule())).toThrowError(
      /no longer available/,
    );

    const planCount = db
      .prepare("SELECT COUNT(*) AS count FROM daily_plans")
      .get() as { count: number };
    expect(planCount.count).toBe(0);
  });

  it("stores the full schedule in plan_json", async () => {
    insertTask({ id: "flex-1" });
    insertTask({ id: "fixed-1" });

    const service = await getService();
    const plan = service.approvePlan(makeSchedule());

    const parsed = JSON.parse(plan.planJson) as DailyPlanSchedule;
    expect(parsed.schedule).toHaveLength(2);
    expect(parsed.summary).toBe("A focused day.");
  });
});
