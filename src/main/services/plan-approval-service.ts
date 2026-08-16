import type { DailyPlan, DailyPlanSchedule } from "@/shared/models";
import { getDb } from "@/main/db/database";
import { getStartOfDay } from "@/main/services/recurring-engine";
import { saveApprovedPlan } from "@/main/db/daily-plan-repository";

export function approvePlan(schedule: DailyPlanSchedule): DailyPlan {
  if (
    !schedule ||
    typeof schedule.focusHours !== "number" ||
    !Number.isFinite(schedule.focusHours) ||
    schedule.focusHours <= 0
  ) {
    throw Object.assign(new Error("Focus hours must be a positive number."), {
      code: "VALIDATION_ERROR",
    });
  }
  if (!Array.isArray(schedule.schedule)) {
    throw Object.assign(new Error("Plan schedule is malformed."), {
      code: "VALIDATION_ERROR",
    });
  }

  const startOfDay = getStartOfDay(Date.now());
  const db = getDb();

  const apply = db.transaction(() => {
    for (const block of schedule.schedule) {
      if (block.isFixed) continue;

      const existing = db
        .prepare("SELECT status FROM tasks WHERE id = ?")
        .get(block.taskId) as { status: string } | undefined;
      if (!existing) {
        throw Object.assign(
          new Error(
            `Task "${block.title}" no longer exists. Please regenerate the plan.`,
          ),
          { code: "NOT_FOUND" },
        );
      }
      if (existing.status !== "todo") {
        throw Object.assign(
          new Error(
            `Task "${block.title}" is no longer available (${existing.status}). Please regenerate the plan.`,
          ),
          { code: "VALIDATION_ERROR" },
        );
      }

      db.prepare(
        "UPDATE tasks SET scheduled_date = ?, updated_at = ? WHERE id = ?",
      ).run(startOfDay, Date.now(), block.taskId);
    }

    return saveApprovedPlan(schedule, startOfDay);
  });

  return apply();
}
