import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // TODO: Add typed IPC channels here per IpcChannelMap
});
