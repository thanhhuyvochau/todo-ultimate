import { describe, it, expect, beforeEach, vi } from "vitest";
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
    openai: true,
    anthropic: false,
    gemini: false,
    custom: false,
  }),
}));

vi.mock("@/main/db/settings-repository", () => ({
  getAiSettings: () => ({
    activeProvider: "openai",
    providers: {
      deepseek: {
        providerId: "deepseek",
        selectedModel: "deepseek-chat",
        hasKey: true,
      },
      openai: {
        providerId: "openai",
        selectedModel: "gpt-4o-mini",
        hasKey: true,
      },
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
        baseUrl: "http://localhost:11434/v1",
        hasKey: false,
      },
    },
  }),
}));

import {
  generateDailyPlan,
  generatePerformanceReport,
  testConnection,
} from "../ai-service";

const validPlan = {
  date: 1723536000000,
  focusHours: 6,
  primaryGoal: "Launch multi-provider LLM",
  schedule: [
    {
      taskId: "task-100",
      title: "Write adapter code",
      priority: "high",
      estimatedMinutes: 60,
      budgetedMinutes: 60,
      scheduledStart: 1723536000000,
      isFixed: false,
      rationale: "Core architecture",
    },
  ],
  unscheduledTasks: [],
  summary: "A focused development sprint.",
};

const validReport = {
  timeframe: { start: 1000, end: 2000 },
  generatedAt: 3000,
  metrics: {
    totalCompleted: 5,
    overallVariance: 0,
    meanAbsoluteVariance: 0,
    byPriority: {
      low: { meanVariance: 0, meanVarianceRatio: null, count: 1 },
      medium: { meanVariance: 0, meanVarianceRatio: null, count: 2 },
      high: { meanVariance: 0, meanVarianceRatio: null, count: 2 },
    },
    efficiencyScore: 95,
    trendDirection: "improving",
  },
  patterns: [],
  advice: [],
  summary: "Great estimation performance.",
};

const planRequest: DailyPlanRequest = {
  focusHours: 6,
  primaryGoal: "Launch multi-provider LLM",
  tasks: [
    {
      id: "task-100",
      title: "Write adapter code",
      priority: "high",
      estimatedMinutes: 60,
    },
  ],
};

const reportParams: ReportParams = {
  timeframeStart: 1000,
  timeframeEnd: 2000,
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

beforeEach(() => {
  vi.clearAllMocks();
  mockGetApiKey.mockReturnValue("test-openai-key");
});

describe("ai-service orchestrator", () => {
  it("generateDailyPlan tags response with provider and model metadata", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(validPlan) } }],
    });

    const result = await generateDailyPlan(planRequest);

    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o-mini");
    expect(result.schedule).toHaveLength(1);
    expect(result.summary).toBe("A focused development sprint.");
  });

  it("generatePerformanceReport tags response with provider and model metadata", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(validReport) } }],
    });

    const result = await generatePerformanceReport(reportParams);

    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o-mini");
    expect(result.metrics.efficiencyScore).toBe(95);
  });

  it("testConnection tests active provider", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "Pong" } }],
    });

    const success = await testConnection();
    expect(success).toBe(true);
  });
});
