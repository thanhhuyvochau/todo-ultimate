import type { IpcChannelMap } from "@/shared/ipcChannels";
import type { IpcResult } from "@/shared/ipcResult";
import { ok, fail } from "@/shared/ipcResult";
import * as taskRepo from "@/main/db/task-repository";
import * as keychainService from "@/main/services/keychain-service";

type HandlerMap = {
  [K in keyof IpcChannelMap]: (
    request: IpcChannelMap[K]["request"],
  ) => IpcResult<IpcChannelMap[K]["response"]>;
};

export const handlers: HandlerMap = {
  "tasks:getAll": ({ status }) => {
    try {
      const tasks = taskRepo.getTasks(status);
      return ok(tasks);
    } catch (err) {
      return fail("DB_READ_FAILED", "Failed to fetch tasks.");
    }
  },

  "tasks:create": (data) => {
    try {
      const task = taskRepo.createTask(data);
      return ok(task);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "VALIDATION_ERROR") {
        return fail("VALIDATION_ERROR", error.message ?? "Invalid task data.");
      }
      return fail("DB_WRITE_FAILED", "Failed to create task.");
    }
  },

  "tasks:update": (data) => {
    try {
      const task = taskRepo.updateTask(data);
      return ok(task);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "NOT_FOUND") {
        return fail("NOT_FOUND", error.message ?? "Task not found.");
      }
      return fail("DB_WRITE_FAILED", "Failed to update task.");
    }
  },

  "tasks:delete": ({ id }) => {
    try {
      const result = taskRepo.deleteTask(id);
      return ok(result);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "NOT_FOUND") {
        return fail("NOT_FOUND", error.message ?? "Task not found.");
      }
      return fail("DB_WRITE_FAILED", "Failed to delete task.");
    }
  },

  "timer:start": () => {
    return fail("NOT_IMPLEMENTED", "Timer service is not yet implemented.");
  },

  "timer:pause": () => {
    return fail("NOT_IMPLEMENTED", "Timer service is not yet implemented.");
  },

  "ai:generatePlan": () => {
    return fail(
      "NOT_IMPLEMENTED",
      "AI planning service is not yet implemented.",
    );
  },

  "ai:generateReport": () => {
    return fail("NOT_IMPLEMENTED", "AI report service is not yet implemented.");
  },

  "key:set": ({ apiKey }) => {
    try {
      keychainService.setApiKey(apiKey);
      return ok({ success: true });
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "KEYCHAIN_UNAVAILABLE") {
        return fail(
          "KEYCHAIN_UNAVAILABLE",
          error.message ?? "Keychain unavailable.",
        );
      }
      if (error.code === "KEYCHAIN_WRITE_FAILED") {
        return fail(
          "KEYCHAIN_WRITE_FAILED",
          error.message ?? "Failed to write API key.",
        );
      }
      return fail("INTERNAL_ERROR", "Failed to save API key.");
    }
  },

  "key:get": () => {
    try {
      const hasKey = keychainService.isApiKeySet();
      return ok({ hasKey });
    } catch (err) {
      return fail("INTERNAL_ERROR", "Failed to check API key status.");
    }
  },

  "key:delete": () => {
    try {
      keychainService.deleteApiKey();
      return ok({ success: true });
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "KEYCHAIN_UNAVAILABLE") {
        return fail(
          "KEYCHAIN_UNAVAILABLE",
          error.message ?? "Keychain unavailable.",
        );
      }
      if (error.code === "KEYCHAIN_WRITE_FAILED") {
        return fail(
          "KEYCHAIN_WRITE_FAILED",
          error.message ?? "Failed to delete API key file.",
        );
      }
      return fail("INTERNAL_ERROR", "Failed to delete API key.");
    }
  },
};
