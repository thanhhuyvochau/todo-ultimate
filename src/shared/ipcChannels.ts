import type {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskInput,
  DailyPlan,
  DailyPlanSchedule,
  PerformanceReportContent,
  PerformanceReportSummary,
  AIScheduleInput,
  RecurringRule,
  CreateRuleInput,
  TaskVariance,
  VarianceMetrics,
} from "./models";

export interface IpcChannelMap {
  "tasks:getAll": {
    request: { status?: TaskStatus; priority?: TaskPriority; query?: string };
    response: Task[];
  };
  "tasks:create": { request: CreateTaskInput; response: Task };
  "tasks:update": { request: Partial<Task> & { id: string }; response: Task };
  "tasks:delete": { request: { id: string }; response: { success: boolean } };
  "timer:start": { request: { taskId: string }; response: { logId: string } };
  "timer:pause": {
    request: { taskId?: string };
    response: { durationMinutes: number };
  };
  "timer:getActive": {
    request: object;
    response: {
      taskId: string;
      logId: string;
      startedAt: number;
      elapsedSeconds: number;
    } | null;
  };
  "ai:generatePlan": { request: AIScheduleInput; response: DailyPlanSchedule };
  "ai:generateReport": {
    request: { timeframeStart: number; timeframeEnd: number };
    response: PerformanceReportContent;
  };
  "ai:testConnection": { request: object; response: { success: boolean } };
  "report:list": { request: object; response: PerformanceReportSummary[] };
  "report:get": { request: { id: string }; response: PerformanceReportContent };
  "report:delete": {
    request: { id: string };
    response: { success: boolean };
  };
  "key:set": { request: { apiKey: string }; response: { success: boolean } };
  "key:get": { request: object; response: { hasKey: boolean } };
  "key:delete": { request: object; response: { success: boolean } };
  "recurring:getAll": { request: object; response: RecurringRule[] };
  "recurring:create": {
    request: CreateRuleInput;
    response: RecurringRule;
  };
  "recurring:update": {
    request: Partial<RecurringRule> & { id: string };
    response: RecurringRule;
  };
  "recurring:delete": {
    request: { id: string };
    response: { success: boolean };
  };
  "recurring:toggle": {
    request: { id: string };
    response: RecurringRule;
  };
  "metrics:getVariance": {
    request: { timeframeStart?: number; timeframeEnd?: number };
    response: VarianceMetrics;
  };
  "metrics:getTaskVariance": {
    request: { taskId: string };
    response: TaskVariance | null;
  };
  "plan:getToday": {
    request: object;
    response: DailyPlan | null;
  };
  "plan:approve": {
    request: { schedule: DailyPlanSchedule };
    response: DailyPlan;
  };
}

export type IpcChannelName = keyof IpcChannelMap;
