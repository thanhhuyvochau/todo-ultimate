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

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  estimatedMinutes: number;
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

export interface CreateRuleInput {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  estimatedMinutes: number;
  frequency: RecurringFrequency;
  timeAnchor?: number | null;
  daysOfWeek?: number[] | null;
  dayOfMonth?: number | null;
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
  calendarEvents?: CalendarEventBlock[];
  historicalVariance?: VarianceMetrics;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  gcalEventId: string;
  title: string;
  startTime: number;
  endTime: number;
  status: "confirmed" | "tentative";
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEventBlock {
  eventId: string;
  title: string;
  startTime: number;
  endTime: number;
}

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
  selected: boolean;
}

export interface GoogleCalendarSettings {
  isAvailable: boolean;
  isConnected: boolean;
  calendars: GoogleCalendarInfo[];
  selectedCalendarIds: string[];
  lastSyncedAt: number | null;
  syncError: string | null;
}

export interface UpdateGoogleCalendarSettingsInput {
  selectedCalendarIds?: string[];
}

export interface CalendarConflict {
  event: CalendarEvent;
  taskId: string;
  taskTitle: string;
  scheduledStart: number;
  scheduledEnd: number;
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
  provider?: AiProviderId;
  model?: string;
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
  calendarEvents?: CalendarEventBlock[];
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
  provider?: AiProviderId;
  model?: string;
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

export type AiProviderId =
  "deepseek" | "openai" | "anthropic" | "gemini" | "custom";

export interface ProviderPreset {
  id: AiProviderId;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  presetModels: string[];
  isCustomUrlAllowed: boolean;
  requiresKey: boolean;
}

export interface ProviderConfig {
  providerId: AiProviderId;
  selectedModel: string;
  baseUrl?: string;
  hasKey: boolean;
}

export interface AiSettings {
  activeProvider: AiProviderId;
  providers: Record<AiProviderId, ProviderConfig>;
}

export interface UpdateAiSettingsInput {
  activeProvider?: AiProviderId;
  providerConfig?: {
    providerId: AiProviderId;
    selectedModel?: string;
    baseUrl?: string;
  };
}

export interface AiKeyInput {
  providerId: AiProviderId;
  apiKey: string;
}

export interface AiKeyDeleteInput {
  providerId: AiProviderId;
}

export const DEFAULT_PROVIDER_PRESETS: Record<AiProviderId, ProviderPreset> = {
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    presetModels: ["deepseek-chat", "deepseek-reasoner"],
    isCustomUrlAllowed: true,
    requiresKey: true,
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    presetModels: ["gpt-4o", "gpt-4o-mini", "gpt-4.5-preview", "o3-mini"],
    isCustomUrlAllowed: true,
    requiresKey: true,
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-7-sonnet-latest",
    presetModels: [
      "claude-3-7-sonnet-latest",
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest",
    ],
    isCustomUrlAllowed: false,
    requiresKey: true,
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.0-flash",
    presetModels: [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-pro",
    ],
    isCustomUrlAllowed: false,
    requiresKey: true,
  },
  custom: {
    id: "custom",
    name: "Custom / Local (Ollama)",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    presetModels: ["llama3.2", "mistral", "qwen2.5", "deepseek-r1"],
    isCustomUrlAllowed: true,
    requiresKey: false,
  },
};
