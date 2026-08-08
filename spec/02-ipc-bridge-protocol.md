# Type-Safe IPC Bridge Protocol

## Overview
Define a fully typed IPC contract between the Electron Main Process and Renderer Process. All communication must flow through `contextBridge` in `preload.ts` with a shared `IpcChannelMap` interface, ensuring compile-time safety for both sides.

## Requirements
- Single source of truth: `src/shared/ipcChannels.ts` exports `IpcChannelMap`.
- Main process handlers use `ipcMain.handle(channel, handler)` with typed parameters.
- Renderer accesses via `window.api` exposed by `preload.ts`.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- All handlers return `IpcResult<T>` — never throw across the bridge.

## IpcChannelMap Interface

```ts
export interface IpcChannelMap {
  'tasks:getAll':    { request: { status?: TaskStatus }; response: Task[] };
  'tasks:create':    { request: Omit<Task, 'id'>; response: Task };
  'tasks:update':    { request: Partial<Task> & { id: string }; response: Task };
  'tasks:delete':    { request: { id: string }; response: { success: boolean } };
  'timer:start':     { request: { taskId: string }; response: { logId: string } };
  'timer:pause':     { request: { taskId: string }; response: { durationMinutes: number } };
  'ai:generatePlan': { request: AIScheduleInput; response: DailyPlan };
  'ai:generateReport': { request: { timeframeDays: number }; response: PerformanceReport };
  'key:set':         { request: { apiKey: string }; response: { success: boolean } };
  'key:get':         { request: {}; response: { hasKey: boolean } };
  'key:delete':      { request: {}; response: { success: boolean } };
}
```

## Preload API Surface

```ts
contextBridge.exposeInMainWorld('api', {
  getTasks: (params) => ipcRenderer.invoke('tasks:getAll', params),
  createTask: (data) => ipcRenderer.invoke('tasks:create', data),
  updateTask: (data) => ipcRenderer.invoke('tasks:update', data),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', { id }),
  startTimer: (taskId) => ipcRenderer.invoke('timer:start', { taskId }),
  pauseTimer: (taskId) => ipcRenderer.invoke('timer:pause', { taskId }),
  generatePlan: (input) => ipcRenderer.invoke('ai:generatePlan', input),
  generateReport: (timeframeDays) => ipcRenderer.invoke('ai:generateReport', { timeframeDays }),
  setApiKey: (apiKey) => ipcRenderer.invoke('key:set', { apiKey }),
  getApiKey: () => ipcRenderer.invoke('key:get', {}),
  deleteApiKey: () => ipcRenderer.invoke('key:delete', {}),
});
```

## IpcResult Wrapper

```ts
export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

## Error Handling
- Every IPC handler wraps logic in try/catch and returns `IpcResult`.
- Common error codes: `DB_READ_FAILED`, `DB_WRITE_FAILED`, `VALIDATION_ERROR`, `STATE_TRANSITION_ILLEGAL`, `AI_TIMEOUT`, `KEYCHAIN_UNAVAILABLE`.
- Renderer must check `result.ok` before accessing `.data`.

## Dependencies
- Feature 1 (Database), Feature 3 (safeStorage)

## Acceptance Criteria
- [ ] All channels defined in `IpcChannelMap` and implemented in main process.
- [ ] `window.api` typed correctly in renderer (no `any`).
- [ ] No direct Node.js imports in renderer.
- [ ] All handlers catch errors and return `IpcResult`.
- [ ] Preload exposes no extra surface beyond `contextBridge`.
