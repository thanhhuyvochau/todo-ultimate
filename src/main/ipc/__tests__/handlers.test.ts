import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import Database from "better-sqlite3";
import { handlers } from "../handlers";
import * as timerService from "../../services/timer-service";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../../db/database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

vi.mock("../../services/keychain-service", () => ({
  isApiKeySet: () => false,
  setApiKey: () => undefined,
  deleteApiKey: () => undefined,
  getApiKey: () => null,
  isEncryptionAvailable: () => true,
}));

const mockTestConnection = vi.fn<() => Promise<boolean>>();

vi.mock("../../services/deepseekService", () => ({
  testConnection: () => mockTestConnection(),
}));

const mockGeneratePlan = vi.fn();

vi.mock("../../services/daily-plan-service", () => ({
  generateDailyPlan: (...args: unknown[]) => mockGeneratePlan(...args),
}));

const mockGenerateReport = vi.fn();
const mockListReports = vi.fn();
const mockGetCachedReport = vi.fn();
const mockDeleteReport = vi.fn();

vi.mock("../../services/report-service", () => ({
  generateReport: (...args: unknown[]) => mockGenerateReport(...args),
  listReports: (...args: unknown[]) => mockListReports(...args),
  getCachedReport: (...args: unknown[]) => mockGetCachedReport(...args),
  deleteReport: (...args: unknown[]) => mockDeleteReport(...args),
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

afterEach(() => {
  timerService.stopTimerEngine();
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

  it("filters by priority", () => {
    handlers["tasks:create"]({
      title: "High Task",
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
    handlers["tasks:create"]({
      title: "Low Task",
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

    const result = handlers["tasks:getAll"]({ priority: "high" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.priority).toBe("high");
    }
  });

  it("filters by search query", () => {
    handlers["tasks:create"]({
      title: "Buy groceries",
      description: null,
      priority: "medium",
      status: "todo",
      estimatedMinutes: 20,
      actualMinutes: null,
      isRecurringChild: false,
      recurringRuleId: null,
      scheduledDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    handlers["tasks:create"]({
      title: "Write report",
      description: null,
      priority: "medium",
      status: "todo",
      estimatedMinutes: 60,
      actualMinutes: null,
      isRecurringChild: false,
      recurringRuleId: null,
      scheduledDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = handlers["tasks:getAll"]({ query: "groceries" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.title).toBe("Buy groceries");
    }
  });

  it("filters by status and priority combined", () => {
    handlers["tasks:create"]({
      title: "High todo",
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
    handlers["tasks:create"]({
      title: "Low todo",
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

    const result = handlers["tasks:getAll"]({
      status: "todo",
      priority: "low",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.priority).toBe("low");
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

  it("rejects description over 100,000 characters", () => {
    const result = handlers["tasks:create"]({
      title: "Valid Title",
      description: "x".repeat(100001),
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

  it("rejects empty title on update", () => {
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
      title: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects invalid priority on update", () => {
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
      priority: "urgent" as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects invalid estimatedMinutes on update", () => {
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
      estimatedMinutes: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects description over 100,000 characters on update", () => {
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
      description: "x".repeat(100001),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
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

describe("ai stubs", () => {
  it("ai:generatePlan returns the schedule on success", async () => {
    const schedule = {
      date: 1723536000000,
      focusHours: 6,
      primaryGoal: "Ship the feature",
      schedule: [],
      unscheduledTasks: [],
      summary: "A focused day.",
    };
    mockGeneratePlan.mockResolvedValueOnce(schedule);

    const result = await handlers["ai:generatePlan"]({
      focusHours: 6,
      primaryGoal: "Ship the feature",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(schedule);
  });

  it("ai:generatePlan maps AI_AUTH_FAILED", async () => {
    mockGeneratePlan.mockRejectedValueOnce(
      Object.assign(new Error("No API key configured."), {
        code: "AI_AUTH_FAILED",
      }),
    );

    const result = await handlers["ai:generatePlan"]({
      focusHours: 6,
      primaryGoal: "Ship the feature",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("AI_AUTH_FAILED");
  });

  it("ai:generatePlan maps VALIDATION_ERROR", async () => {
    mockGeneratePlan.mockRejectedValueOnce(
      Object.assign(new Error("Focus hours must be a positive number."), {
        code: "VALIDATION_ERROR",
      }),
    );

    const result = await handlers["ai:generatePlan"]({
      focusHours: 0,
      primaryGoal: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("ai:generateReport returns the report on success", async () => {
    const report = {
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
    mockGenerateReport.mockResolvedValueOnce(report);

    const result = await handlers["ai:generateReport"]({
      timeframeStart: 1000,
      timeframeEnd: 2000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(report);
  });

  it("ai:generateReport maps AI_AUTH_FAILED", async () => {
    mockGenerateReport.mockRejectedValueOnce(
      Object.assign(new Error("No API key configured."), {
        code: "AI_AUTH_FAILED",
      }),
    );

    const result = await handlers["ai:generateReport"]({
      timeframeStart: 1000,
      timeframeEnd: 2000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("AI_AUTH_FAILED");
  });

  it("ai:generateReport maps VALIDATION_ERROR", async () => {
    mockGenerateReport.mockRejectedValueOnce(
      Object.assign(new Error("Invalid report timeframe."), {
        code: "VALIDATION_ERROR",
      }),
    );

    const result = await handlers["ai:generateReport"]({
      timeframeStart: 2000,
      timeframeEnd: 1000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("ai:testConnection", () => {
  it("returns success true when connection works", async () => {
    mockTestConnection.mockResolvedValue(true);
    const result = await handlers["ai:testConnection"]({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.success).toBe(true);
    }
  });

  it("returns success false when connection fails", async () => {
    mockTestConnection.mockResolvedValue(false);
    const result = await handlers["ai:testConnection"]({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.success).toBe(false);
    }
  });
});

describe("report handlers", () => {
  const summary = {
    id: "r1",
    timeframeStart: 1000,
    timeframeEnd: 2000,
    promptVersion: "v1",
    createdAt: 5000,
    efficiencyScore: 72,
    totalCompleted: 3,
  };

  it("report:list returns cached report summaries", () => {
    mockListReports.mockReturnValueOnce([summary]);

    const result = handlers["report:list"]({});

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([summary]);
  });

  it("report:list maps read failures to DB_READ_FAILED", () => {
    mockListReports.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const result = handlers["report:list"]({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DB_READ_FAILED");
  });

  it("report:get returns the cached report content", () => {
    const report = {
      timeframe: { start: 1000, end: 2000 },
      generatedAt: 5000,
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
      summary: "Great job.",
    };
    mockGetCachedReport.mockReturnValueOnce(report);

    const result = handlers["report:get"]({ id: "r1" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(report);
  });

  it("report:get maps NOT_FOUND", () => {
    mockGetCachedReport.mockImplementationOnce(() => {
      throw Object.assign(new Error("Cached report not found."), {
        code: "NOT_FOUND",
      });
    });

    const result = handlers["report:get"]({ id: "missing" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });

  it("report:get maps REPORT_CORRUPTED", () => {
    mockGetCachedReport.mockImplementationOnce(() => {
      throw Object.assign(new Error("Cached report is corrupted."), {
        code: "REPORT_CORRUPTED",
      });
    });

    const result = handlers["report:get"]({ id: "r1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REPORT_CORRUPTED");
  });

  it("report:delete returns success", () => {
    mockDeleteReport.mockReturnValueOnce({ success: true });

    const result = handlers["report:delete"]({ id: "r1" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.success).toBe(true);
  });

  it("report:delete maps NOT_FOUND", () => {
    mockDeleteReport.mockImplementationOnce(() => {
      throw Object.assign(new Error("Cached report not found."), {
        code: "NOT_FOUND",
      });
    });

    const result = handlers["report:delete"]({ id: "missing" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("key handlers", () => {
  it("key:get returns hasKey false when no key stored", () => {
    const result = handlers["key:get"]({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.hasKey).toBe(false);
    }
  });

  it("key:set returns success", () => {
    const result = handlers["key:set"]({ apiKey: "test-key" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.success).toBe(true);
    }
  });

  it("key:delete returns success", () => {
    const result = handlers["key:delete"]({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.success).toBe(true);
    }
  });
});

describe("recurring rule handlers", () => {
  it("recurring:getAll returns empty array initially", () => {
    const result = handlers["recurring:getAll"]({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });

  it("recurring:create creates a daily rule", () => {
    const result = handlers["recurring:create"]({
      title: "Morning Standup",
      description: null,
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

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Morning Standup");
      expect(result.data.frequency).toBe("daily");
      expect(typeof result.data.id).toBe("string");
    }
  });

  it("recurring:create creates a weekly rule with days", () => {
    const result = handlers["recurring:create"]({
      title: "Gym",
      description: null,
      priority: "medium",
      estimatedMinutes: 60,
      frequency: "weekly",
      timeAnchor: null,
      daysOfWeek: [1, 3, 5],
      dayOfMonth: null,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.frequency).toBe("weekly");
      expect(result.data.daysOfWeek).toEqual([1, 3, 5]);
    }
  });

  it("recurring:create creates a monthly rule", () => {
    const result = handlers["recurring:create"]({
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

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.frequency).toBe("monthly");
      expect(result.data.dayOfMonth).toBe(15);
    }
  });

  it("recurring:create rejects empty title", () => {
    const result = handlers["recurring:create"]({
      title: "",
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

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("recurring:create rejects weekly without days", () => {
    const result = handlers["recurring:create"]({
      title: "Weekender",
      description: null,
      priority: "low",
      estimatedMinutes: 20,
      frequency: "weekly",
      timeAnchor: null,
      daysOfWeek: [],
      dayOfMonth: null,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("recurring:update updates a rule", () => {
    const create = handlers["recurring:create"]({
      title: "Original",
      description: null,
      priority: "low",
      estimatedMinutes: 15,
      frequency: "daily",
      timeAnchor: null,
      daysOfWeek: null,
      dayOfMonth: null,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });
    expect(create.ok).toBe(true);
    if (!create.ok) return;

    const result = handlers["recurring:update"]({
      id: create.data.id,
      title: "Updated",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Updated");
    }
  });

  it("recurring:update returns NOT_FOUND for missing id", () => {
    const result = handlers["recurring:update"]({
      id: "nonexistent",
      title: "Nope",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("recurring:delete deletes a rule", () => {
    const create = handlers["recurring:create"]({
      title: "To Delete",
      description: null,
      priority: "medium",
      estimatedMinutes: 5,
      frequency: "daily",
      timeAnchor: null,
      daysOfWeek: null,
      dayOfMonth: null,
      isActive: true,
      lastInstantiatedDate: null,
      createdAt: Date.now(),
    });
    expect(create.ok).toBe(true);
    if (!create.ok) return;

    const result = handlers["recurring:delete"]({ id: create.data.id });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.success).toBe(true);
    }

    const getAll = handlers["recurring:getAll"]({});
    expect(getAll.ok).toBe(true);
    if (getAll.ok) {
      expect(getAll.data).toHaveLength(0);
    }
  });

  it("recurring:delete returns NOT_FOUND for missing id", () => {
    const result = handlers["recurring:delete"]({ id: "nonexistent" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("recurring:toggle toggles active state", () => {
    const create = handlers["recurring:create"]({
      title: "Toggle Me",
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
    expect(create.ok).toBe(true);
    if (!create.ok) return;
    expect(create.data.isActive).toBe(true);

    const toggle = handlers["recurring:toggle"]({ id: create.data.id });
    expect(toggle.ok).toBe(true);
    if (toggle.ok) {
      expect(toggle.data.isActive).toBe(false);
    }

    const toggleBack = handlers["recurring:toggle"]({ id: create.data.id });
    expect(toggleBack.ok).toBe(true);
    if (toggleBack.ok) {
      expect(toggleBack.data.isActive).toBe(true);
    }
  });

  it("recurring:toggle returns NOT_FOUND for missing id", () => {
    const result = handlers["recurring:toggle"]({ id: "nonexistent" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("timer IPC handlers", () => {
  it("timer:start starts timer and timer:getActive returns active state", () => {
    const taskRes = handlers["tasks:create"]({
      title: "Timer Task",
      description: null,
      priority: "high",
      status: "todo",
      estimatedMinutes: 20,
      actualMinutes: null,
      isRecurringChild: false,
      recurringRuleId: null,
      scheduledDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    expect(taskRes.ok).toBe(true);
    if (!taskRes.ok) return;

    const startRes = handlers["timer:start"]({ taskId: taskRes.data.id });
    expect(startRes.ok).toBe(true);
    if (startRes.ok) {
      expect(startRes.data.logId).toBeDefined();
    }

    const activeRes = handlers["timer:getActive"]({});
    expect(activeRes.ok).toBe(true);
    if (activeRes.ok) {
      expect(activeRes.data?.taskId).toBe(taskRes.data.id);
    }
  });

  it("timer:pause pauses current timer", () => {
    const taskRes = handlers["tasks:create"]({
      title: "Pause Task",
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
    if (!taskRes.ok) return;

    handlers["timer:start"]({ taskId: taskRes.data.id });

    const pauseRes = handlers["timer:pause"]({ taskId: taskRes.data.id });
    expect(pauseRes.ok).toBe(true);
    if (pauseRes.ok) {
      expect(pauseRes.data.durationMinutes).toBeDefined();
    }

    const activeRes = handlers["timer:getActive"]({});
    expect(activeRes.ok).toBe(true);
    if (activeRes.ok) {
      expect(activeRes.data).toBeNull();
    }
  });
});

describe("metrics handlers", () => {
  it("metrics:getVariance returns empty metrics when no completed tasks", () => {
    const result = handlers["metrics:getVariance"]({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totalCompleted).toBe(0);
      expect(result.data.overallMeanVariance).toBe(0);
      expect(result.data.byPriority.high.count).toBe(0);
    }
  });

  it("metrics:getVariance computes variance for completed tasks", () => {
    db.prepare(
      `
      INSERT INTO tasks (id, title, priority, status, estimated_minutes, actual_minutes, is_recurring_child, completed_at, created_at, updated_at)
      VALUES ('var-1', 'Variance Task', 'high', 'completed', 30, 45, 0, 2000, 1000, 1000)
    `,
    ).run();

    const result = handlers["metrics:getVariance"]({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totalCompleted).toBe(1);
      expect(result.data.overallMeanVariance).toBe(15);
      expect(result.data.underestimationRate).toBe(1);
    }
  });

  it("metrics:getTaskVariance returns null for unknown task", () => {
    const result = handlers["metrics:getTaskVariance"]({ taskId: "nope" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it("tasks:update to completed stamps completed_at", () => {
    const create = handlers["tasks:create"]({
      title: "To Complete",
      description: null,
      priority: "medium",
      status: "todo",
      estimatedMinutes: 30,
      actualMinutes: null,
      isRecurringChild: false,
      recurringRuleId: null,
      scheduledDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    expect(create.ok).toBe(true);
    if (!create.ok) return;

    db.prepare("UPDATE tasks SET actual_minutes = 45 WHERE id = ?").run(
      create.data.id,
    );

    const start = handlers["tasks:update"]({
      id: create.data.id,
      status: "in_progress",
    });
    expect(start.ok).toBe(true);

    const update = handlers["tasks:update"]({
      id: create.data.id,
      status: "completed",
    });
    expect(update.ok).toBe(true);

    const row = db
      .prepare("SELECT completed_at FROM tasks WHERE id = ?")
      .get(create.data.id) as { completed_at: number | null };
    expect(row.completed_at).not.toBeNull();
  });
});

describe("plan handlers", () => {
  function startOfToday(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  it("plan:getToday returns null when no plan exists", () => {
    const result = handlers["plan:getToday"]({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it("plan:approve schedules tasks and returns the approved plan", () => {
    const create = handlers["tasks:create"]({
      title: "Write code",
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
    expect(create.ok).toBe(true);
    if (!create.ok) return;

    const schedule = {
      date: startOfToday(),
      focusHours: 6,
      primaryGoal: "Ship it",
      schedule: [
        {
          taskId: create.data.id,
          title: "Write code",
          priority: "high",
          estimatedMinutes: 30,
          budgetedMinutes: 25,
          scheduledStart: startOfToday() + 9 * 60 * 60 * 1000,
          isFixed: false,
          rationale: "High priority first.",
        },
      ],
      unscheduledTasks: [],
      summary: "A focused day.",
    };

    const result = handlers["plan:approve"]({ schedule });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.isApproved).toBe(true);
    }

    const row = db
      .prepare("SELECT scheduled_date FROM tasks WHERE id = ?")
      .get(create.data.id) as { scheduled_date: number | null };
    expect(row.scheduled_date).toBe(startOfToday());
  });

  it("plan:approve returns VALIDATION_ERROR for non-positive focus hours", () => {
    const result = handlers["plan:approve"]({
      schedule: {
        date: startOfToday(),
        focusHours: 0,
        primaryGoal: "",
        schedule: [],
        unscheduledTasks: [],
        summary: "",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("plan:approve returns NOT_FOUND for a missing task", () => {
    const result = handlers["plan:approve"]({
      schedule: {
        date: startOfToday(),
        focusHours: 6,
        primaryGoal: "Ship it",
        schedule: [
          {
            taskId: "missing-task",
            title: "Ghost",
            priority: "high",
            estimatedMinutes: 30,
            budgetedMinutes: 30,
            scheduledStart: startOfToday() + 9 * 60 * 60 * 1000,
            isFixed: false,
            rationale: "Nope.",
          },
        ],
        unscheduledTasks: [],
        summary: "Nope.",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});
