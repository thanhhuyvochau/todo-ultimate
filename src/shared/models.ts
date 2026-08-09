export type TaskStatus = "todo" | "in_progress" | "completed";

export type TaskPriority = "low" | "medium" | "high";

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

export interface AIScheduleInput {
  focusHours: number;
  primaryGoal: string;
}
