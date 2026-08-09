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
    taskId: IpcChannelMap["timer:start"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["timer:start"]["response"]>>;
  pauseTimer: (
    taskId: IpcChannelMap["timer:pause"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["timer:pause"]["response"]>>;
  generatePlan: (
    input: IpcChannelMap["ai:generatePlan"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["ai:generatePlan"]["response"]>>;
  generateReport: (
    timeframeDays: IpcChannelMap["ai:generateReport"]["request"],
  ) => Promise<IpcResult<IpcChannelMap["ai:generateReport"]["response"]>>;
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
}
