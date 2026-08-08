import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import Database from "better-sqlite3";
import { handlers } from "../handlers";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../../db/database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

vi.mock("../../services/keychain-service", () => ({
  getApiKey: () => ({ hasKey: false }),
  setApiKey: () => ({ success: true }),
  deleteApiKey: () => ({ success: true }),
  isEncryptionAvailable: () => true,
}));

let db: Database.Database;

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
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  testDbReady.mockReturnValue(db);
});

afterAll(() => {
  if (db && db.open) db.close();
});

describe("tasks:getAll", () => {
  it("returns empty array when no tasks", () => {
    const result = handlers["tasks:getAll"]({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });

  it("returns tasks when they exist", () => {
    handlers["tasks:create"]({
      title: "Task 1",
      description: null,
      priority: "high",
      status: "todo",
      estimatedMinutes: 30,
      actualMinutes: null,
      isRecurringChild: false,
      recurringRuleId: null,
      scheduledDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = handlers["tasks:getAll"]({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
    }
  });
});

describe("tasks:create", () => {
  it("creates a task and returns it", () => {
    const result = handlers["tasks:create"]({
      title: "Test Task",
      description: "A test",
      priority: "high",
      status: "todo",
      estimatedMinutes: 30,
      actualMinutes: null,
      isRecurringChild: false,
      recurringRuleId: null,
      scheduledDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Test Task");
      expect(result.data.status).toBe("todo");
      expect(typeof result.data.id).toBe("string");
      expect(result.data.estimatedMinutes).toBe(30);
    }
  });

  it("rejects empty title", () => {
    const result = handlers["tasks:create"]({
      title: "",
      description: null,
      priority: "medium",
      status: "todo",
      estimatedMinutes: 10,
      actualMinutes: null,
      isRecurringChild: false,
      recurringRuleId: null,
      scheduledDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects invalid priority", () => {
    const result = handlers["tasks:create"]({
      title: "Valid Title",
      description: null,
      priority: "urgent" as never,
      status: "todo",
      estimatedMinutes: 10,
      actualMinutes: null,
      isRecurringChild: false,
      recurringRuleId: null,
      scheduledDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("tasks:update", () => {
  it("updates a task", () => {
    const create = handlers["tasks:create"]({
      title: "Original",
      description: null,
      priority: "low",
      status: "todo",
      estimatedMinutes: 15,
      actualMinutes: null,
      isRecurringChild: false,
      recurringRuleId: null,
      scheduledDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    expect(create.ok).toBe(true);
    if (!create.ok) return;

    const result = handlers["tasks:update"]({
      id: create.data.id,
      title: "Updated",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Updated");
    }
  });

  it("returns NOT_FOUND for missing id", () => {
    const result = handlers["tasks:update"]({
      id: "nonexistent",
      title: "Nope",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("tasks:delete", () => {
  it("returns NOT_FOUND for non-existent task", () => {
    const result = handlers["tasks:delete"]({ id: "nonexistent" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("deletes a task", () => {
    const create = handlers["tasks:create"]({
      title: "To Delete",
      description: null,
      priority: "medium",
      status: "todo",
      estimatedMinutes: 5,
      actualMinutes: null,
      isRecurringChild: false,
      recurringRuleId: null,
      scheduledDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    expect(create.ok).toBe(true);
    if (!create.ok) return;

    const result = handlers["tasks:delete"]({ id: create.data.id });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.success).toBe(true);
    }

    const getResult = handlers["tasks:getAll"]({});
    expect(getResult.ok).toBe(true);
    if (getResult.ok) {
      expect(getResult.data).toHaveLength(0);
    }
  });
});

describe("timer and ai stubs", () => {
  it("timer:start returns NOT_IMPLEMENTED", () => {
    const result = handlers["timer:start"]({ taskId: "abc" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_IMPLEMENTED");
  });

  it("timer:pause returns NOT_IMPLEMENTED", () => {
    const result = handlers["timer:pause"]({ taskId: "abc" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_IMPLEMENTED");
  });

  it("ai:generatePlan returns NOT_IMPLEMENTED", () => {
    const result = handlers["ai:generatePlan"]({
      focusHours: 4,
      primaryGoal: "Build feature",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_IMPLEMENTED");
  });

  it("ai:generateReport returns NOT_IMPLEMENTED", () => {
    const result = handlers["ai:generateReport"]({ timeframeDays: 7 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_IMPLEMENTED");
  });
});

describe("key: stubs", () => {
  it("key:get returns hasKey false when no key stored", () => {
    const result = handlers["key:get"]({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.hasKey).toBe(false);
    }
  });
});
