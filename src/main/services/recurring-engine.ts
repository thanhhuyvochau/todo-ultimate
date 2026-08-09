import type { RecurringRule } from "@/shared/models";
import { getAllRules } from "@/main/db/recurring-rule-repository";
import { createRecurringChildTask } from "@/main/db/task-repository";
import { getDb } from "@/main/db/database";

export function getStartOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function matchesTodayFrequency(
  rule: RecurringRule,
  today: Date,
): boolean {
  switch (rule.frequency) {
    case "daily":
      return true;
    case "weekly": {
      const dow = today.getDay();
      return (rule.daysOfWeek ?? []).includes(dow);
    }
    case "monthly": {
      const dom = today.getDate();
      if (rule.dayOfMonth === null) return false;
      return dom === rule.dayOfMonth;
    }
    default:
      return false;
  }
}

export function instantiateDailyTasks(now: number = Date.now()): number {
  const todayStart = getStartOfDay(now);
  const todayDate = new Date(todayStart);
  const activeRules = getAllRules().filter((r) => r.isActive);

  let created = 0;

  const db = getDb();
  const instantiate = db.transaction(() => {
    for (const rule of activeRules) {
      if (
        rule.lastInstantiatedDate !== null &&
        rule.lastInstantiatedDate >= todayStart
      ) {
        continue;
      }

      if (!matchesTodayFrequency(rule, todayDate)) {
        continue;
      }

      createRecurringChildTask({
        id: rule.id,
        title: rule.title,
        description: rule.description,
        priority: rule.priority,
        estimatedMinutes: rule.estimatedMinutes,
        timeAnchor: rule.timeAnchor,
        startOfDay: todayStart,
      });

      db.prepare(
        "UPDATE recurring_rules SET last_instantiated_date = ? WHERE id = ?",
      ).run(todayStart, rule.id);

      created++;
    }
  });

  instantiate();
  return created;
}
