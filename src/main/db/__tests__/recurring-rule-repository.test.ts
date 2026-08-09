import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import Database from "better-sqlite3";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

let db: Database.Database;

async function getRepo() {
  return await import("../recurring-rule-repository");
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

describe("recurring-rule-repository", () => {
  describe("getAllRules", () => {
    it("returns empty array when no rules", async () => {
      const repo = await getRepo();
      expect(repo.getAllRules()).toEqual([]);
    });

    it("returns rules in created_at DESC order", async () => {
      const repo = await getRepo();
      const r1 = repo.createRule({
        title: "Rule 1",
        description: null,
        priority: "high",
        estimatedMinutes: 30,
        frequency: "daily",
        timeAnchor: null,
        daysOfWeek: null,
        dayOfMonth: null,
        isActive: true,
        lastInstantiatedDate: null,
        createdAt: 1000,
      });
      const r2 = repo.createRule({
        title: "Rule 2",
        description: null,
        priority: "low",
        estimatedMinutes: 15,
        frequency: "weekly",
        timeAnchor: null,
        daysOfWeek: [1, 3],
        dayOfMonth: null,
        isActive: true,
        lastInstantiatedDate: null,
        createdAt: 2000,
      });

      const rules = repo.getAllRules();
      expect(rules).toHaveLength(2);
      expect(rules[0]!.createdAt).toBeGreaterThanOrEqual(rules[1]!.createdAt);
    });
  });

  describe("createRule", () => {
    it("creates a daily rule", async () => {
      const repo = await getRepo();
      const rule = repo.createRule({
        title: "Morning Standup",
        description: "Daily team sync",
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

      expect(rule.id).toBeTruthy();
      expect(rule.title).toBe("Morning Standup");
      expect(rule.priority).toBe("high");
      expect(rule.estimatedMinutes).toBe(30);
      expect(rule.frequency).toBe("daily");
      expect(rule.isActive).toBe(true);
      expect(rule.daysOfWeek).toBeNull();
      expect(rule.dayOfMonth).toBeNull();
    });

    it("creates a weekly rule with days", async () => {
      const repo = await getRepo();
      const rule = repo.createRule({
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

      expect(rule.frequency).toBe("weekly");
      expect(rule.daysOfWeek).toEqual([1, 3, 5]);
    });

    it("creates a monthly rule with day", async () => {
      const repo = await getRepo();
      const rule = repo.createRule({
        title: "Rent Payment",
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

      expect(rule.frequency).toBe("monthly");
      expect(rule.dayOfMonth).toBe(15);
    });

    it("stores time anchor", async () => {
      const repo = await getRepo();
      const d = new Date();
      d.setHours(20, 0, 0, 0);
      const rule = repo.createRule({
        title: "Evening Read",
        description: null,
        priority: "low",
        estimatedMinutes: 30,
        frequency: "daily",
        timeAnchor: d.getTime(),
        daysOfWeek: null,
        dayOfMonth: null,
        isActive: true,
        lastInstantiatedDate: null,
        createdAt: Date.now(),
      });

      expect(rule.timeAnchor).toBe(d.getTime());
    });

    it("rejects empty title", async () => {
      const repo = await getRepo();
      expect(() =>
        repo.createRule({
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
        }),
      ).toThrow("Title is required");
    });

    it("rejects title over 200 characters", async () => {
      const repo = await getRepo();
      expect(() =>
        repo.createRule({
          title: "a".repeat(201),
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
        }),
      ).toThrow("Title is required");
    });

    it("rejects invalid priority", async () => {
      const repo = await getRepo();
      expect(() =>
        repo.createRule({
          title: "Valid",
          description: null,
          priority: "urgent" as never,
          estimatedMinutes: 10,
          frequency: "daily",
          timeAnchor: null,
          daysOfWeek: null,
          dayOfMonth: null,
          isActive: true,
          lastInstantiatedDate: null,
          createdAt: Date.now(),
        }),
      ).toThrow("Priority");
    });

    it("rejects estimatedMinutes < 1", async () => {
      const repo = await getRepo();
      expect(() =>
        repo.createRule({
          title: "Valid",
          description: null,
          priority: "medium",
          estimatedMinutes: 0,
          frequency: "daily",
          timeAnchor: null,
          daysOfWeek: null,
          dayOfMonth: null,
          isActive: true,
          lastInstantiatedDate: null,
          createdAt: Date.now(),
        }),
      ).toThrow("Estimated minutes");
    });

    it("rejects estimatedMinutes > 1440", async () => {
      const repo = await getRepo();
      expect(() =>
        repo.createRule({
          title: "Valid",
          description: null,
          priority: "medium",
          estimatedMinutes: 1441,
          frequency: "daily",
          timeAnchor: null,
          daysOfWeek: null,
          dayOfMonth: null,
          isActive: true,
          lastInstantiatedDate: null,
          createdAt: Date.now(),
        }),
      ).toThrow("Estimated minutes");
    });

    it("rejects invalid frequency", async () => {
      const repo = await getRepo();
      expect(() =>
        repo.createRule({
          title: "Valid",
          description: null,
          priority: "medium",
          estimatedMinutes: 10,
          frequency: "weekdays" as never,
          timeAnchor: null,
          daysOfWeek: null,
          dayOfMonth: null,
          isActive: true,
          lastInstantiatedDate: null,
          createdAt: Date.now(),
        }),
      ).toThrow("Frequency");
    });

    it("rejects weekly rule without days", async () => {
      const repo = await getRepo();
      expect(() =>
        repo.createRule({
          title: "Weekly Task",
          description: null,
          priority: "medium",
          estimatedMinutes: 10,
          frequency: "weekly",
          timeAnchor: null,
          daysOfWeek: [],
          dayOfMonth: null,
          isActive: true,
          lastInstantiatedDate: null,
          createdAt: Date.now(),
        }),
      ).toThrow("Weekly frequency");
    });

    it("rejects monthly rule without dayOfMonth", async () => {
      const repo = await getRepo();
      expect(() =>
        repo.createRule({
          title: "Monthly Task",
          description: null,
          priority: "medium",
          estimatedMinutes: 10,
          frequency: "monthly",
          timeAnchor: null,
          daysOfWeek: null,
          dayOfMonth: null,
          isActive: true,
          lastInstantiatedDate: null,
          createdAt: Date.now(),
        }),
      ).toThrow("Monthly frequency");
    });

    it("rejects dayOfMonth > 31", async () => {
      const repo = await getRepo();
      expect(() =>
        repo.createRule({
          title: "Monthly Task",
          description: null,
          priority: "medium",
          estimatedMinutes: 10,
          frequency: "monthly",
          timeAnchor: null,
          daysOfWeek: null,
          dayOfMonth: 32,
          isActive: true,
          lastInstantiatedDate: null,
          createdAt: Date.now(),
        }),
      ).toThrow("dayOfMonth");
    });

    it("rejects description over 100,000 characters", async () => {
      const repo = await getRepo();
      expect(() =>
        repo.createRule({
          title: "Valid",
          description: "x".repeat(100001),
          priority: "medium",
          estimatedMinutes: 10,
          frequency: "daily",
          timeAnchor: null,
          daysOfWeek: null,
          dayOfMonth: null,
          isActive: true,
          lastInstantiatedDate: null,
          createdAt: Date.now(),
        }),
      ).toThrow("Description");
    });

    it("rejects duplicate time anchor", async () => {
      const repo = await getRepo();
      const anchor = new Date("2026-01-01T20:00:00").getTime();
      repo.createRule({
        title: "Evening Read",
        description: null,
        priority: "low",
        estimatedMinutes: 30,
        frequency: "daily",
        timeAnchor: anchor,
        daysOfWeek: null,
        dayOfMonth: null,
        isActive: true,
        lastInstantiatedDate: null,
        createdAt: Date.now(),
      });

      expect(() =>
        repo.createRule({
          title: "Evening Read 2",
          description: null,
          priority: "medium",
          estimatedMinutes: 15,
          frequency: "daily",
          timeAnchor: anchor,
          daysOfWeek: null,
          dayOfMonth: null,
          isActive: true,
          lastInstantiatedDate: null,
          createdAt: Date.now(),
        }),
      ).toThrow("Another active rule already uses this time anchor");
    });
  });

  describe("updateRule", () => {
    it("updates a rule", async () => {
      const repo = await getRepo();
      const rule = repo.createRule({
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

      const updated = repo.updateRule({ id: rule.id, title: "Updated" });
      expect(updated.title).toBe("Updated");
      expect(updated.priority).toBe("low");
    });

    it("returns NOT_FOUND for missing id", async () => {
      const repo = await getRepo();
      expect(() =>
        repo.updateRule({ id: "nonexistent", title: "Nope" }),
      ).toThrow("Recurring rule not found");
    });

    it("validates on update", async () => {
      const repo = await getRepo();
      const rule = repo.createRule({
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

      expect(() => repo.updateRule({ id: rule.id, title: "" })).toThrow(
        "Title is required",
      );
    });

    it("changes frequency from daily to weekly with days", async () => {
      const repo = await getRepo();
      const rule = repo.createRule({
        title: "Daily Task",
        description: null,
        priority: "medium",
        estimatedMinutes: 20,
        frequency: "daily",
        timeAnchor: null,
        daysOfWeek: null,
        dayOfMonth: null,
        isActive: true,
        lastInstantiatedDate: null,
        createdAt: Date.now(),
      });

      const updated = repo.updateRule({
        id: rule.id,
        frequency: "weekly",
        daysOfWeek: [1, 4],
      });
      expect(updated.frequency).toBe("weekly");
      expect(updated.daysOfWeek).toEqual([1, 4]);
    });

    it("rejects duplicate time anchor on update", async () => {
      const repo = await getRepo();
      const anchor = new Date("2026-01-01T20:00:00").getTime();
      repo.createRule({
        title: "Evening Read",
        description: null,
        priority: "low",
        estimatedMinutes: 30,
        frequency: "daily",
        timeAnchor: anchor,
        daysOfWeek: null,
        dayOfMonth: null,
        isActive: true,
        lastInstantiatedDate: null,
        createdAt: Date.now(),
      });

      const rule2 = repo.createRule({
        title: "Morning Routine",
        description: null,
        priority: "medium",
        estimatedMinutes: 15,
        frequency: "daily",
        timeAnchor: new Date("2026-01-01T08:00:00").getTime(),
        daysOfWeek: null,
        dayOfMonth: null,
        isActive: true,
        lastInstantiatedDate: null,
        createdAt: Date.now(),
      });

      expect(() =>
        repo.updateRule({ id: rule2.id, timeAnchor: anchor }),
      ).toThrow("Another active rule already uses this time anchor");
    });
  });

  describe("deleteRule", () => {
    it("deletes a rule", async () => {
      const repo = await getRepo();
      const rule = repo.createRule({
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

      const result = repo.deleteRule(rule.id);
      expect(result.success).toBe(true);
      expect(repo.getAllRules()).toHaveLength(0);
    });

    it("returns NOT_FOUND for non-existent rule", async () => {
      const repo = await getRepo();
      expect(() => repo.deleteRule("nonexistent")).toThrow(
        "Recurring rule not found",
      );
    });
  });

  describe("toggleActive", () => {
    it("toggles isActive from true to false", async () => {
      const repo = await getRepo();
      const rule = repo.createRule({
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

      expect(rule.isActive).toBe(true);
      const toggled = repo.toggleActive(rule.id);
      expect(toggled.isActive).toBe(false);
    });

    it("toggles isActive from false to true", async () => {
      const repo = await getRepo();
      const rule = repo.createRule({
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
      const toggled1 = repo.toggleActive(rule.id);
      expect(toggled1.isActive).toBe(false);

      const toggled2 = repo.toggleActive(rule.id);
      expect(toggled2.isActive).toBe(true);
    });

    it("returns NOT_FOUND for non-existent rule", async () => {
      const repo = await getRepo();
      expect(() => repo.toggleActive("nonexistent")).toThrow(
        "Recurring rule not found",
      );
    });
  });
});
