import { getDb } from "./database";
import type { PerformanceReport } from "@/shared/models";
import { randomUUID } from "crypto";

interface PerformanceReportRow {
  id: string;
  timeframe_start: number;
  timeframe_end: number;
  report_json: string;
  prompt_version: string;
  created_at: number;
}

function rowToReport(row: PerformanceReportRow): PerformanceReport {
  return {
    id: row.id,
    timeframeStart: row.timeframe_start,
    timeframeEnd: row.timeframe_end,
    reportJson: row.report_json,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
  };
}

export function saveReport(
  reportJson: string,
  timeframeStart: number,
  timeframeEnd: number,
  promptVersion: string,
): PerformanceReport {
  const db = getDb();
  const now = Date.now();

  const existing = db
    .prepare(
      "SELECT id FROM performance_reports WHERE timeframe_start = ? AND timeframe_end = ?",
    )
    .get(timeframeStart, timeframeEnd) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE performance_reports SET report_json = ?, prompt_version = ?, created_at = ? WHERE id = ?`,
    ).run(reportJson, promptVersion, now, existing.id);
    const row = db
      .prepare("SELECT * FROM performance_reports WHERE id = ?")
      .get(existing.id) as PerformanceReportRow;
    return rowToReport(row);
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO performance_reports (id, timeframe_start, timeframe_end, report_json, prompt_version, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, timeframeStart, timeframeEnd, reportJson, promptVersion, now);

  const row = db
    .prepare("SELECT * FROM performance_reports WHERE id = ?")
    .get(id) as PerformanceReportRow;
  return rowToReport(row);
}

export function findByTimeframe(
  timeframeStart: number,
  timeframeEnd: number,
): PerformanceReport | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM performance_reports WHERE timeframe_start = ? AND timeframe_end = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(timeframeStart, timeframeEnd) as PerformanceReportRow | undefined;
  return row ? rowToReport(row) : null;
}

export function getById(id: string): PerformanceReport | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM performance_reports WHERE id = ?")
    .get(id) as PerformanceReportRow | undefined;
  return row ? rowToReport(row) : null;
}

export function listAll(): PerformanceReport[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM performance_reports ORDER BY created_at DESC")
    .all() as PerformanceReportRow[];
  return rows.map(rowToReport);
}

export function deleteById(id: string): boolean {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM performance_reports WHERE id = ?")
    .run(id);
  return result.changes > 0;
}
