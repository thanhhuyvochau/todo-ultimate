---
name: ipc-bridge-protocol
description: Governs the type-safe IPC bridge interface between Main (src/main/) and Renderer (src/renderer/), including the typed channel map, preload contextBridge exposure, and standardized error handling.
---

# SKILL: Type-Safe IPC Bridge & Protocol Contract

This skill governs the IPC bridge interface between Main (`src/main/`) and Renderer (`src/renderer/`).

## 1. Type-Safe Channel Map (`src/shared/ipcChannels.ts`)

Define all IPC channels in a single strongly typed interface:

```ts
export interface IpcChannelMap {
  'tasks:getAll': { request: { status?: TaskStatus }; response: Task[] };
  'tasks:create': { request: Omit<Task, 'id'>; response: Task };
  'timer:start': { request: { taskId: string }; response: { success: boolean } };
}
```

## 2. Preload & ContextBridge (`src/main/preload.ts`)

- **Security Constraints:** Keep `contextIsolation: true` and `nodeIntegration: false`.
- **Safe Expose:** Only expose typed functions through `contextBridge.exposeInMainWorld('api', ...)`:

```ts
contextBridge.exposeInMainWorld('api', {
  getTasks: (params) => ipcRenderer.invoke('tasks:getAll', params),
  createTask: (data) => ipcRenderer.invoke('tasks:create', data),
});
```

## 3. Error Handling across IPC

- **Never Throw Uncaught Errors:** IPC handlers in the main process must catch all exceptions and return a standardized result wrapper:

```ts
export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```
