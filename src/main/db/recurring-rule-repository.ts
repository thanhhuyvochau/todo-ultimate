import { getDb } from "./database";
import type {
  RecurringRule,
  RecurringFrequency,
  TaskPriority,
} from "@/shared/models";
import { randomUUID } from "crypto";

interface RecurringRuleRow {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  estimated_minutes: number;
  frequency: string;
  time_anchor: number | null;
  days_of_week: string | null;
  day_of_month: number | null;
  is_active: number;
  last_instantiated_date: number | null;
  created_at: number;
}

function rowToRule(row: RecurringRuleRow): RecurringRule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority as TaskPriority,
    estimatedMinutes: row.estimated_minutes,
    frequency: row.frequency as RecurringFrequency,
    timeAnchor: row.time_anchor,
    daysOfWeek: row.days_of_week ? JSON.parse(row.days_of_week) : null,
    dayOfMonth: row.day_of_month,
    isActive: row.is_active === 1,
    lastInstantiatedDate: row.last_instantiated_date,
    createdAt: row.created_at,
  };
}

const VALID_FREQUENCIES: RecurringFrequency[] = ["daily", "weekly", "monthly"];

function validateRuleInput(input: {
  title: unknown;
  priority: unknown;
  estimatedMinutes: unknown;
  frequency: unknown;
  description?: unknown;
  daysOfWeek?: unknown;
  dayOfMonth?: unknown;
  timeAnchor?: unknown;
}): string | null {
  if (
    typeof input.title !== "string" ||
    input.title.trim().length === 0 ||
    input.title.trim().length > 200
  ) {
    return "Title is required and must be 1–200 characters.";
  }
  if (
    input.priority !== "low" &&
    input.priority !== "medium" &&
    input.priority !== "high"
  ) {
    return "Priority must be low, medium, or high.";
  }
  if (
    typeof input.estimatedMinutes !== "number" ||
    !Number.isInteger(input.estimatedMinutes) ||
    input.estimatedMinutes < 1 ||
    input.estimatedMinutes > 1440
  ) {
    return "Estimated minutes must be a positive integer (max 1440).";
  }
  if (!VALID_FREQUENCIES.includes(input.frequency as RecurringFrequency)) {
    return "Frequency must be daily, weekly, or monthly.";
  }
  if (input.description !== undefined && input.description !== null) {
    if (
      typeof input.description !== "string" ||
      input.description.length > 100000
    ) {
      return "Description must be a string with max 100,000 characters.";
    }
  }
  if (input.daysOfWeek !== undefined && input.daysOfWeek !== null) {
    if (!Array.isArray(input.daysOfWeek)) {
      return "daysOfWeek must be an array of numbers.";
    }
    for (const d of input.daysOfWeek) {
      if (typeof d !== "number" || d < 0 || d > 6 || !Number.isInteger(d)) {
        return "daysOfWeek must contain integers 0 (Sunday) through 6 (Saturday).";
      }
    }
  }
  if (
    input.frequency === "weekly" &&
    (!input.daysOfWeek || (input.daysOfWeek as number[]).length === 0)
  ) {
    return "Weekly frequency requires at least one selected day.";
  }
  if (input.dayOfMonth !== undefined && input.dayOfMonth !== null) {
    if (
      typeof input.dayOfMonth !== "number" ||
      !Number.isInteger(input.dayOfMonth) ||
      input.dayOfMonth < 1 ||
      input.dayOfMonth > 31
    ) {
      return "dayOfMonth must be an integer between 1 and 31.";
    }
  }
  if (
    input.frequency === "monthly" &&
    (input.dayOfMonth === undefined || input.dayOfMonth === null)
  ) {
    return "Monthly frequency requires a day of month.";
  }
  if (input.timeAnchor !== undefined && input.timeAnchor !== null) {
    if (
      typeof input.timeAnchor !== "number" ||
      !Number.isInteger(input.timeAnchor)
    ) {
      return "timeAnchor must be an integer (epoch ms).";
    }
  }
  return null;
}

export function getAllRules(): RecurringRule[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM recurring_rules ORDER BY created_at DESC")
    .all() as RecurringRuleRow[];
  return rows.map(rowToRule);
}

export function createRule(input: Omit<RecurringRule, "id">): RecurringRule {
  const db = getDb();
  const validationError = validateRuleInput(input);
  if (validationError) {
    throw Object.assign(new Error(validationError), {
      code: "VALIDATION_ERROR",
    });
  }

  if (input.timeAnchor != null) {
    const conflict = db
      .prepare(
        "SELECT id FROM recurring_rules WHERE time_anchor = ? AND is_active = 1",
      )
      .get(input.timeAnchor);
    if (conflict) {
      throw Object.assign(
        new Error("Another active rule already uses this time anchor."),
        { code: "TIME_ANCHOR_CONFLICT" },
      );
    }
  }

  const now = Date.now();
  const id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO recurring_rules (id, title, description, priority, estimated_minutes, frequency, time_anchor, days_of_week, day_of_month, is_active, last_instantiated_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, null, ?)
  `);
  stmt.run(
    id,
    input.title.trim(),
    input.description ?? null,
    input.priority,
    input.estimatedMinutes,
    input.frequency,
    input.timeAnchor ?? null,
    input.daysOfWeek ? JSON.stringify(input.daysOfWeek) : null,
    input.dayOfMonth ?? null,
    now,
  );

  const row = db
    .prepare("SELECT * FROM recurring_rules WHERE id = ?")
    .get(id) as RecurringRuleRow;
  return rowToRule(row);
}

export function updateRule(
  patch: Partial<RecurringRule> & { id: string },
): RecurringRule {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM recurring_rules WHERE id = ?")
    .get(patch.id) as RecurringRuleRow | undefined;
  if (!existing) {
    throw Object.assign(new Error("Recurring rule not found."), {
      code: "NOT_FOUND",
    });
  }

  const merged = {
    title: patch.title !== undefined ? patch.title : existing.title,
    priority: patch.priority !== undefined ? patch.priority : existing.priority,
    estimatedMinutes:
      patch.estimatedMinutes !== undefined
        ? patch.estimatedMinutes
        : existing.estimated_minutes,
    frequency:
      patch.frequency !== undefined ? patch.frequency : existing.frequency,
    description:
      patch.description !== undefined
        ? patch.description
        : existing.description,
    daysOfWeek:
      patch.daysOfWeek !== undefined
        ? patch.daysOfWeek
        : existing.days_of_week
          ? JSON.parse(existing.days_of_week)
          : null,
    dayOfMonth:
      patch.dayOfMonth !== undefined ? patch.dayOfMonth : existing.day_of_month,
    timeAnchor:
      patch.timeAnchor !== undefined ? patch.timeAnchor : existing.time_anchor,
  };

  const validationError = validateRuleInput(merged);
  if (validationError) {
    throw Object.assign(new Error(validationError), {
      code: "VALIDATION_ERROR",
    });
  }

  if (merged.timeAnchor != null) {
    const conflict = db
      .prepare(
        "SELECT id FROM recurring_rules WHERE time_anchor = ? AND is_active = 1 AND id != ?",
      )
      .get(merged.timeAnchor, patch.id);
    if (conflict) {
      throw Object.assign(
        new Error("Another active rule already uses this time anchor."),
        { code: "TIME_ANCHOR_CONFLICT" },
      );
    }
  }

  const stmt = db.prepare(`
    UPDATE recurring_rules SET title = ?, description = ?, priority = ?, estimated_minutes = ?, frequency = ?, time_anchor = ?, days_of_week = ?, day_of_month = ?
    WHERE id = ?
  `);
  stmt.run(
    merged.title.trim(),
    merged.description,
    merged.priority,
    merged.estimatedMinutes,
    merged.frequency,
    merged.timeAnchor,
    merged.daysOfWeek ? JSON.stringify(merged.daysOfWeek) : null,
    merged.dayOfMonth,
    patch.id,
  );

  const row = db
    .prepare("SELECT * FROM recurring_rules WHERE id = ?")
    .get(patch.id) as RecurringRuleRow;
  return rowToRule(row);
}

export function deleteRule(id: string): { success: boolean } {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM recurring_rules WHERE id = ?")
    .get(id);
  if (!existing) {
    throw Object.assign(new Error("Recurring rule not found."), {
      code: "NOT_FOUND",
    });
  }
  db.prepare("DELETE FROM recurring_rules WHERE id = ?").run(id);
  return { success: true };
}

export function toggleActive(id: string): RecurringRule {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM recurring_rules WHERE id = ?")
    .get(id) as RecurringRuleRow | undefined;
  if (!existing) {
    throw Object.assign(new Error("Recurring rule not found."), {
      code: "NOT_FOUND",
    });
  }

  const newActive = existing.is_active === 1 ? 0 : 1;
  db.prepare("UPDATE recurring_rules SET is_active = ? WHERE id = ?").run(
    newActive,
    id,
  );

  const row = db
    .prepare("SELECT * FROM recurring_rules WHERE id = ?")
    .get(id) as RecurringRuleRow;
  return rowToRule(row);
}
