import { getDb } from "./database";
import type { Task, TaskStatus, TaskPriority } from "@/shared/models";
import { randomUUID } from "crypto";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  estimated_minutes: number;
  actual_minutes: number | null;
  is_recurring_child: number;
  recurring_rule_id: string | null;
  scheduled_date: number | null;
  created_at: number;
  updated_at: number;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    estimatedMinutes: row.estimated_minutes,
    actualMinutes: row.actual_minutes,
    isRecurringChild: row.is_recurring_child === 1,
    recurringRuleId: row.recurring_rule_id,
    scheduledDate: row.scheduled_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateTaskInput(
  title: unknown,
  priority: unknown,
  estimatedMinutes: unknown,
): string | null {
  if (
    typeof title !== "string" ||
    title.trim().length === 0 ||
    title.trim().length > 200
  ) {
    return "Title is required and must be 1–200 characters.";
  }
  if (priority !== "low" && priority !== "medium" && priority !== "high") {
    return "Priority must be low, medium, or high.";
  }
  if (
    typeof estimatedMinutes !== "number" ||
    !Number.isInteger(estimatedMinutes) ||
    estimatedMinutes < 1 ||
    estimatedMinutes > 1440
  ) {
    return "Estimated minutes must be a positive integer (max 1440).";
  }
  return null;
}

export function getTasks(status?: TaskStatus): Task[] {
  const db = getDb();
  if (status) {
    const stmt = db.prepare(
      "SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC",
    );
    const rows = stmt.all(status) as TaskRow[];
    return rows.map(rowToTask);
  }
  const stmt = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC");
  const rows = stmt.all() as TaskRow[];
  return rows.map(rowToTask);
}

export function createTask(input: Omit<Task, "id">): Task {
  const db = getDb();
  const validationError = validateTaskInput(
    input.title,
    input.priority,
    input.estimatedMinutes,
  );
  if (validationError) {
    throw Object.assign(new Error(validationError), {
      code: "VALIDATION_ERROR",
    });
  }

  const now = Date.now();
  const id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, description, priority, status, estimated_minutes, actual_minutes, is_recurring_child, recurring_rule_id, scheduled_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'todo', ?, null, 0, null, null, ?, ?)
  `);
  stmt.run(
    id,
    input.title.trim(),
    input.description ?? null,
    input.priority,
    input.estimatedMinutes,
    now,
    now,
  );

  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow;
  return rowToTask(row);
}

export function updateTask(patch: Partial<Task> & { id: string }): Task {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(patch.id) as TaskRow | undefined;
  if (!existing) {
    throw Object.assign(new Error("Task not found."), { code: "NOT_FOUND" });
  }

  const now = Date.now();
  const title = patch.title !== undefined ? patch.title.trim() : existing.title;
  const description =
    patch.description !== undefined ? patch.description : existing.description;
  const priority =
    patch.priority !== undefined ? patch.priority : existing.priority;
  const status = patch.status !== undefined ? patch.status : existing.status;
  const estimatedMinutes =
    patch.estimatedMinutes !== undefined
      ? patch.estimatedMinutes
      : existing.estimated_minutes;

  const stmt = db.prepare(`
    UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, estimated_minutes = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(
    title,
    description,
    priority,
    status,
    estimatedMinutes,
    now,
    patch.id,
  );

  const row = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(patch.id) as TaskRow;
  return rowToTask(row);
}

export function deleteTask(id: string): { success: boolean } {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM tasks WHERE id = ?").get(id);
  if (!existing) {
    throw Object.assign(new Error("Task not found."), { code: "NOT_FOUND" });
  }
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  return { success: true };
}
