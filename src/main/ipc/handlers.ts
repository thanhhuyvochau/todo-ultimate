import type { IpcChannelMap } from "@/shared/ipcChannels";
import type { IpcResult } from "@/shared/ipcResult";
import { ok, fail } from "@/shared/ipcResult";
import * as taskRepo from "@/main/db/task-repository";
import * as recurringRuleRepo from "@/main/db/recurring-rule-repository";
import * as keychainService from "@/main/services/keychain-service";

type HandlerMap = {
  [K in keyof IpcChannelMap]: (
    request: IpcChannelMap[K]["request"],
  ) => IpcResult<IpcChannelMap[K]["response"]>;
};

export const handlers: HandlerMap = {
  "tasks:getAll": (filters) => {
    try {
      const tasks = taskRepo.getTasks(filters);
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
      if (error.code === "VALIDATION_ERROR") {
        return fail("VALIDATION_ERROR", error.message ?? "Invalid task data.");
      }
      if (error.code === "STATE_TRANSITION_ILLEGAL") {
        return fail(
          "STATE_TRANSITION_ILLEGAL",
          error.message ?? "Invalid status transition.",
        );
      }
      if (error.code === "TASK_ALREADY_ACTIVE") {
        return fail(
          "TASK_ALREADY_ACTIVE",
          error.message ?? "Another task is already in progress.",
        );
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

  "recurring:getAll": () => {
    try {
      const rules = recurringRuleRepo.getAllRules();
      return ok(rules);
    } catch (err) {
      return fail("DB_READ_FAILED", "Failed to fetch recurring rules.");
    }
  },

  "recurring:create": (data) => {
    try {
      const rule = recurringRuleRepo.createRule(data);
      return ok(rule);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "VALIDATION_ERROR") {
        return fail(
          "VALIDATION_ERROR",
          error.message ?? "Invalid recurring rule data.",
        );
      }
      return fail("DB_WRITE_FAILED", "Failed to create recurring rule.");
    }
  },

  "recurring:update": (data) => {
    try {
      const rule = recurringRuleRepo.updateRule(data);
      return ok(rule);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "NOT_FOUND") {
        return fail("NOT_FOUND", error.message ?? "Recurring rule not found.");
      }
      if (error.code === "VALIDATION_ERROR") {
        return fail(
          "VALIDATION_ERROR",
          error.message ?? "Invalid recurring rule data.",
        );
      }
      return fail("DB_WRITE_FAILED", "Failed to update recurring rule.");
    }
  },

  "recurring:delete": ({ id }) => {
    try {
      const result = recurringRuleRepo.deleteRule(id);
      return ok(result);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "NOT_FOUND") {
        return fail("NOT_FOUND", error.message ?? "Recurring rule not found.");
      }
      return fail("DB_WRITE_FAILED", "Failed to delete recurring rule.");
    }
  },

  "recurring:toggle": ({ id }) => {
    try {
      const rule = recurringRuleRepo.toggleActive(id);
      return ok(rule);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "NOT_FOUND") {
        return fail("NOT_FOUND", error.message ?? "Recurring rule not found.");
      }
      return fail("DB_WRITE_FAILED", "Failed to toggle recurring rule.");
    }
  },
};
