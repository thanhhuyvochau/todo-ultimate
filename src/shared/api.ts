import type { IpcChannelMap } from "./ipcChannels";
import type { IpcResult } from "./ipcResult";

export interface RendererApi {
  getTasks: (
    params: IpcChannelMap["tasks:getAll"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["tasks:getAll"]["response"]>>;
  createTask: (
    data: IpcChannelMap["tasks:create"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["tasks:create"]["response"]>>;
  updateTask: (
    data: IpcChannelMap["tasks:update"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["tasks:update"]["response"]>>;
  deleteTask: (
    id: IpcChannelMap["tasks:delete"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["tasks:delete"]["response"]>>;
  startTimer: (
    params: IpcChannelMap["timer:start"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["timer:start"]["response"]>>;
  pauseTimer: (
    params: IpcChannelMap["timer:pause"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["timer:pause"]["response"]>>;
  getActiveTimer: () => Promise<
    IpcResult<IpcChannelMap["timer:getActive"]["response"]>
  >;
  onTimerTick: (
    callback: (data: { taskId: string; elapsedSeconds: number }) => void,
  ) => () => void;
  generatePlan: (
    input: IpcChannelMap["ai:generatePlan"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["ai:generatePlan"]["response"]>>;
  generateReport: (
    params: IpcChannelMap["ai:generateReport"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["ai:generateReport"]["response"]>>;
  testConnection: (params?: {
    providerId?: string;
  }) => Promise<IpcResult<IpcChannelMap["ai:testConnection"]["response"]>>;
  getAiSettings: () => Promise<
    IpcResult<IpcChannelMap["ai:getSettings"]["response"]>
  >;
  updateAiSettings: (
    input: IpcChannelMap["ai:updateSettings"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["ai:updateSettings"]["response"]>>;
  setAiKey: (
    input: IpcChannelMap["ai:setKey"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["ai:setKey"]["response"]>>;
  deleteAiKey: (
    input: IpcChannelMap["ai:deleteKey"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["ai:deleteKey"]["response"]>>;
  listReports: () => Promise<
    IpcResult<IpcChannelMap["report:list"]["response"]>
  >;
  getReport: (
    params: IpcChannelMap["report:get"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["report:get"]["response"]>>;
  deleteReport: (
    params: IpcChannelMap["report:delete"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["report:delete"]["response"]>>;
  setApiKey: (
    apiKey: IpcChannelMap["key:set"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["key:set"]["response"]>>;
  getApiKey: () => Promise<IpcResult<IpcChannelMap["key:get"]["response"]>>;
  deleteApiKey: () => Promise<
    IpcResult<IpcChannelMap["key:delete"]["response"]>
  >;
  getRecurringRules: () => Promise<
    IpcResult<IpcChannelMap["recurring:getAll"]["response"]>
  >;
  createRecurringRule: (
    data: IpcChannelMap["recurring:create"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["recurring:create"]["response"]>>;
  updateRecurringRule: (
    data: IpcChannelMap["recurring:update"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["recurring:update"]["response"]>>;
  deleteRecurringRule: (
    id: IpcChannelMap["recurring:delete"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["recurring:delete"]["response"]>>;
  toggleRecurringRule: (
    id: IpcChannelMap["recurring:toggle"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["recurring:toggle"]["response"]>>;
  getVarianceMetrics: (
    params: IpcChannelMap["metrics:getVariance"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["metrics:getVariance"]["response"]>>;
  getTaskVariance: (
    params: IpcChannelMap["metrics:getTaskVariance"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["metrics:getTaskVariance"]["response"]>>;
  getTodayPlan: () => Promise<
    IpcResult<IpcChannelMap["plan:getToday"]["response"]>
  >;
  approvePlan: (
    schedule: IpcChannelMap["plan:approve"]["request"]["schedule"],
  ) => Promise<IpcResult<IpcChannelMap["plan:approve"]["response"]>>;
  getGoogleCalendarSettings: () => Promise<
    IpcResult<IpcChannelMap["calendar:getSettings"]["response"]>
  >;
  updateGoogleCalendarSettings: (
    input: IpcChannelMap["calendar:updateSettings"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["calendar:updateSettings"]["response"]>>;
  connectGoogleCalendar: () => Promise<
    IpcResult<IpcChannelMap["calendar:connect"]["response"]>
  >;
  syncGoogleCalendar: () => Promise<
    IpcResult<IpcChannelMap["calendar:sync"]["response"]>
  >;
  getTodayCalendarEvents: () => Promise<
    IpcResult<IpcChannelMap["calendar:getTodayEvents"]["response"]>
  >;
  getTodayCalendarConflicts: () => Promise<
    IpcResult<IpcChannelMap["calendar:getTodayConflicts"]["response"]>
  >;
}
