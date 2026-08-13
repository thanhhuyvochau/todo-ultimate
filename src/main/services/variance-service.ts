import type {
  Task,
  TaskPriority,
  TaskType,
  TaskVariance,
  VarianceBucket,
  VarianceMetrics,
} from "@/shared/models";
import * as taskRepo from "@/main/db/task-repository";

const ON_POINT_TOLERANCE_MINUTES = 5;
const OUTLIER_RATIO_THRESHOLD = 10;

const EMPTY_BUCKET: VarianceBucket = {
  meanVariance: 0,
  meanVarianceRatio: null,
  count: 0,
  outlierCount: 0,
};

function buildEmptyMetrics(): VarianceMetrics {
  return {
    totalCompleted: 0,
    overallMeanVariance: 0,
    overallMeanAbsoluteVariance: 0,
    overallMeanVarianceRatio: null,
    byPriority: {
      low: { ...EMPTY_BUCKET },
      medium: { ...EMPTY_BUCKET },
      high: { ...EMPTY_BUCKET },
    },
    byTaskType: {
      recurring: { ...EMPTY_BUCKET },
      manual: { ...EMPTY_BUCKET },
    },
    underestimationRate: 0,
    overestimationRate: 0,
    onPointRate: 0,
    outlierCount: 0,
  };
}

function computeTaskVariance(task: Task): TaskVariance | null {
  if (task.actualMinutes === null || task.estimatedMinutes <= 0) {
    return null;
  }
  const varianceMinutes = task.actualMinutes - task.estimatedMinutes;
  const varianceRatio =
    task.estimatedMinutes > 0
      ? task.actualMinutes / task.estimatedMinutes
      : null;
  const isOutlier =
    task.actualMinutes > task.estimatedMinutes * OUTLIER_RATIO_THRESHOLD;

  return {
    taskId: task.id,
    estimatedMinutes: task.estimatedMinutes,
    actualMinutes: task.actualMinutes,
    varianceMinutes,
    varianceRatio,
    isOutlier,
  };
}

function aggregateBucket(variances: TaskVariance[]): VarianceBucket {
  if (variances.length === 0) {
    return { ...EMPTY_BUCKET };
  }
  const total = variances.reduce((sum, v) => sum + v.varianceMinutes, 0);
  const ratios = variances
    .filter((v) => v.varianceRatio !== null)
    .map((v) => v.varianceRatio as number);
  const outlierCount = variances.filter((v) => v.isOutlier).length;

  return {
    meanVariance: total / variances.length,
    meanVarianceRatio:
      ratios.length > 0
        ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length
        : null,
    count: variances.length,
    outlierCount,
  };
}

export function getTaskVariance(taskId: string): TaskVariance | null {
  const task = taskRepo.getTasks().find((t) => t.id === taskId);
  if (!task) {
    return null;
  }
  return computeTaskVariance(task);
}

export function getVarianceMetrics(timeframe?: {
  start?: number;
  end?: number;
}): VarianceMetrics {
  const tasks = taskRepo.getCompletedTasks(timeframe);
  const metrics = buildEmptyMetrics();

  const entries: { task: Task; variance: TaskVariance }[] = [];
  for (const task of tasks) {
    const variance = computeTaskVariance(task);
    if (variance) {
      entries.push({ task, variance });
    }
  }

  if (entries.length === 0) {
    return metrics;
  }

  const variances = entries.map((e) => e.variance);
  const total = variances.reduce((sum, v) => sum + v.varianceMinutes, 0);
  const totalAbs = variances.reduce(
    (sum, v) => sum + Math.abs(v.varianceMinutes),
    0,
  );
  const ratios = variances
    .filter((v) => v.varianceRatio !== null)
    .map((v) => v.varianceRatio as number);

  metrics.totalCompleted = variances.length;
  metrics.overallMeanVariance = total / variances.length;
  metrics.overallMeanAbsoluteVariance = totalAbs / variances.length;
  metrics.overallMeanVarianceRatio =
    ratios.length > 0
      ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length
      : null;
  metrics.underestimationRate =
    variances.filter((v) => v.varianceMinutes > 0).length / variances.length;
  metrics.overestimationRate =
    variances.filter((v) => v.varianceMinutes < 0).length / variances.length;
  metrics.onPointRate =
    variances.filter(
      (v) => Math.abs(v.varianceMinutes) <= ON_POINT_TOLERANCE_MINUTES,
    ).length / variances.length;
  metrics.outlierCount = variances.filter((v) => v.isOutlier).length;

  const byPriorityEntries: Record<TaskPriority, TaskVariance[]> = {
    low: [],
    medium: [],
    high: [],
  };
  const byTaskTypeEntries: Record<TaskType, TaskVariance[]> = {
    recurring: [],
    manual: [],
  };

  for (const { task, variance } of entries) {
    byPriorityEntries[task.priority].push(variance);
    byTaskTypeEntries[task.isRecurringChild ? "recurring" : "manual"].push(
      variance,
    );
  }

  metrics.byPriority = {
    low: aggregateBucket(byPriorityEntries.low),
    medium: aggregateBucket(byPriorityEntries.medium),
    high: aggregateBucket(byPriorityEntries.high),
  };
  metrics.byTaskType = {
    recurring: aggregateBucket(byTaskTypeEntries.recurring),
    manual: aggregateBucket(byTaskTypeEntries.manual),
  };

  return metrics;
}

export function formatVarianceContext(metrics: VarianceMetrics): string {
  const sign = metrics.overallMeanVariance > 0 ? "+" : "";
  const roundedBias = Math.round(metrics.overallMeanVariance);
  const bias = `${sign}${roundedBias} min`;
  const tendency =
    metrics.overallMeanVariance > 0
      ? "tendency to underestimate"
      : metrics.overallMeanVariance < 0
        ? "tendency to overestimate"
        : "on target";

  const highRatio = metrics.byPriority.high.meanVarianceRatio;
  const ratioLine =
    highRatio !== null
      ? `- High-priority tasks: ${highRatio.toFixed(1)}x actual/estimated ratio`
      : null;

  const onPointPct = Math.round(metrics.onPointRate * 100);

  return [
    "Historical estimation accuracy:",
    `- Overall bias: ${bias} (${tendency})`,
    ...(ratioLine ? [ratioLine] : []),
    `- ${onPointPct}% of estimates within 5 min accuracy`,
  ].join("\n");
}
