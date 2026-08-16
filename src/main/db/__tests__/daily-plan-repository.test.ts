import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import Database from "better-sqlite3";
import type { DailyPlanSchedule } from "@/shared/models";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

let db: Database.Database;

async function getRepo() {
  return await import("../daily-plan-repository");
}

const schedule: DailyPlanSchedule = {
  date: 1723536000000,
  focusHours: 6,
  primaryGoal: "Ship it",
  schedule: [],
  unscheduledTasks: [],
  summary: "A focused day.",
};

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");

  db.exec(`
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

describe("daily-plan-repository", () => {
  it("returns null when no plan exists for the date", async () => {
    const repo = await getRepo();
    expect(repo.getPlanForDate(1723536000000)).toBeNull();
  });

  it("saves an approved plan and reads it back", async () => {
    const repo = await getRepo();
    const saved = repo.saveApprovedPlan(schedule, 1723536000000);

    expect(saved.isApproved).toBe(true);
    expect(saved.focusHours).toBe(6);
    expect(JSON.parse(saved.planJson)).toEqual(schedule);

    const loaded = repo.getPlanForDate(1723536000000);
    expect(loaded?.id).toBe(saved.id);
    expect(loaded?.isApproved).toBe(true);
  });

  it("upserts so only one plan exists per date", async () => {
    const repo = await getRepo();
    const first = repo.saveApprovedPlan(schedule, 1723536000000);
    const second = repo.saveApprovedPlan(
      { ...schedule, summary: "Revised." },
      1723536000000,
    );

    expect(second.id).toBe(first.id);

    const rows = db
      .prepare("SELECT COUNT(*) AS count FROM daily_plans WHERE date = ?")
      .get(1723536000000) as { count: number };
    expect(rows.count).toBe(1);

    const loaded = repo.getPlanForDate(1723536000000);
    expect(JSON.parse(loaded?.planJson ?? "{}").summary).toBe("Revised.");
  });
});
