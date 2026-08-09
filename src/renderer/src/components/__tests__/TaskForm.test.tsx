import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskForm } from "../TaskForm";
import type { Task } from "@shared/models";

vi.mock("../MarkdownEditor", () => ({
  MarkdownEditor: ({
    onChange,
    editable,
    minHeight,
  }: {
    initialContent: string;
    onChange: (html: string) => void;
    placeholder?: string;
    editable?: boolean;
    minHeight?: number;
    maxLength?: number;
  }) => {
    return editable !== false ? (
      <div data-testid="markdown-editor">
        <textarea
          data-testid="markdown-textarea"
          aria-label="description"
          onChange={(e) => onChange(e.target.value)}
          defaultValue=""
          placeholder="Add notes or context..."
        />
      </div>
    ) : (
      <div data-testid="markdown-editor-preview" style={{ minHeight }}>
        Preview mode
      </div>
    );
  },
}));

function mockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "test-task-1",
    title: "Test Task",
    description: "<p>Initial description</p>",
    priority: "medium",
    status: "todo",
    estimatedMinutes: 30,
    actualMinutes: null,
    isRecurringChild: false,
    recurringRuleId: null,
    scheduledDate: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

let apiMock: Record<string, ReturnType<typeof vi.fn>>;

function setupApi(overrides: Record<string, ReturnType<typeof vi.fn>> = {}) {
  apiMock = {
    getTasks: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    createTask: vi.fn().mockResolvedValue({ ok: true, data: mockTask() }),
    updateTask: vi.fn().mockResolvedValue({ ok: true, data: mockTask() }),
    deleteTask: vi
      .fn()
      .mockResolvedValue({ ok: true, data: { success: true } }),
    startTimer: vi.fn(),
    pauseTimer: vi.fn(),
    generatePlan: vi.fn(),
    generateReport: vi.fn(),
    setApiKey: vi.fn(),
    getApiKey: vi.fn(),
    deleteApiKey: vi.fn(),
    getRecurringRules: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    createRecurringRule: vi.fn(),
    updateRecurringRule: vi.fn(),
    deleteRecurringRule: vi.fn(),
    toggleRecurringRule: vi.fn(),
    ...overrides,
  };
  (window as unknown as Record<string, unknown>).api = apiMock;
}

async function advanceTimersAndFlush(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
  await act(() => Promise.resolve());
}

describe("TaskForm — Description Integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders MarkdownEditor inside TaskForm (smoke)", () => {
    setupApi();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<TaskForm isOpen={true} onClose={vi.fn()} onSubmit={onSubmit} />);
    expect(screen.getByTestId("markdown-editor")).toBeTruthy();
    expect(screen.getByText("Preview")).toBeTruthy();
  });

  it("preview toggle switches to preview mode", async () => {
    const user = userEvent.setup();
    setupApi();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(
      <TaskForm
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        initialData={mockTask()}
      />,
    );
    expect(screen.getByTestId("markdown-editor")).toBeTruthy();
    await user.click(screen.getByText("Preview"));
    expect(screen.getByTestId("markdown-editor-preview")).toBeTruthy();
    expect(screen.getByText("Edit")).toBeTruthy();
  });

  it("does not render when isOpen is false", () => {
    setupApi();
    render(<TaskForm isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText("Preview")).toBeNull();
  });

  it("renders 'New Task' heading in create mode", () => {
    setupApi();
    render(
      <TaskForm
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    expect(screen.getByText("New Task")).toBeTruthy();
  });

  it("renders 'Edit Task' heading in edit mode", () => {
    setupApi();
    render(
      <TaskForm
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(true)}
        initialData={mockTask()}
      />,
    );
    expect(screen.getByText("Edit Task")).toBeTruthy();
  });

  it("shows unsaved changes warning when closing with dirty description", async () => {
    const user = userEvent.setup();
    setupApi();
    const onClose = vi.fn();
    render(
      <TaskForm
        isOpen={true}
        onClose={onClose}
        onSubmit={vi.fn().mockResolvedValue(true)}
        initialData={mockTask()}
      />,
    );
    await user.type(screen.getByTestId("markdown-textarea"), "New content");
    await user.click(screen.getByText("Cancel"));
    expect(screen.getByText("Unsaved Changes")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('"Keep Editing" dismisses warning without closing', async () => {
    const user = userEvent.setup();
    setupApi();
    const onClose = vi.fn();
    render(
      <TaskForm
        isOpen={true}
        onClose={onClose}
        onSubmit={vi.fn().mockResolvedValue(true)}
        initialData={mockTask()}
      />,
    );
    await user.type(screen.getByTestId("markdown-textarea"), "New content");
    await user.click(screen.getByText("Cancel"));
    await user.click(screen.getByText("Keep Editing"));
    expect(screen.queryByText("Unsaved Changes")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('"Discard" closes the form', async () => {
    const user = userEvent.setup();
    setupApi();
    const onClose = vi.fn();
    render(
      <TaskForm
        isOpen={true}
        onClose={onClose}
        onSubmit={vi.fn().mockResolvedValue(true)}
        initialData={mockTask()}
      />,
    );
    await user.type(screen.getByTestId("markdown-textarea"), "New content");
    await user.click(screen.getByText("Cancel"));
    await user.click(screen.getByText("Discard"));
    expect(onClose).toHaveBeenCalled();
  });

  it("description field is optional (OPTIONAL label shown)", () => {
    setupApi();
    render(
      <TaskForm
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    expect(screen.getByText("(optional)")).toBeTruthy();
  });

  it("auto-save calls updateTask after debounce in edit mode", async () => {
    vi.useFakeTimers();
    setupApi();
    render(
      <TaskForm
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(true)}
        initialData={mockTask()}
      />,
    );

    fireEvent.change(screen.getByTestId("markdown-textarea"), {
      target: { value: "New content" },
    });

    await advanceTimersAndFlush(1600);

    expect(apiMock.updateTask).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("shows save indicator after successful auto-save", async () => {
    vi.useFakeTimers();
    setupApi();
    render(
      <TaskForm
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(true)}
        initialData={mockTask()}
      />,
    );

    fireEvent.change(screen.getByTestId("markdown-textarea"), {
      target: { value: "New content" },
    });

    await advanceTimersAndFlush(1600);

    const savedEl = document.querySelector('[class*="text-success"]');
    expect(savedEl).toBeTruthy();
    vi.useRealTimers();
  });

  it("shows retry button when auto-save fails", async () => {
    vi.useFakeTimers();
    setupApi({
      updateTask: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "DB_WRITE_FAILED", message: "Save failed" },
      }),
    });
    render(
      <TaskForm
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(true)}
        initialData={mockTask()}
      />,
    );

    fireEvent.change(screen.getByTestId("markdown-textarea"), {
      target: { value: "New content" },
    });

    await advanceTimersAndFlush(1600);

    expect(screen.getByText("Retry")).toBeTruthy();
    vi.useRealTimers();
  });

  it("includes description in submit payload", async () => {
    const user = userEvent.setup();
    setupApi();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<TaskForm isOpen={true} onClose={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Title"), "New Task");
    await user.type(screen.getByLabelText("Estimated Time (minutes)"), "45");
    await user.type(
      screen.getByTestId("markdown-textarea"),
      "Custom description",
    );

    await user.click(screen.getByText("Create"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Task",
        description: expect.stringContaining("Custom description"),
        estimatedMinutes: 45,
        priority: "medium",
      }),
    );
  }, 10000);
});
