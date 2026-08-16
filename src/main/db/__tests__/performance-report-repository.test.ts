import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import Database from "better-sqlite3";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../database", () => ({
  getDb: () => testDbReady(),
  initDb: () => testDbReady(),
}));

let db: Database.Database;

async function getRepo() {
  return await import("../performance-report-repository");
}

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS performance_reports (
      id TEXT PRIMARY KEY,
      timeframe_start INTEGER NOT NULL,
      timeframe_end INTEGER NOT NULL,
      report_json TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  testDbReady.mockReturnValue(db);
});

afterAll(() => {
  if (db && db.open) db.close();
});

describe("performance-report-repository", () => {
  it("saves a report and reads it back by id", async () => {
    const repo = await getRepo();
    const saved = repo.saveReport("{}", 1000, 2000, "v1");

    expect(saved.id).toBeTruthy();
    expect(saved.timeframeStart).toBe(1000);
    expect(saved.timeframeEnd).toBe(2000);
    expect(saved.reportJson).toBe("{}");
    expect(saved.promptVersion).toBe("v1");
    expect(saved.createdAt).toBeGreaterThan(0);

    const loaded = repo.getById(saved.id);
    expect(loaded?.id).toBe(saved.id);
    expect(loaded?.reportJson).toBe("{}");
  });

  it("upserts so only one report exists per timeframe", async () => {
    const repo = await getRepo();
    const first = repo.saveReport('{"a":1}', 1000, 2000, "v1");
    const second = repo.saveReport('{"a":2}', 1000, 2000, "v1");

    expect(second.id).toBe(first.id);
    expect(second.reportJson).toBe('{"a":2}');

    const rows = db
      .prepare(
        "SELECT COUNT(*) AS count FROM performance_reports WHERE timeframe_start = ? AND timeframe_end = ?",
      )
      .get(1000, 2000) as { count: number };
    expect(rows.count).toBe(1);
  });

  it("finds a report by exact timeframe", async () => {
    const repo = await getRepo();
    repo.saveReport("{}", 1000, 2000, "v1");
    repo.saveReport("{}", 3000, 4000, "v1");

    const found = repo.findByTimeframe(3000, 4000);
    expect(found?.timeframeStart).toBe(3000);

    expect(repo.findByTimeframe(999, 1001)).toBeNull();
  });

  it("lists reports newest first", async () => {
    const repo = await getRepo();
    db.prepare(
      `INSERT INTO performance_reports (id, timeframe_start, timeframe_end, report_json, prompt_version, created_at)
       VALUES ('older', 1000, 2000, '{}', 'v1', 5000)`,
    ).run();
    db.prepare(
      `INSERT INTO performance_reports (id, timeframe_start, timeframe_end, report_json, prompt_version, created_at)
       VALUES ('newer', 3000, 4000, '{}', 'v1', 9000)`,
    ).run();

    const list = repo.listAll();
    expect(list.map((r) => r.id)).toEqual(["newer", "older"]);
  });

  it("deletes a report by id", async () => {
    const repo = await getRepo();
    const saved = repo.saveReport("{}", 1000, 2000, "v1");

    expect(repo.deleteById(saved.id)).toBe(true);
    expect(repo.getById(saved.id)).toBeNull();
    expect(repo.deleteById(saved.id)).toBe(false);
  });
});
