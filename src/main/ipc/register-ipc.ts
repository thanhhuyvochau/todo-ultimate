import { ipcMain } from "electron";
import type { IpcChannelName } from "@/shared/ipcChannels";
import type { IpcChannelMap } from "@/shared/ipcChannels";
import type { IpcResult } from "@/shared/ipcResult";
import { fail } from "@/shared/ipcResult";

type HandlerMap = {
  [K in keyof IpcChannelMap]: (
    request: IpcChannelMap[K]["request"],
  ) => IpcResult<IpcChannelMap[K]["response"]>;
};

export function registerIpcHandlers(handlers: HandlerMap): void {
  for (const channel of Object.keys(handlers) as IpcChannelName[]) {
    const handler = handlers[channel]!;
    ipcMain.handle(channel, async (_event, request) => {
      try {
        return handler(request as never);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected IPC error.";
        return fail("INTERNAL_ERROR", message);
      }
    });
  }
}
