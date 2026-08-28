import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Task } from "@shared/models";
import { TaskItem } from "../TaskItem";

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Write tests",
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

describe("TaskItem start controls", () => {
  it("disables starting and hides the status menu for Backlog tasks", () => {
    render(
      <TaskItem
        task={createTask()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
        onMoveToToday={vi.fn()}
      />,
    );

    const statusButton = screen.getByRole("button", {
      name: "Move task to Today before starting",
    }) as HTMLButtonElement;
    expect(statusButton.disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Change status" })).toBeNull();
    expect(screen.getByRole("button", { name: "Move to today" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit task" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete task" })).toBeTruthy();
  });

  it("allows a scheduled todo task to start from its status trigger", () => {
    const onStatusChange = vi.fn();
    const task = createTask({ scheduledDate: 1_700_000_000_000 });
    render(
      <TaskItem
        task={task}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={onStatusChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Status: todo" }));

    expect(onStatusChange).toHaveBeenCalledWith(task, "in_progress");
  });
});
