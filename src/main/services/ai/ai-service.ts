import type {
  AiProviderId,
  DailyPlanRequest,
  DailyPlanSchedule,
  PerformanceReportContent,
  ReportParams,
} from "@/shared/models";
import { DEFAULT_PROVIDER_PRESETS } from "@/shared/models";
import * as keychainService from "@/main/services/keychain-service";
import * as settingsRepo from "@/main/db/settings-repository";
import { formatVarianceContext } from "@/main/services/variance-service";
import {
  loadPlanPrompt,
  loadReportPrompt,
  fillTemplate,
} from "@/main/services/prompts";
import type { AiProviderAdapter, AiErrorCode } from "./types";
import { aiError, isAiError, classifyError, describeError } from "./ai-errors";
import { extractJson } from "./json-extractor";
import { OpenAiCompatibleAdapter } from "./adapters/OpenAiCompatibleAdapter";
import { AnthropicAdapter } from "./adapters/AnthropicAdapter";
import { GeminiAdapter } from "./adapters/GeminiAdapter";

const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

const adapters: Record<AiProviderId, AiProviderAdapter> = {
  deepseek: new OpenAiCompatibleAdapter(),
  openai: new OpenAiCompatibleAdapter(),
  custom: new OpenAiCompatibleAdapter(),
  anthropic: new AnthropicAdapter(),
  gemini: new GeminiAdapter(),
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveProviderContext(targetProviderId?: AiProviderId): {
  providerId: AiProviderId;
  model: string;
  baseUrl?: string;
  apiKey: string;
  adapter: AiProviderAdapter;
  preset: (typeof DEFAULT_PROVIDER_PRESETS)[AiProviderId];
} {
  const settings = settingsRepo.getAiSettings();
  const providerId: AiProviderId =
    targetProviderId ?? settings.activeProvider ?? "deepseek";
  const preset = DEFAULT_PROVIDER_PRESETS[providerId];
  const config = settings.providers[providerId];

  const model = config?.selectedModel || preset.defaultModel;
  const baseUrl =
    config?.baseUrl ||
    (preset.isCustomUrlAllowed ? preset.defaultBaseUrl : undefined);

  let apiKey: string | null = null;
  try {
    apiKey = keychainService.getApiKey(providerId);
  } catch {
    throw aiError(
      "AI_AUTH_FAILED",
      "Unable to read the API key from secure storage.",
    );
  }

  if (preset.requiresKey && (!apiKey || !apiKey.trim())) {
    throw aiError(
      "AI_AUTH_FAILED",
      `No API key configured for ${preset.name}. Add your API key in Settings.`,
    );
  }

  const adapter = adapters[providerId] ?? adapters.deepseek;

  return {
    providerId,
    model,
    baseUrl,
    apiKey: apiKey || "",
    adapter,
    preset,
  };
}

async function requestWithRetry(
  systemPrompt: string,
  userPrompt: string,
  targetProviderId?: AiProviderId,
): Promise<string> {
  const context = resolveProviderContext(targetProviderId);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const content = await context.adapter.generateJsonCompletion({
        providerId: context.providerId,
        model: context.model,
        apiKey: context.apiKey,
        baseUrl: context.baseUrl,
        systemPrompt,
        userPrompt,
        timeoutMs: 30_000,
      });
      return content;
    } catch (err) {
      if (isAiError(err)) {
        const errorWithCode = err as { code?: AiErrorCode };
        const code = errorWithCode.code ?? "AI_NETWORK_ERROR";
        const retryable =
          code !== "AI_AUTH_FAILED" && code !== "AI_PARSE_ERROR";
        lastError = err as Error;
        if (!retryable || attempt === MAX_RETRIES) {
          throw lastError;
        }
        await sleep(BACKOFF_MS[attempt] ?? 4000);
        continue;
      }

      const { code, retryable } = classifyError(err);
      lastError = aiError(code, describeError(err, code, context.preset.name));

      if (!retryable || attempt === MAX_RETRIES) {
        throw lastError;
      }

      await sleep(BACKOFF_MS[attempt] ?? 4000);
    }
  }

  throw lastError ?? aiError("AI_NETWORK_ERROR", "AI request failed.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDailyPlan(
  data: unknown,
  providerId: AiProviderId,
  model: string,
): DailyPlanSchedule {
  const plan = isRecord(data) ? data : null;
  if (
    !plan ||
    typeof plan.date !== "number" ||
    typeof plan.focusHours !== "number" ||
    typeof plan.primaryGoal !== "string" ||
    !Array.isArray(plan.schedule) ||
    !Array.isArray(plan.unscheduledTasks) ||
    typeof plan.summary !== "string"
  ) {
    throw aiError("AI_PARSE_ERROR", "Daily plan response is malformed.");
  }

  for (const entry of plan.schedule) {
    const block = isRecord(entry) ? entry : null;
    if (
      !block ||
      typeof block.taskId !== "string" ||
      typeof block.title !== "string" ||
      typeof block.priority !== "string" ||
      typeof block.estimatedMinutes !== "number" ||
      typeof block.budgetedMinutes !== "number" ||
      typeof block.scheduledStart !== "number" ||
      typeof block.isFixed !== "boolean" ||
      typeof block.rationale !== "string"
    ) {
      throw aiError(
        "AI_PARSE_ERROR",
        "Daily plan schedule block is malformed.",
      );
    }
  }

  return {
    ...(plan as unknown as DailyPlanSchedule),
    provider: providerId,
    model,
  };
}

function validatePerformanceReport(
  data: unknown,
  providerId: AiProviderId,
  model: string,
): PerformanceReportContent {
  const report = isRecord(data) ? data : null;
  if (
    !report ||
    !isRecord(report.timeframe) ||
    typeof report.timeframe.start !== "number" ||
    typeof report.timeframe.end !== "number" ||
    typeof report.generatedAt !== "number" ||
    !isRecord(report.metrics) ||
    !Array.isArray(report.patterns) ||
    !Array.isArray(report.advice) ||
    typeof report.summary !== "string"
  ) {
    throw aiError(
      "AI_PARSE_ERROR",
      "Performance report response is malformed.",
    );
  }
  return {
    ...(report as unknown as PerformanceReportContent),
    provider: providerId,
    model,
  };
}

export async function testConnection(
  providerId?: AiProviderId,
): Promise<boolean> {
  try {
    const context = resolveProviderContext(providerId);
    return await context.adapter.testConnection({
      providerId: context.providerId,
      model: context.model,
      apiKey: context.apiKey,
      baseUrl: context.baseUrl,
      timeoutMs: 15_000,
    });
  } catch (err) {
    console.warn(
      "AI connection test failed:",
      (err as { message?: string }).message ?? "unknown error",
    );
    return false;
  }
}

export async function generateDailyPlan(
  input: DailyPlanRequest,
  targetProviderId?: AiProviderId,
): Promise<DailyPlanSchedule> {
  const context = resolveProviderContext(targetProviderId);
  const template = loadPlanPrompt();
  const system = fillTemplate(template, {
    todayDate: String(Date.now()),
    focusHours: String(input.focusHours),
    primaryGoal: input.primaryGoal,
    fixedBlocksJson: JSON.stringify(input.fixedBlocks ?? []),
    calendarEventsJson: JSON.stringify(input.calendarEvents ?? []),
    tasksJson: JSON.stringify(input.tasks),
    historicalVarianceContext: input.historicalVariance
      ? formatVarianceContext(input.historicalVariance)
      : "No historical data available yet.",
  });

  const rawJson = await requestWithRetry(
    system,
    "Generate the daily plan now.",
    targetProviderId,
  );

  const parsed = extractJson(rawJson);
  return validateDailyPlan(parsed, context.providerId, context.model);
}

export async function generatePerformanceReport(
  params: ReportParams,
  targetProviderId?: AiProviderId,
): Promise<PerformanceReportContent> {
  const context = resolveProviderContext(targetProviderId);
  const template = loadReportPrompt();
  const system = fillTemplate(template, {
    timeframeStart: String(params.timeframeStart),
    timeframeEnd: String(params.timeframeEnd),
    completedTasksJson: JSON.stringify(params.completedTasks),
    metricsJson: JSON.stringify(params.metrics),
  });

  const rawJson = await requestWithRetry(
    system,
    "Generate the performance report now.",
    targetProviderId,
  );

  const parsed = extractJson(rawJson);
  return validatePerformanceReport(parsed, context.providerId, context.model);
}
