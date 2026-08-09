import { contextBridge, ipcRenderer } from "electron";
import type { RendererApi } from "../shared/api";

const api: RendererApi = {
  getTasks: (params) => ipcRenderer.invoke("tasks:getAll", params),
  createTask: (data) => ipcRenderer.invoke("tasks:create", data),
  updateTask: (data) => ipcRenderer.invoke("tasks:update", data),
  deleteTask: (params) => ipcRenderer.invoke("tasks:delete", params),
  startTimer: (params) => ipcRenderer.invoke("timer:start", params),
  pauseTimer: (params) => ipcRenderer.invoke("timer:pause", params),
  generatePlan: (input) => ipcRenderer.invoke("ai:generatePlan", input),
  generateReport: (params) => ipcRenderer.invoke("ai:generateReport", params),
  setApiKey: (params) => ipcRenderer.invoke("key:set", params),
  getApiKey: () => ipcRenderer.invoke("key:get", {}),
  deleteApiKey: () => ipcRenderer.invoke("key:delete", {}),
  getRecurringRules: () => ipcRenderer.invoke("recurring:getAll", {}),
  createRecurringRule: (data) => ipcRenderer.invoke("recurring:create", data),
  updateRecurringRule: (data) => ipcRenderer.invoke("recurring:update", data),
  deleteRecurringRule: (params) =>
    ipcRenderer.invoke("recurring:delete", params),
  toggleRecurringRule: (params) =>
    ipcRenderer.invoke("recurring:toggle", params),
};

contextBridge.exposeInMainWorld("api", api);
