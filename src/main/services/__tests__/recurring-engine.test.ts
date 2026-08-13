import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import Database from "better-sqlite3";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../db/database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

let db: Database.Database;

async function getEngine() {
  return await import("../services/recurring-engine");
}

async function createTasksTable() {
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
}

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_rules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      estimated_minutes INTEGER NOT NULL,
      frequency TEXT NOT NULL,
      time_anchor INTEGER,
      days_of_week TEXT,
      day_of_month INTEGER,
      is_active INTEGER DEFAULT 1,
      last_instantiated_date INTEGER,
      created_at INTEGER NOT NULL
    );
  `);

  testDbReady.mockReturnValue(db);
});

afterAll(() => {
  if (db && db.open) db.close();
});

describe("getStartOfDay", () => {
  it("rounds to midnight", async () => {
    const engine = await getEngine();
    const ts = new Date("2026-08-09T14:30:45").getTime();
    const result = engine.getStartOfDay(ts);
    const d = new Date(result);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });
});

describe("matchesTodayFrequency", () => {
  it("daily always matches", async () => {
    const engine = await getEngine();
    const today = new Date("2026-08-09T12:00:00");
    expect(
      engine.matchesTodayFrequency(
        {
          id: "r1",
          title: "Daily",
          description: null,
          priority: "medium",
          estimatedMinutes: 30,
          frequency: "daily",
          timeAnchor: null,
          daysOfWeek: null,
          dayOfMonth: null,
          isActive: true,
          lastInstantiatedDate: null,
          createdAt: 0,
        },
        today,
      ),
    ).toBe(true);
  });

  it("weekly matches on correct day", async () => {
    const engine = await getEngine();
    const sunday = new Date("2026-08-09T12:00:00");
    const monday = new Date("2026-08-10T12:00:00");

    const rule = {
      id: "r1",
      title: "MWF",
      description: null,
      priority: "medium",
      estimatedMinutes: 30,
      frequency: "weekly" as const,
      timeAnchor: null,
      daysOfWeek: [1, 3, 5],
      dayOfMonth: null,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: 0,
    };

    expect(engine.matchesTodayFrequency(rule, sunday)).toBe(false);
    expect(engine.matchesTodayFrequency(rule, monday)).toBe(true);
    expect(
      engine.matchesTodayFrequency(rule, new Date("2026-08-12T12:00:00")),
    ).toBe(true);
  });

  it("monthly matches on correct day", async () => {
    const engine = await getEngine();
    const rule = {
      id: "r1",
      title: "Monthly",
      description: null,
      priority: "medium",
      estimatedMinutes: 30,
      frequency: "monthly" as const,
      timeAnchor: null,
      daysOfWeek: null,
      dayOfMonth: 15,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: 0,
    };

    expect(
      engine.matchesTodayFrequency(rule, new Date("2026-08-15T12:00:00")),
    ).toBe(true);
    expect(
      engine.matchesTodayFrequency(rule, new Date("2026-08-14T12:00:00")),
    ).toBe(false);
  });
});

describe("instantiateDailyTasks", () => {
  it("creates a task for a daily active rule", async () => {
    await createTasksTable();

    const ruleRepo = await import("../db/recurring-rule-repository");
    ruleRepo.createRule({
      title: "Morning Standup",
      description: "Daily sync",
      priority: "high",
      estimatedMinutes: 30,
      frequency: "daily",
      timeAnchor: null,
      daysOfWeek: null,
      dayOfMonth: null,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });

    const engine = await getEngine();
    const now = new Date("2026-08-09T10:00:00").getTime();
    const count = engine.instantiateDailyTasks(now);

    expect(count).toBe(1);

    const task = db.prepare("SELECT * FROM tasks").get() as Record<
      string,
      unknown
    >;
    expect(task.title).toBe("Morning Standup");
    expect(task.priority).toBe("high");
    expect(task.estimated_minutes).toBe(30);
    expect(task.is_recurring_child).toBe(1);
    expect(task.recurring_rule_id).toBeTruthy();
    expect(task.scheduled_date).toBeNull();
  });

  it("skips already instantiated rules (dedup)", async () => {
    await createTasksTable();

    const ruleRepo = await import("../db/recurring-rule-repository");
    const rule = ruleRepo.createRule({
      title: "Daily",
      description: null,
      priority: "medium",
      estimatedMinutes: 10,
      frequency: "daily",
      timeAnchor: null,
      daysOfWeek: null,
      dayOfMonth: null,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });

    const engine = await getEngine();
    const now = new Date("2026-08-09T10:00:00").getTime();
    const todayStart = engine.getStartOfDay(now);

    db.prepare(
      "UPDATE recurring_rules SET last_instantiated_date = ? WHERE id = ?",
    ).run(todayStart, rule.id);

    const count = engine.instantiateDailyTasks(now);
    expect(count).toBe(0);
  });

  it("skips inactive rules", async () => {
    await createTasksTable();

    const ruleRepo = await import("../db/recurring-rule-repository");
    ruleRepo.createRule({
      title: "Inactive",
      description: null,
      priority: "low",
      estimatedMinutes: 5,
      frequency: "daily",
      timeAnchor: null,
      daysOfWeek: null,
      dayOfMonth: null,
      isActive: false,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });

    const engine = await getEngine();
    const now = new Date("2026-08-09T10:00:00").getTime();
    const count = engine.instantiateDailyTasks(now);

    expect(count).toBe(0);
  });

  it("creates weekly only on matching days", async () => {
    await createTasksTable();

    const ruleRepo = await import("../db/recurring-rule-repository");
    ruleRepo.createRule({
      title: "T/Th",
      description: null,
      priority: "medium",
      estimatedMinutes: 45,
      frequency: "weekly",
      timeAnchor: null,
      daysOfWeek: [2, 4],
      dayOfMonth: null,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });

    const engine = await getEngine();

    const monday = new Date("2026-08-10T10:00:00").getTime();
    expect(engine.instantiateDailyTasks(monday)).toBe(0);

    const tuesday = new Date("2026-08-11T10:00:00").getTime();
    expect(engine.instantiateDailyTasks(tuesday)).toBe(1);
  });

  it("creates monthly only on matching day", async () => {
    await createTasksTable();

    const ruleRepo = await import("../db/recurring-rule-repository");
    ruleRepo.createRule({
      title: "Rent",
      description: null,
      priority: "high",
      estimatedMinutes: 5,
      frequency: "monthly",
      timeAnchor: null,
      daysOfWeek: null,
      dayOfMonth: 15,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });

    const engine = await getEngine();

    const notMatch = new Date("2026-08-14T10:00:00").getTime();
    expect(engine.instantiateDailyTasks(notMatch)).toBe(0);

    const match = new Date("2026-08-15T10:00:00").getTime();
    expect(engine.instantiateDailyTasks(match)).toBe(1);
  });

  it("sets scheduledDate for time-anchored tasks", async () => {
    await createTasksTable();

    const ruleRepo = await import("../db/recurring-rule-repository");
    ruleRepo.createRule({
      title: "Evening Read",
      description: null,
      priority: "low",
      estimatedMinutes: 30,
      frequency: "daily",
      timeAnchor: new Date("2026-01-01T20:00:00").getTime(),
      daysOfWeek: null,
      dayOfMonth: null,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });

    const engine = await getEngine();
    const now = new Date("2026-08-09T10:00:00").getTime();
    const count = engine.instantiateDailyTasks(now);

    expect(count).toBe(1);

    const task = db.prepare("SELECT * FROM tasks").get() as Record<
      string,
      unknown
    >;
    expect(task.scheduled_date).toBeTruthy();

    const scheduled = new Date(task.scheduled_date as number);
    expect(scheduled.getHours()).toBe(20);
    expect(scheduled.getMinutes()).toBe(0);
  });

  it("returns correct count for multiple rules", async () => {
    await createTasksTable();

    const ruleRepo = await import("../db/recurring-rule-repository");
    ruleRepo.createRule({
      title: "Daily 1",
      description: null,
      priority: "medium",
      estimatedMinutes: 15,
      frequency: "daily",
      timeAnchor: null,
      daysOfWeek: null,
      dayOfMonth: null,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });
    ruleRepo.createRule({
      title: "Daily 2",
      description: null,
      priority: "low",
      estimatedMinutes: 10,
      frequency: "daily",
      timeAnchor: null,
      daysOfWeek: null,
      dayOfMonth: null,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });
    ruleRepo.createRule({
      title: "Inactive",
      description: null,
      priority: "medium",
      estimatedMinutes: 20,
      frequency: "daily",
      timeAnchor: null,
      daysOfWeek: null,
      dayOfMonth: null,
      isActive: false,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });

    const engine = await getEngine();
    const now = new Date("2026-08-09T10:00:00").getTime();
    const count = engine.instantiateDailyTasks(now);

    expect(count).toBe(2);
  });
});
