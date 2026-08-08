import type {
  Task,
  TaskStatus,
  DailyPlan,
  PerformanceReport,
  AIScheduleInput,
} from "./models";

export interface IpcChannelMap {
  "tasks:getAll": { request: { status?: TaskStatus }; response: Task[] };
  "tasks:create": { request: Omit<Task, "id">; response: Task };
  "tasks:update": { request: Partial<Task> & { id: string }; response: Task };
  "tasks:delete": { request: { id: string }; response: { success: boolean } };
  "timer:start": { request: { taskId: string }; response: { logId: string } };
  "timer:pause": {
    request: { taskId: string };
    response: { durationMinutes: number };
  };
  "ai:generatePlan": { request: AIScheduleInput; response: DailyPlan };
  "ai:generateReport": {
    request: { timeframeDays: number };
    response: PerformanceReport;
  };
  "key:set": { request: { apiKey: string }; response: { success: boolean } };
  "key:get": { request: object; response: { hasKey: boolean } };
  "key:delete": { request: object; response: { success: boolean } };
}

export type IpcChannelName = keyof IpcChannelMap;
