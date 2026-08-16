import type { PerformanceReportContent, ReportParams } from "@/shared/models";
import { getCompletedTasks } from "@/main/db/task-repository";
import { getVarianceMetrics } from "@/main/services/variance-service";
import * as deepseekService from "@/main/services/deepseekService";

export interface GenerateReportParams {
  timeframeStart: number;
  timeframeEnd: number;
}

function buildEmptyReport(
  params: GenerateReportParams,
): PerformanceReportContent {
  return {
    timeframe: { start: params.timeframeStart, end: params.timeframeEnd },
    generatedAt: Date.now(),
    metrics: {
      totalCompleted: 0,
      overallVariance: 0,
      meanAbsoluteVariance: 0,
      byPriority: {
        low: { meanVariance: 0, meanVarianceRatio: null, count: 0 },
        medium: { meanVariance: 0, meanVarianceRatio: null, count: 0 },
        high: { meanVariance: 0, meanVarianceRatio: null, count: 0 },
      },
      efficiencyScore: 0,
      trendDirection: "stable",
    },
    patterns: [
      {
        title: "No completed tasks",
        description:
          "There are no completed tasks in this timeframe to analyze.",
        severity: "info",
      },
    ],
    advice: [
      {
        category: "focus",
        recommendation:
          "Complete and log a few tasks to unlock performance insights.",
        actionableTip:
          "Track your first tasks today, then generate a report afterward.",
      },
    ],
    summary:
      "No data available for this timeframe. Complete some tasks to receive coaching on your estimation accuracy.",
  };
}

export async function generateReport(
  params: GenerateReportParams,
): Promise<PerformanceReportContent> {
  if (
    typeof params.timeframeStart !== "number" ||
    typeof params.timeframeEnd !== "number" ||
    !Number.isFinite(params.timeframeStart) ||
    !Number.isFinite(params.timeframeEnd) ||
    params.timeframeStart >= params.timeframeEnd
  ) {
    throw Object.assign(new Error("Invalid report timeframe."), {
      code: "VALIDATION_ERROR",
    });
  }

  const completedTasks = getCompletedTasks({
    start: params.timeframeStart,
    end: params.timeframeEnd,
  });

  if (completedTasks.length === 0) {
    return buildEmptyReport(params);
  }

  const metrics = getVarianceMetrics({
    start: params.timeframeStart,
    end: params.timeframeEnd,
  });

  const reportParams: ReportParams = {
    timeframeStart: params.timeframeStart,
    timeframeEnd: params.timeframeEnd,
    completedTasks: completedTasks
      .filter((task) => task.actualMinutes !== null)
      .map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        estimatedMinutes: task.estimatedMinutes,
        actualMinutes: task.actualMinutes as number,
      })),
    metrics,
  };

  return deepseekService.generatePerformanceReport(reportParams);
}
