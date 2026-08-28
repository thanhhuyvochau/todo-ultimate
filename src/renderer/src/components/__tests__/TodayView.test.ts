import { describe, expect, it } from "vitest";

import type { Task } from "@shared/models";
import { getOverdueTasks, getStartToastMessage } from "../today-view-utils";

function createTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    description: null,
    priority: "medium",
    status: "todo",
    estimatedMinutes: 30,
    actualMinutes: null,
    isRecurringChild: false,
    recurringRuleId: null,
    scheduledDate: null,
    completedAt: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

describe("TodayView task grouping", () => {
  it("selects unfinished past tasks and sorts the oldest first", () => {
    const today = 10_000;
    const tasks = [
      createTask("newer overdue", { scheduledDate: 9_000 }),
      createTask("oldest overdue", { scheduledDate: 1_000 }),
      createTask("completed past", {
        scheduledDate: 2_000,
        status: "completed",
      }),
      createTask("today", { scheduledDate: today }),
      createTask("backlog"),
    ];

    expect(getOverdueTasks(tasks, today).map((task) => task.id)).toEqual([
      "oldest overdue",
      "newer overdue",
    ]);
  });
});

describe("TodayView start feedback", () => {
  it("describes a task handoff", () => {
    const previous = createTask("previous", { title: "Old task" });
    const next = createTask("next", { title: "New task" });

    expect(getStartToastMessage(previous, next)).toBe(
      'Paused "Old task" and started "New task"',
    );
  });

  it("describes a normal start", () => {
    const next = createTask("next", { title: "New task" });

    expect(getStartToastMessage(undefined, next)).toBe('Started "New task"');
  });
});
