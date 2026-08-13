import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import Database from "better-sqlite3";

const getDbFn = vi.fn<() => Database.Database>();
vi.mock("../database", () => ({
  getDb: () => getDbFn(),
  initDb: () => getDbFn(),
}));

import { createTask, updateTask, getTasks } from "../task-repository";

let db: Database.Database;

function createTable(db: Database.Database) {
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
    )
  `);
}

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  createTable(db);
  getDbFn.mockReturnValue(db);
});

afterAll(() => {
  db?.close();
});

const DEFAULT_INPUT = {
  title: "Test Description Task",
  priority: "medium" as const,
  estimatedMinutes: 30,
};

describe("Task Repository — Description", () => {
  describe("createTask", () => {
    it("creates task with a valid description", () => {
      const task = createTask({
        ...DEFAULT_INPUT,
        description: "A detailed description with some notes.",
      });

      expect(task.description).toBe("A detailed description with some notes.");
      expect(task.title).toBe("Test Description Task");
    });

    it("creates task with null description", () => {
      const task = createTask({
        ...DEFAULT_INPUT,
        description: null,
      });

      expect(task.description).toBeNull();
    });

    it("creates task with empty string description", () => {
      const task = createTask({
        ...DEFAULT_INPUT,
        description: "",
      });

      expect(task.description).toBe("");
    });

    it("creates task with undefined description (omitted)", () => {
      const task = createTask({ ...DEFAULT_INPUT });

      expect(task.description).toBeNull();
    });

    it("throws VALIDATION_ERROR when description exceeds 100,000 characters", () => {
      expect(() =>
        createTask({
          ...DEFAULT_INPUT,
          description: "x".repeat(100001),
        }),
      ).toThrow(/Description must be a string with max 100,000 characters/);
    });

    it("throws error with code VALIDATION_ERROR for oversized description", () => {
      try {
        createTask({
          ...DEFAULT_INPUT,
          description: "x".repeat(100001),
        });
        expect.fail("Should have thrown");
      } catch (err: unknown) {
        expect((err as { code: string }).code).toBe("VALIDATION_ERROR");
      }
    });

    it("accepts description exactly at 100,000 character limit", () => {
      const content = "x".repeat(100000);
      const task = createTask({
        ...DEFAULT_INPUT,
        description: content,
      });

      expect(task.description).toBe(content);
      expect(task.description).toHaveLength(100000);
    });

    it("persists description with special characters and markdown", () => {
      const md =
        "# Heading\n\n- Item 1\n- Item 2\n\n**Bold text** and _italic_";
      const task = createTask({
        ...DEFAULT_INPUT,
        description: md,
      });

      const all = getTasks();
      const found = all.find((t) => t.id === task.id);
      expect(found?.description).toBe(md);
    });

    it("persists description with HTML content", () => {
      const html = "<p>Hello <strong>world</strong></p>";
      const task = createTask({
        ...DEFAULT_INPUT,
        description: html,
      });

      const all = getTasks();
      const found = all.find((t) => t.id === task.id);
      expect(found?.description).toBe(html);
    });
  });

  describe("updateTask — description", () => {
    it("updates description on an existing task", () => {
      const task = createTask({
        ...DEFAULT_INPUT,
        description: "Original description",
      });

      const updated = updateTask({
        id: task.id,
        description: "Updated description",
      });

      expect(updated.description).toBe("Updated description");
    });

    it("sets description to null on update", () => {
      const task = createTask({
        ...DEFAULT_INPUT,
        description: "Will be cleared",
      });

      const updated = updateTask({
        id: task.id,
        description: null,
      });

      expect(updated.description).toBeNull();
    });

    it("sets description to empty string on update", () => {
      const task = createTask({
        ...DEFAULT_INPUT,
        description: "Will be emptied",
      });

      const updated = updateTask({
        id: task.id,
        description: "",
      });

      expect(updated.description).toBe("");
    });

    it("throws VALIDATION_ERROR when updating description beyond 100k limit", () => {
      const task = createTask({
        ...DEFAULT_INPUT,
        description: "Short",
      });

      expect(() =>
        updateTask({
          id: task.id,
          description: "x".repeat(100001),
        }),
      ).toThrow(/Description must be a string with max 100,000 characters/);
    });

    it("preserves existing description when not included in patch", () => {
      const task = createTask({
        ...DEFAULT_INPUT,
        description: "Preserve me",
      });

      const updated = updateTask({ id: task.id, title: "New Title" });

      expect(updated.description).toBe("Preserve me");
    });
  });

  describe("getTasks — description search", () => {
    it("matches query against description content", () => {
      createTask({
        ...DEFAULT_INPUT,
        title: "Task A",
        description: "This has unique keyword xyz123",
      });
      createTask({
        ...DEFAULT_INPUT,
        title: "Task B",
        description: "Nothing relevant",
      });

      const results = getTasks({ query: "xyz123" });

      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe("Task A");
    });

    it("matches query against title OR description", () => {
      createTask({
        ...DEFAULT_INPUT,
        title: "KeywordTask",
        description: "No match here",
      });
      createTask({
        ...DEFAULT_INPUT,
        title: "Unrelated Task",
        description: "Contains keyword somewhere",
      });

      const results = getTasks({ query: "keyword" });

      expect(results).toHaveLength(2);
    });

    it("returns empty array when query matches neither title nor description", () => {
      createTask({
        ...DEFAULT_INPUT,
        title: "Task One",
        description: "Regular description",
      });

      const results = getTasks({ query: "nonexistent9911" });

      expect(results).toHaveLength(0);
    });

    it("matches partial text in description (LIKE search)", () => {
      createTask({
        ...DEFAULT_INPUT,
        title: "Test",
        description: "Something important about project alpha",
      });

      const results = getTasks({ query: "alpha" });

      expect(results).toHaveLength(1);
    });

    it("combines description search with status filter", () => {
      const task = createTask({
        ...DEFAULT_INPUT,
        title: "Visible Task",
        description: "Find me by status",
      });

      const results = getTasks({ query: "Find me", status: "todo" });

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(task.id);
    });
  });
});
