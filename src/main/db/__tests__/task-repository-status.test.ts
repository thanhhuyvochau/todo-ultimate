import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";

const getDbFn = vi.fn<() => Database.Database>();

vi.mock("../database", () => ({
  getDb: () => getDbFn(),
  initDb: () => getDbFn(),
}));

import {
  BACKLOG_START_ERROR_MESSAGE,
  createRecurringChildTask,
  createTask,
  updateTask,
} from "../task-repository";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  db.exec(`
    CREATE TABLE tasks (
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
    )
  `);
  getDbFn.mockReturnValue(db);
});

afterEach(() => {
  db.close();
});

function createBacklogTask() {
  return createTask({
    title: "Backlog task",
    description: null,
    priority: "medium",
    estimatedMinutes: 30,
  });
}

describe("task repository Today-only start invariant", () => {
  it("rejects starting a backlog task with the stable error", () => {
    const task = createBacklogTask();

    try {
      updateTask({ id: task.id, status: "in_progress" });
      expect.fail("Expected backlog start to fail");
    } catch (error) {
      expect(error).toMatchObject({
        code: "STATE_TRANSITION_ILLEGAL",
        message: BACKLOG_START_ERROR_MESSAGE,
      });
    }
  });

  it("does not allow a combined schedule-and-start patch to bypass the guard", () => {
    const task = createBacklogTask();

    expect(() =>
      updateTask({
        id: task.id,
        scheduledDate: 1_700_000_000_000,
        status: "in_progress",
      }),
    ).toThrow(BACKLOG_START_ERROR_MESSAGE);
  });

  it("allows a scheduled task to start after a standalone move", () => {
    const task = createBacklogTask();
    updateTask({ id: task.id, scheduledDate: 1_700_000_000_000 });

    const started = updateTask({ id: task.id, status: "in_progress" });

    expect(started.status).toBe("in_progress");
    expect(started.scheduledDate).toBe(1_700_000_000_000);
  });

  it("prevents an in-progress task from being persisted in Backlog", () => {
    const task = createBacklogTask();
    updateTask({ id: task.id, scheduledDate: 1_700_000_000_000 });
    updateTask({ id: task.id, status: "in_progress" });

    expect(() => updateTask({ id: task.id, scheduledDate: null })).toThrow(
      BACKLOG_START_ERROR_MESSAGE,
    );
  });

  it("schedules untimed recurring children at the supplied local midnight", () => {
    const startOfDay = 1_700_000_000_000;

    const task = createRecurringChildTask({
      id: "rule-1",
      title: "Daily review",
      description: null,
      priority: "low",
      estimatedMinutes: 15,
      timeAnchor: null,
      startOfDay,
    });

    expect(task.scheduledDate).toBe(startOfDay);
  });
});
