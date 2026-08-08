import type { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      // TODO: Add typed API methods here per IpcChannelMap
    };
  }
}
