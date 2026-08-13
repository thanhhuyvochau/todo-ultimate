import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { VarianceBadge } from "../VarianceBadge";
import type { Task } from "@/shared/models";

function mockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Task",
    description: null,
    priority: "medium",
    status: "completed",
    estimatedMinutes: 30,
    actualMinutes: 45,
    isRecurringChild: false,
    recurringRuleId: null,
    scheduledDate: null,
    completedAt: 2000,
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  };
}

describe("VarianceBadge", () => {
  it("renders a red +delta when underestimated", () => {
    const { container } = render(
      <VarianceBadge task={mockTask({ actualMinutes: 45 })} />,
    );
    expect(container.textContent).toContain("+15m");
  });

  it("renders a green -delta when overestimated", () => {
    const { container } = render(
      <VarianceBadge task={mockTask({ actualMinutes: 20 })} />,
    );
    expect(container.textContent).toContain("−10m");
  });

  it("renders nothing when on point", () => {
    const { container } = render(
      <VarianceBadge task={mockTask({ actualMinutes: 31 })} />,
    );
    expect(container.textContent).toBe("");
  });

  it("renders nothing when not completed", () => {
    const { container } = render(
      <VarianceBadge
        task={mockTask({ status: "in_progress", actualMinutes: 45 })}
      />,
    );
    expect(container.textContent).toBe("");
  });

  it("renders nothing when actual minutes are null", () => {
    const { container } = render(
      <VarianceBadge task={mockTask({ actualMinutes: null })} />,
    );
    expect(container.textContent).toBe("");
  });
});
