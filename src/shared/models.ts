export type TaskStatus = "todo" | "in_progress" | "completed";

export type TaskPriority = "low" | "medium" | "high";

export type TaskType = "recurring" | "manual";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedMinutes: number;
  actualMinutes: number | null;
  isRecurringChild: boolean;
  recurringRuleId: string | null;
  scheduledDate: number | null;
  completedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface TimeLog {
  id: string;
  taskId: string;
  startedAt: number;
  pausedAt: number | null;
  durationMinutes: number | null;
}

export type RecurringFrequency = "daily" | "weekly" | "monthly";

export interface RecurringRule {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  estimatedMinutes: number;
  frequency: RecurringFrequency;
  timeAnchor: number | null;
  daysOfWeek: number[] | null;
  dayOfMonth: number | null;
  isActive: boolean;
  lastInstantiatedDate: number | null;
  createdAt: number;
}

export interface DailyPlan {
  id: string;
  date: number;
  focusHours: number | null;
  primaryGoal: string | null;
  planJson: string;
  isApproved: boolean;
  createdAt: number;
}

export interface PerformanceReport {
  id: string;
  timeframeStart: number;
  timeframeEnd: number;
  reportJson: string;
  promptVersion: string;
  createdAt: number;
}

export interface PerformanceReportSummary {
  id: string;
  timeframeStart: number;
  timeframeEnd: number;
  promptVersion: string;
  createdAt: number;
  efficiencyScore: number;
  totalCompleted: number;
}

export interface AIScheduleInput {
  focusHours: number;
  primaryGoal: string;
  fixedBlocks?: {
    taskId: string;
    title: string;
    startTime: number;
    durationMinutes: number;
  }[];
  historicalVariance?: VarianceMetrics;
}

export interface PlannedTaskBlock {
  taskId: string;
  title: string;
  priority: TaskPriority;
  estimatedMinutes: number;
  budgetedMinutes: number;
  scheduledStart: number;
  isFixed: boolean;
  rationale: string;
}

export interface DailyPlanSchedule {
  date: number;
  focusHours: number;
  primaryGoal: string;
  schedule: PlannedTaskBlock[];
  unscheduledTasks: string[];
  summary: string;
}

export interface DailyPlanRequest {
  focusHours: number;
  primaryGoal: string;
  tasks: {
    id: string;
    title: string;
    priority: TaskPriority;
    estimatedMinutes: number;
  }[];
  fixedBlocks?: AIScheduleInput["fixedBlocks"];
  historicalVariance?: VarianceMetrics;
}

export interface PriorityMetrics {
  meanVariance: number;
  meanVarianceRatio: number | null;
  count: number;
}

export interface ReportMetrics {
  totalCompleted: number;
  overallVariance: number;
  meanAbsoluteVariance: number;
  byPriority: Record<TaskPriority, PriorityMetrics>;
  efficiencyScore: number;
  trendDirection: "improving" | "declining" | "stable";
}

export interface ReportPattern {
  title: string;
  description: string;
  severity: "info" | "warning" | "positive";
}

export interface ReportAdvice {
  category: "estimation" | "priority" | "scheduling" | "focus";
  recommendation: string;
  actionableTip: string;
}

export interface PerformanceReportContent {
  timeframe: { start: number; end: number };
  generatedAt: number;
  metrics: ReportMetrics;
  patterns: ReportPattern[];
  advice: ReportAdvice[];
  summary: string;
}

export interface ReportParams {
  timeframeStart: number;
  timeframeEnd: number;
  completedTasks: {
    id: string;
    title: string;
    priority: TaskPriority;
    estimatedMinutes: number;
    actualMinutes: number;
  }[];
  metrics: VarianceMetrics;
}

export interface TaskVariance {
  taskId: string;
  estimatedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
  varianceRatio: number | null;
  isOutlier: boolean;
}

export interface VarianceBucket {
  meanVariance: number;
  meanVarianceRatio: number | null;
  count: number;
  outlierCount: number;
}

export interface VarianceMetrics {
  totalCompleted: number;
  overallMeanVariance: number;
  overallMeanAbsoluteVariance: number;
  overallMeanVarianceRatio: number | null;
  byPriority: Record<TaskPriority, VarianceBucket>;
  byTaskType: Record<TaskType, VarianceBucket>;
  underestimationRate: number;
  overestimationRate: number;
  onPointRate: number;
  outlierCount: number;
}
