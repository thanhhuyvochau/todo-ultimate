import { getDb } from "./database";
import type { DailyPlan, DailyPlanSchedule } from "@/shared/models";
import { randomUUID } from "crypto";

interface DailyPlanRow {
  id: string;
  date: number;
  focus_hours: number | null;
  primary_goal: string | null;
  plan_json: string;
  is_approved: number;
  created_at: number;
}

function rowToPlan(row: DailyPlanRow): DailyPlan {
  return {
    id: row.id,
    date: row.date,
    focusHours: row.focus_hours,
    primaryGoal: row.primary_goal,
    planJson: row.plan_json,
    isApproved: row.is_approved === 1,
    createdAt: row.created_at,
  };
}

export function getPlanForDate(startOfDay: number): DailyPlan | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM daily_plans WHERE date = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(startOfDay) as DailyPlanRow | undefined;
  return row ? rowToPlan(row) : null;
}

export function saveApprovedPlan(
  schedule: DailyPlanSchedule,
  startOfDay: number,
): DailyPlan {
  const db = getDb();
  const now = Date.now();
  const planJson = JSON.stringify(schedule);

  const existing = db
    .prepare("SELECT id FROM daily_plans WHERE date = ?")
    .get(startOfDay) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE daily_plans SET focus_hours = ?, primary_goal = ?, plan_json = ?, is_approved = 1, created_at = ? WHERE id = ?`,
    ).run(
      schedule.focusHours,
      schedule.primaryGoal,
      planJson,
      now,
      existing.id,
    );
    const row = db
      .prepare("SELECT * FROM daily_plans WHERE id = ?")
      .get(existing.id) as DailyPlanRow;
    return rowToPlan(row);
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO daily_plans (id, date, focus_hours, primary_goal, plan_json, is_approved, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
  ).run(
    id,
    startOfDay,
    schedule.focusHours,
    schedule.primaryGoal,
    planJson,
    now,
  );

  const row = db
    .prepare("SELECT * FROM daily_plans WHERE id = ?")
    .get(id) as DailyPlanRow;
  return rowToPlan(row);
}
