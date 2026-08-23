import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import Database from "better-sqlite3";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../../db/database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

let db: Database.Database;

async function getTimerService() {
  return await import("../timer-service");
}

async function getTaskRepo() {
  return await import("../../db/task-repository");
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

    CREATE TABLE IF NOT EXISTS task_time_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      paused_at INTEGER,
      duration_minutes INTEGER,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
  `);

  // Insert two test tasks
  db.prepare(
    `
    INSERT INTO tasks (id, title, priority, status, estimated_minutes, created_at, updated_at)
    VALUES ('task-1', 'Task One', 'medium', 'todo', 30, 1000, 1000)
  `,
  ).run();

  db.prepare(
    `
    INSERT INTO tasks (id, title, priority, status, estimated_minutes, created_at, updated_at)
    VALUES ('task-2', 'Task Two', 'high', 'todo', 45, 1000, 1000)
  `,
  ).run();

  testDbReady.mockReturnValue(db);
});

afterEach(async () => {
  const service = await getTimerService();
  service.stopTimerEngine();
});

describe("timer-service", () => {
  it("starts a timer for a task and sets status to in_progress", async () => {
    const service = await getTimerService();
    const taskRepo = await getTaskRepo();

    const result = service.startTimer("task-1");
    expect(result.logId).toBeDefined();

    const active = service.getActiveTimer();
    expect(active).not.toBeNull();
    expect(active?.taskId).toBe("task-1");

    const task = taskRepo.getTasks().find((t) => t.id === "task-1");
    expect(task?.status).toBe("in_progress");
  });

  it("pauses an active timer", async () => {
    const service = await getTimerService();
    service.startTimer("task-1");

    const result = service.pauseTimer("task-1");
    expect(result.durationMinutes).toBeDefined();

    const active = service.getActiveTimer();
    expect(active).toBeNull();
  });

  it("auto-pauses previous timer when starting a new task timer", async () => {
    const service = await getTimerService();
    service.startTimer("task-1");

    expect(service.getActiveTimer()?.taskId).toBe("task-1");

    service.startTimer("task-2");
    expect(service.getActiveTimer()?.taskId).toBe("task-2");

    // Log for task 1 should be paused
    const logsRow = db
      .prepare("SELECT * FROM task_time_logs WHERE task_id = 'task-1'")
      .get() as { paused_at: number | null };
    expect(logsRow.paused_at).not.toBeNull();
  });

  it("throws NOT_FOUND when starting timer for non-existent task", async () => {
    const service = await getTimerService();
    expect(() => service.startTimer("invalid-task")).toThrow("Task not found.");
  });

  it("resets a stale in_progress task in the DB when starting another (no in-memory timer)", async () => {
    const service = await getTimerService();
    const taskRepo = await getTaskRepo();

    taskRepo.updateTask({ id: "task-1", status: "in_progress" });

    service.startTimer("task-2");

    const task1 = taskRepo.getTasks().find((t) => t.id === "task-1");
    const task2 = taskRepo.getTasks().find((t) => t.id === "task-2");
    expect(task1?.status).toBe("todo");
    expect(task2?.status).toBe("in_progress");
  });

  it("throws NOT_FOUND when pausing non-active timer", async () => {
    const service = await getTimerService();
    expect(() => service.pauseTimer()).toThrow("No active timer to pause.");
  });
});
