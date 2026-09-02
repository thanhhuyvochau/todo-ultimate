import type { DailyPlanRequest, DailyPlanSchedule } from "@/shared/models";
import { getStartOfDay } from "@/main/services/recurring-engine";
import { getTasks } from "@/main/db/task-repository";
import { getVarianceMetrics } from "@/main/services/variance-service";
import * as deepseekService from "@/main/services/deepseekService";
import * as calendarEventRepo from "@/main/db/calendar-event-repository";

const DAY_MS = 24 * 60 * 60 * 1000;
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export interface GeneratePlanParams {
  focusHours: number;
  primaryGoal: string;
}

export async function generateDailyPlan(
  params: GeneratePlanParams,
): Promise<DailyPlanSchedule> {
  if (
    typeof params.focusHours !== "number" ||
    !Number.isFinite(params.focusHours) ||
    params.focusHours <= 0
  ) {
    throw Object.assign(new Error("Focus hours must be a positive number."), {
      code: "VALIDATION_ERROR",
    });
  }

  const todayStart = getStartOfDay(Date.now());
  const todayEnd = todayStart + DAY_MS;

  const todoTasks = getTasks({ status: "todo" });

  const fixedBlocks: DailyPlanRequest["fixedBlocks"] = [];
  const calendarEvents: NonNullable<DailyPlanRequest["calendarEvents"]> =
    calendarEventRepo.getEventsInRange(todayStart, todayEnd).map((event) => ({
      eventId: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
    }));
  const availableTasks: DailyPlanRequest["tasks"] = [];

  for (const task of todoTasks) {
    if (
      task.isRecurringChild &&
      task.scheduledDate !== null &&
      task.scheduledDate >= todayStart &&
      task.scheduledDate < todayEnd
    ) {
      fixedBlocks.push({
        taskId: task.id,
        title: task.title,
        startTime: task.scheduledDate,
        durationMinutes: task.estimatedMinutes,
      });
    } else {
      availableTasks.push({
        id: task.id,
        title: task.title,
        priority: task.priority,
        estimatedMinutes: task.estimatedMinutes,
      });
    }
  }

  availableTasks.sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1),
  );

  const historicalVariance = getVarianceMetrics();

  return deepseekService.generateDailyPlan({
    focusHours: params.focusHours,
    primaryGoal: params.primaryGoal.trim(),
    tasks: availableTasks,
    fixedBlocks,
    calendarEvents,
    historicalVariance,
  });
}
