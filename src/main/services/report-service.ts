import type {
  PerformanceReportContent,
  PerformanceReportSummary,
  ReportParams,
} from "@/shared/models";
import { getCompletedTasks } from "@/main/db/task-repository";
import { getVarianceMetrics } from "@/main/services/variance-service";
import * as deepseekService from "@/main/services/deepseekService";
import * as reportRepo from "@/main/db/performance-report-repository";
import { REPORT_PROMPT_VERSION } from "@/main/services/prompts";

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

  const report = await deepseekService.generatePerformanceReport(reportParams);

  reportRepo.saveReport(
    JSON.stringify(report),
    params.timeframeStart,
    params.timeframeEnd,
    REPORT_PROMPT_VERSION,
  );

  return report;
}

function parseCachedReport(
  report: ReturnType<typeof reportRepo.getById>,
): PerformanceReportContent | null {
  if (!report) {
    return null;
  }
  try {
    return JSON.parse(report.reportJson) as PerformanceReportContent;
  } catch {
    console.warn(
      `Skipping corrupted cached report ${report.id}: invalid JSON.`,
    );
    return null;
  }
}

export function listReports(): PerformanceReportSummary[] {
  const summaries: PerformanceReportSummary[] = [];
  for (const report of reportRepo.listAll()) {
    const parsed = parseCachedReport(report);
    if (!parsed) {
      continue;
    }
    summaries.push({
      id: report.id,
      timeframeStart: report.timeframeStart,
      timeframeEnd: report.timeframeEnd,
      promptVersion: report.promptVersion,
      createdAt: report.createdAt,
      efficiencyScore: parsed.metrics.efficiencyScore,
      totalCompleted: parsed.metrics.totalCompleted,
    });
  }
  return summaries;
}

export function getCachedReport(id: string): PerformanceReportContent {
  const report = reportRepo.getById(id);
  if (!report) {
    throw Object.assign(new Error("Cached report not found."), {
      code: "NOT_FOUND",
    });
  }
  const parsed = parseCachedReport(report);
  if (!parsed) {
    throw Object.assign(new Error("Cached report is corrupted."), {
      code: "REPORT_CORRUPTED",
    });
  }
  return parsed;
}

export function deleteReport(id: string): { success: boolean } {
  const deleted = reportRepo.deleteById(id);
  if (!deleted) {
    throw Object.assign(new Error("Cached report not found."), {
      code: "NOT_FOUND",
    });
  }
  return { success: true };
}
