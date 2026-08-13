import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

let db: Database.Database;

async function getRepo() {
  return await import("../time-log-repository");
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

  // Insert test task
  db.prepare(`
    INSERT INTO tasks (id, title, priority, status, estimated_minutes, created_at, updated_at)
    VALUES ('task-1', 'Test Task', 'medium', 'todo', 30, 1000, 1000)
  `).run();

  testDbReady.mockReturnValue(db);
});

describe("time-log-repository", () => {
  it("creates a time log with paused_at IS NULL", async () => {
    const repo = await getRepo();
    const log = repo.createTimeLog("task-1", 10000);

    expect(log.id).toBeDefined();
    expect(log.taskId).toBe("task-1");
    expect(log.startedAt).toBe(10000);
    expect(log.pausedAt).toBeNull();
    expect(log.durationMinutes).toBeNull();
  });

  it("pauses a time log and calculates duration_minutes + updates task actual_minutes", async () => {
    const repo = await getRepo();
    const log = repo.createTimeLog("task-1", 10000);

    // Pause 30 minutes later (10000 + 30 * 60 * 1000 = 1810000)
    const pausedLog = repo.pauseTimeLog(log.id, 1810000);

    expect(pausedLog.pausedAt).toBe(1810000);
    expect(pausedLog.durationMinutes).toBe(30);

    // Check task actual_minutes
    const taskRow = db.prepare("SELECT actual_minutes FROM tasks WHERE id = 'task-1'").get() as { actual_minutes: number };
    expect(taskRow.actual_minutes).toBe(30);
  });

  it("finds unclosed time log", async () => {
    const repo = await getRepo();
    repo.createTimeLog("task-1", 10000);

    const unclosed = repo.getUnclosedTimeLog("task-1");
    expect(unclosed).not.toBeNull();
    expect(unclosed?.taskId).toBe("task-1");

    const anyUnclosed = repo.getUnclosedTimeLog();
    expect(anyUnclosed).not.toBeNull();
  });

  it("throws NOT_FOUND when pausing non-existent log", async () => {
    const repo = await getRepo();
    expect(() => repo.pauseTimeLog("invalid-id")).toThrow("Time log not found.");
  });
});
