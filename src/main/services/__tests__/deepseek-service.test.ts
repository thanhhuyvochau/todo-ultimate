import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { DailyPlanRequest, ReportParams } from "@/shared/models";

const mockCreate = vi.fn();
const mockGetApiKey = vi.fn<() => string | null>();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: { create: (...args: unknown[]) => mockCreate(...args) },
    },
  })),
}));

vi.mock("@/main/services/keychain-service", () => ({
  getApiKey: () => mockGetApiKey(),
  getAllKeyStatus: () => ({
    deepseek: true,
    openai: false,
    anthropic: false,
    gemini: false,
    custom: false,
  }),
}));

vi.mock("@/main/db/settings-repository", () => ({
  getAiSettings: () => ({
    activeProvider: "deepseek",
    providers: {
      deepseek: {
        providerId: "deepseek",
        selectedModel: "deepseek-chat",
        hasKey: true,
      },
      openai: { providerId: "openai", selectedModel: "gpt-4o", hasKey: false },
      anthropic: {
        providerId: "anthropic",
        selectedModel: "claude-3-7-sonnet-latest",
        hasKey: false,
      },
      gemini: {
        providerId: "gemini",
        selectedModel: "gemini-2.0-flash",
        hasKey: false,
      },
      custom: {
        providerId: "custom",
        selectedModel: "llama3.2",
        hasKey: false,
      },
    },
  }),
}));

import {
  testConnection,
  generateDailyPlan,
  generatePerformanceReport,
} from "../deepseekService";

const validPlan = {
  date: 1723536000000,
  focusHours: 6,
  primaryGoal: "Ship the feature",
  schedule: [
    {
      taskId: "task-1",
      title: "Write code",
      priority: "high",
      estimatedMinutes: 60,
      budgetedMinutes: 75,
      scheduledStart: 1723536000000,
      isFixed: false,
      rationale: "Do the hardest thing first",
    },
  ],
  unscheduledTasks: [],
  summary: "A focused morning of deep work.",
};

const validReport = {
  timeframe: { start: 1, end: 2 },
  generatedAt: 3,
  metrics: {
    totalCompleted: 4,
    overallVariance: 5,
    meanAbsoluteVariance: 6,
    byPriority: {
      low: { meanVariance: 0, meanVarianceRatio: null, count: 0 },
      medium: { meanVariance: 0, meanVarianceRatio: null, count: 0 },
      high: { meanVariance: 10, meanVarianceRatio: 1.2, count: 4 },
    },
    efficiencyScore: 70,
    trendDirection: "stable",
  },
  patterns: [],
  advice: [],
  summary: "Good job.",
};

const planRequest: DailyPlanRequest = {
  focusHours: 6,
  primaryGoal: "Ship the feature",
  tasks: [
    {
      id: "task-1",
      title: "Write code",
      priority: "high",
      estimatedMinutes: 60,
    },
  ],
};

const reportParams: ReportParams = {
  timeframeStart: 1,
  timeframeEnd: 2,
  completedTasks: [],
  metrics: {
    totalCompleted: 0,
    overallMeanVariance: 0,
    overallMeanAbsoluteVariance: 0,
    overallMeanVarianceRatio: null,
    byPriority: {
      low: {
        meanVariance: 0,
        meanVarianceRatio: null,
        count: 0,
        outlierCount: 0,
      },
      medium: {
        meanVariance: 0,
        meanVarianceRatio: null,
        count: 0,
        outlierCount: 0,
      },
      high: {
        meanVariance: 0,
        meanVarianceRatio: null,
        count: 0,
        outlierCount: 0,
      },
    },
    byTaskType: {
      recurring: {
        meanVariance: 0,
        meanVarianceRatio: null,
        count: 0,
        outlierCount: 0,
      },
      manual: {
        meanVariance: 0,
        meanVarianceRatio: null,
        count: 0,
        outlierCount: 0,
      },
    },
    underestimationRate: 0,
    overestimationRate: 0,
    onPointRate: 0,
    outlierCount: 0,
  },
};

function okCompletion(data: unknown) {
  return {
    choices: [{ message: { content: JSON.stringify(data) } }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetApiKey.mockReturnValue("test-api-key");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("testConnection", () => {
  it("returns true when the API responds", async () => {
    mockCreate.mockResolvedValueOnce(okCompletion({ ok: true }));
    await expect(testConnection()).resolves.toBe(true);
  });

  it("returns false on auth failure", async () => {
    mockCreate.mockRejectedValueOnce({ status: 401 });
    await expect(testConnection()).resolves.toBe(false);
  });

  it("does not log the API key on failure", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    mockGetApiKey.mockReturnValue("super-secret-key");
    mockCreate.mockRejectedValue({ status: 401 });

    await testConnection();

    const output = warnSpy.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(output).not.toContain("super-secret-key");
    warnSpy.mockRestore();
  });
});

describe("generateDailyPlan", () => {
  it("returns a validated plan and calls the configured client", async () => {
    mockCreate.mockResolvedValueOnce(okCompletion(validPlan));

    const result = await generateDailyPlan(planRequest);

    expect(result.schedule).toHaveLength(1);
    expect(result.summary).toBe("A focused morning of deep work.");
    const [createArgs] = mockCreate.mock.calls[0] ?? [];
    expect(createArgs).toMatchObject({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
    });
  });

  it("throws AI_AUTH_FAILED when no key is configured", async () => {
    mockGetApiKey.mockReturnValue(null);

    await expect(generateDailyPlan(planRequest)).rejects.toMatchObject({
      code: "AI_AUTH_FAILED",
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("retries on 500 then succeeds", async () => {
    vi.useFakeTimers();
    mockCreate
      .mockRejectedValueOnce({ status: 500 })
      .mockRejectedValueOnce({ status: 500 })
      .mockResolvedValueOnce(okCompletion(validPlan));

    const promise = generateDailyPlan(planRequest);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(result.schedule).toHaveLength(1);
  });

  it("does not retry on 401", async () => {
    mockCreate.mockRejectedValueOnce({ status: 401 });

    await expect(generateDailyPlan(planRequest)).rejects.toMatchObject({
      code: "AI_AUTH_FAILED",
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("throws AI_RATE_LIMITED after exhausting retries on 429", async () => {
    vi.useFakeTimers();
    mockCreate.mockRejectedValue({ status: 429 });

    const promise = generateDailyPlan(planRequest);
    const caught = promise.catch((err: unknown) => err);
    await vi.runAllTimersAsync();
    const error = await caught;

    expect(error).toMatchObject({ code: "AI_RATE_LIMITED" });
    expect(mockCreate).toHaveBeenCalledTimes(4);
  });

  it("throws AI_TIMEOUT on timeout", async () => {
    vi.useFakeTimers();
    mockCreate.mockRejectedValue({ name: "APIConnectionTimeoutError" });

    const promise = generateDailyPlan(planRequest);
    const caught = promise.catch((err: unknown) => err);
    await vi.runAllTimersAsync();
    const error = await caught;

    expect(error).toMatchObject({ code: "AI_TIMEOUT" });
    expect(mockCreate).toHaveBeenCalledTimes(4);
  });

  it("throws AI_NETWORK_ERROR on connection failure", async () => {
    vi.useFakeTimers();
    mockCreate.mockRejectedValue(new Error("ECONNREFUSED"));

    const promise = generateDailyPlan(planRequest);
    const caught = promise.catch((err: unknown) => err);
    await vi.runAllTimersAsync();
    const error = await caught;

    expect(error).toMatchObject({ code: "AI_NETWORK_ERROR" });
    expect(mockCreate).toHaveBeenCalledTimes(4);
  });

  it("throws AI_PARSE_ERROR on invalid JSON", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "not json {{{" } }],
    });

    await expect(generateDailyPlan(planRequest)).rejects.toMatchObject({
      code: "AI_PARSE_ERROR",
    });
  });

  it("throws AI_PARSE_ERROR on schema mismatch", async () => {
    mockCreate.mockResolvedValueOnce(okCompletion({ unexpected: true }));

    await expect(generateDailyPlan(planRequest)).rejects.toMatchObject({
      code: "AI_PARSE_ERROR",
    });
  });
});

describe("generatePerformanceReport", () => {
  it("returns a validated report", async () => {
    mockCreate.mockResolvedValueOnce(okCompletion(validReport));

    const result = await generatePerformanceReport(reportParams);

    expect(result.metrics.totalCompleted).toBe(4);
    expect(result.summary).toBe("Good job.");
  });
});
