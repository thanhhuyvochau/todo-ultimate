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
  description?: unknown,
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
  if (description !== undefined && description !== null) {
    if (typeof description !== "string" || description.length > 100000) {
      return "Description must be a string with max 100,000 characters.";
    }
  }
  return null;
}

export function getTasks(filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  query?: string;
}): Task[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters?.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.priority) {
    clauses.push("priority = ?");
    params.push(filters.priority);
  }
  if (filters?.query) {
    clauses.push("(title LIKE ? OR description LIKE ?)");
    params.push(`%${filters.query}%`, `%${filters.query}%`);
  }

  let sql = "SELECT * FROM tasks";
  if (clauses.length > 0) {
    sql += " WHERE " + clauses.join(" AND ");
  }
  sql += " ORDER BY created_at DESC";

  const stmt = db.prepare(sql);
  const rows = (
    params.length > 0 ? stmt.all(...params) : stmt.all()
  ) as TaskRow[];
  return rows.map(rowToTask);
}

export function createTask(input: Omit<Task, "id">): Task {
  const db = getDb();
  const validationError = validateTaskInput(
    input.title,
    input.priority,
    input.estimatedMinutes,
    input.description,
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

export function createRecurringChildTask(rule: {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  estimatedMinutes: number;
  timeAnchor: number | null;
  startOfDay: number;
}): Task {
  const db = getDb();
  const now = Date.now();
  const id = randomUUID();

  const scheduledDate =
    rule.timeAnchor !== null
      ? applyTimeAnchor(rule.startOfDay, rule.timeAnchor)
      : null;

  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, description, priority, status, estimated_minutes, actual_minutes, is_recurring_child, recurring_rule_id, scheduled_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'todo', ?, null, 1, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    rule.title.trim(),
    rule.description ?? null,
    rule.priority,
    rule.estimatedMinutes,
    rule.id,
    scheduledDate,
    now,
    now,
  );

  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow;
  return rowToTask(row);
}

function applyTimeAnchor(startOfDay: number, timeAnchor: number): number {
  const anchor = new Date(timeAnchor);
  const result = new Date(startOfDay);
  result.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
  return result.getTime();
}

function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  taskId: string,
): void {
  const allowedTransitions: Record<string, string[]> = {
    todo: ["in_progress"],
    in_progress: ["todo", "completed"],
    completed: [],
  };

  const allowed = allowedTransitions[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw Object.assign(
      new Error(`Cannot transition from '${currentStatus}' to '${newStatus}'.`),
      { code: "STATE_TRANSITION_ILLEGAL" },
    );
  }

  if (newStatus === "in_progress") {
    const db = getDb();
    const activeTask = db
      .prepare("SELECT id, title FROM tasks WHERE status = ? AND id != ?")
      .get("in_progress", taskId) as Pick<TaskRow, "id" | "title"> | undefined;
    if (activeTask) {
      throw Object.assign(
        new Error(
          `Cannot start this task. "${activeTask.title}" is already in progress.`,
        ),
        { code: "TASK_ALREADY_ACTIVE" },
      );
    }
  }
}

export function updateTask(patch: Partial<Task> & { id: string }): Task {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(patch.id) as TaskRow | undefined;
  if (!existing) {
    throw Object.assign(new Error("Task not found."), { code: "NOT_FOUND" });
  }

  if (patch.status !== undefined && patch.status !== existing.status) {
    validateStatusTransition(existing.status, patch.status, patch.id);
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
  const scheduledDate =
    "scheduledDate" in patch
      ? (patch as { scheduledDate: number | null }).scheduledDate
      : existing.scheduled_date;

  const validationError = validateTaskInput(
    patch.title !== undefined ? patch.title : existing.title,
    patch.priority !== undefined ? patch.priority : existing.priority,
    patch.estimatedMinutes !== undefined
      ? patch.estimatedMinutes
      : existing.estimated_minutes,
    patch.description !== undefined ? patch.description : existing.description,
  );
  if (validationError) {
    throw Object.assign(new Error(validationError), {
      code: "VALIDATION_ERROR",
    });
  }

  const stmt = db.prepare(`
    UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, estimated_minutes = ?, scheduled_date = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(
    title,
    description,
    priority,
    status,
    estimatedMinutes,
    scheduledDate,
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
