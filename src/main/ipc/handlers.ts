import type { IpcChannelMap } from "@/shared/ipcChannels";
import type { IpcErrorCode, IpcResult } from "@/shared/ipcResult";
import { ok, fail } from "@/shared/ipcResult";
import * as taskRepo from "@/main/db/task-repository";
import * as recurringRuleRepo from "@/main/db/recurring-rule-repository";
import * as keychainService from "@/main/services/keychain-service";
import * as timerService from "@/main/services/timer-service";
import * as varianceService from "@/main/services/variance-service";
import * as deepseekService from "@/main/services/deepseekService";
import * as dailyPlanService from "@/main/services/daily-plan-service";
import * as dailyPlanRepo from "@/main/db/daily-plan-repository";
import * as planApprovalService from "@/main/services/plan-approval-service";
import * as reportService from "@/main/services/report-service";
import * as settingsRepo from "@/main/db/settings-repository";
import { getStartOfDay } from "@/main/services/recurring-engine";

const AI_IPC_ERROR_CODES = new Set<string>([
  "AI_TIMEOUT",
  "AI_RATE_LIMITED",
  "AI_AUTH_FAILED",
  "AI_PARSE_ERROR",
  "AI_NETWORK_ERROR",
  "AI_REQUEST_FAILED",
  "VALIDATION_ERROR",
]);

function mapAiError(err: unknown): IpcResult<never> {
  const code = (err as { code?: string }).code;
  const message =
    (err as { message?: string }).message ?? "AI plan generation failed.";
  if (code && AI_IPC_ERROR_CODES.has(code)) {
    return fail(code as IpcErrorCode, message);
  }
  return fail("INTERNAL_ERROR", message);
}

type HandlerMap = {
  [K in keyof IpcChannelMap]: (
    request: IpcChannelMap[K]["request"],
  ) =>
    | IpcResult<IpcChannelMap[K]["response"]>
    | Promise<IpcResult<IpcChannelMap[K]["response"]>>;
};

export const handlers = {
  "tasks:getAll": (filters) => {
    try {
      const tasks = taskRepo.getTasks(filters);
      return ok(tasks);
    } catch {
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
      const task = timerService.updateTaskWithTimerEffects(data);
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

  "timer:start": ({ taskId }) => {
    try {
      const result = timerService.startTimer(taskId);
      return ok(result);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "NOT_FOUND") {
        return fail("NOT_FOUND", error.message ?? "Task not found.");
      }
      if (error.code === "STATE_TRANSITION_ILLEGAL") {
        return fail(
          "STATE_TRANSITION_ILLEGAL",
          error.message ?? "Invalid status transition.",
        );
      }
      return fail("TIMER_START_FAILED", "Failed to start timer.");
    }
  },

  "timer:pause": ({ taskId }) => {
    try {
      const result = timerService.pauseTimer(taskId);
      return ok(result);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "NOT_FOUND") {
        return fail("NOT_FOUND", error.message ?? "No active timer found.");
      }
      return fail("TIMER_PAUSE_FAILED", "Failed to pause timer.");
    }
  },

  "timer:getActive": (_request) => {
    try {
      const active = timerService.getActiveTimer();
      return ok(active);
    } catch {
      return fail("TIMER_READ_FAILED", "Failed to fetch active timer.");
    }
  },

  "ai:generatePlan": async (input) => {
    try {
      const plan = await dailyPlanService.generateDailyPlan({
        focusHours: input.focusHours,
        primaryGoal: input.primaryGoal,
      });
      return ok(plan);
    } catch (err) {
      return mapAiError(err);
    }
  },

  "ai:generateReport": async ({ timeframeStart, timeframeEnd }) => {
    try {
      const report = await reportService.generateReport({
        timeframeStart,
        timeframeEnd,
      });
      return ok(report);
    } catch (err) {
      return mapAiError(err);
    }
  },

  "ai:testConnection": async (request) => {
    try {
      const providerId = (
        request as { providerId?: import("@/shared/models").AiProviderId }
      )?.providerId;
      const success = await deepseekService.testConnection(providerId);
      return ok({ success });
    } catch {
      return fail("INTERNAL_ERROR", "Failed to test the AI connection.");
    }
  },

  "ai:getSettings": (_request) => {
    try {
      const settings = settingsRepo.getAiSettings();
      return ok(settings);
    } catch {
      return fail("INTERNAL_ERROR", "Failed to fetch AI settings.");
    }
  },

  "ai:updateSettings": (input) => {
    try {
      const settings = settingsRepo.updateAiSettings(input);
      return ok(settings);
    } catch {
      return fail("INTERNAL_ERROR", "Failed to update AI settings.");
    }
  },

  "ai:setKey": ({ providerId, apiKey }) => {
    try {
      keychainService.setApiKey(providerId, apiKey);
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

  "ai:deleteKey": ({ providerId }) => {
    try {
      keychainService.deleteApiKey(providerId);
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

  "report:list": (_request) => {
    try {
      const reports = reportService.listReports();
      return ok(reports);
    } catch {
      return fail("DB_READ_FAILED", "Failed to fetch cached reports.");
    }
  },

  "report:get": ({ id }) => {
    try {
      const report = reportService.getCachedReport(id);
      return ok(report);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "NOT_FOUND") {
        return fail("NOT_FOUND", error.message ?? "Cached report not found.");
      }
      if (error.code === "REPORT_CORRUPTED") {
        return fail(
          "REPORT_CORRUPTED",
          error.message ?? "Cached report is corrupted.",
        );
      }
      return fail("DB_READ_FAILED", "Failed to read cached report.");
    }
  },

  "report:delete": ({ id }) => {
    try {
      const result = reportService.deleteReport(id);
      return ok(result);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "NOT_FOUND") {
        return fail("NOT_FOUND", error.message ?? "Cached report not found.");
      }
      return fail("DB_WRITE_FAILED", "Failed to delete cached report.");
    }
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

  "key:get": (_request) => {
    try {
      const hasKey = keychainService.isApiKeySet();
      return ok({ hasKey });
    } catch {
      return fail("INTERNAL_ERROR", "Failed to check API key status.");
    }
  },

  "key:delete": (_request) => {
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

  "recurring:getAll": (_request) => {
    try {
      const rules = recurringRuleRepo.getAllRules();
      return ok(rules);
    } catch {
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

  "metrics:getVariance": ({ timeframeStart, timeframeEnd }) => {
    try {
      const metrics = varianceService.getVarianceMetrics({
        start: timeframeStart,
        end: timeframeEnd,
      });
      return ok(metrics);
    } catch {
      return fail("DB_READ_FAILED", "Failed to compute variance metrics.");
    }
  },

  "metrics:getTaskVariance": ({ taskId }) => {
    try {
      const variance = varianceService.getTaskVariance(taskId);
      return ok(variance);
    } catch {
      return fail("DB_READ_FAILED", "Failed to compute task variance.");
    }
  },

  "plan:getToday": (_request) => {
    try {
      const plan = dailyPlanRepo.getPlanForDate(getStartOfDay(Date.now()));
      return ok(plan);
    } catch {
      return fail("DB_READ_FAILED", "Failed to fetch today's plan.");
    }
  },

  "plan:approve": ({ schedule }) => {
    try {
      const plan = planApprovalService.approvePlan(schedule);
      return ok(plan);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === "VALIDATION_ERROR") {
        return fail(
          "VALIDATION_ERROR",
          error.message ?? "The plan is invalid.",
        );
      }
      if (error.code === "NOT_FOUND") {
        return fail("NOT_FOUND", error.message ?? "A planned task is missing.");
      }
      return fail("DB_WRITE_FAILED", "Failed to approve the plan.");
    }
  },
} satisfies HandlerMap;
