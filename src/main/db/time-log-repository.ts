import { getDb } from "./database";
import type { TimeLog } from "@/shared/models";
import { randomUUID } from "crypto";

interface TimeLogRow {
  id: string;
  task_id: string;
  started_at: number;
  paused_at: number | null;
  duration_minutes: number | null;
}

function rowToTimeLog(row: TimeLogRow): TimeLog {
  return {
    id: row.id,
    taskId: row.task_id,
    startedAt: row.started_at,
    pausedAt: row.paused_at,
    durationMinutes: row.duration_minutes,
  };
}

export function createTimeLog(taskId: string, startedAt?: number): TimeLog {
  const db = getDb();
  const id = randomUUID();
  const startTime = startedAt ?? Date.now();

  const stmt = db.prepare(`
    INSERT INTO task_time_logs (id, task_id, started_at, paused_at, duration_minutes)
    VALUES (?, ?, ?, NULL, NULL)
  `);
  stmt.run(id, taskId, startTime);

  const row = db
    .prepare("SELECT * FROM task_time_logs WHERE id = ?")
    .get(id) as TimeLogRow;
  return rowToTimeLog(row);
}

export function pauseTimeLog(logId: string, pausedAt?: number): TimeLog {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM task_time_logs WHERE id = ?")
    .get(logId) as TimeLogRow | undefined;

  if (!existing) {
    throw Object.assign(new Error("Time log not found."), { code: "NOT_FOUND" });
  }

  const pauseTime = pausedAt ?? Date.now();
  const durationMs = Math.max(0, pauseTime - existing.started_at);
  const durationMinutes = Math.round(durationMs / 60000);

  const stmt = db.prepare(`
    UPDATE task_time_logs
    SET paused_at = ?, duration_minutes = ?
    WHERE id = ?
  `);
  stmt.run(pauseTime, durationMinutes, logId);

  // Update actual_minutes on tasks table as total accumulated duration
  updateTaskActualMinutes(existing.task_id);

  const row = db
    .prepare("SELECT * FROM task_time_logs WHERE id = ?")
    .get(logId) as TimeLogRow;
  return rowToTimeLog(row);
}

export function getUnclosedTimeLog(taskId?: string): TimeLog | null {
  const db = getDb();
  if (taskId) {
    const row = db
      .prepare(
        "SELECT * FROM task_time_logs WHERE task_id = ? AND paused_at IS NULL ORDER BY started_at DESC LIMIT 1",
      )
      .get(taskId) as TimeLogRow | undefined;
    return row ? rowToTimeLog(row) : null;
  }

  const row = db
    .prepare(
      "SELECT * FROM task_time_logs WHERE paused_at IS NULL ORDER BY started_at DESC LIMIT 1",
    )
    .get() as TimeLogRow | undefined;
  return row ? rowToTimeLog(row) : null;
}

export function getTimeLogsForTask(taskId: string): TimeLog[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM task_time_logs WHERE task_id = ? ORDER BY started_at ASC",
    )
    .all(taskId) as TimeLogRow[];
  return rows.map(rowToTimeLog);
}

export function updateTaskActualMinutes(taskId: string): number {
  const db = getDb();
  const result = db
    .prepare(
      "SELECT COALESCE(SUM(duration_minutes), 0) as total FROM task_time_logs WHERE task_id = ? AND duration_minutes IS NOT NULL",
    )
    .get(taskId) as { total: number };

  const totalMinutes = result.total;
  db.prepare("UPDATE tasks SET actual_minutes = ? WHERE id = ?").run(
    totalMinutes,
    taskId,
  );
  return totalMinutes;
}
