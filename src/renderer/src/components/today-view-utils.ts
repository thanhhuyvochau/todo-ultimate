import type { Task } from "@shared/models";

export function getOverdueTasks(tasks: Task[], today: number): Task[] {
  return tasks
    .filter(
      (task) =>
        task.scheduledDate !== null &&
        task.scheduledDate < today &&
        task.status !== "completed",
    )
    .sort(
      (first, second) =>
        (first.scheduledDate ?? 0) - (second.scheduledDate ?? 0),
    );
}

export function getStartToastMessage(
  previousTask: Task | undefined,
  nextTask: Task,
): string {
  if (previousTask && previousTask.id !== nextTask.id) {
    return `Paused "${previousTask.title}" and started "${nextTask.title}"`;
  }
  return `Started "${nextTask.title}"`;
}
