import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type {
  DailyPlanRequest,
  DailyPlanSchedule,
  PerformanceReportContent,
  ReportParams,
} from "@/shared/models";
import * as keychainService from "@/main/services/keychain-service";
import {
  loadPlanPrompt,
  loadReportPrompt,
  fillTemplate,
} from "@/main/services/prompts";

const BASE_URL = "https://api.deepseek.com/v1";
const MODEL = "deepseek-chat";
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

const AI_ERROR_CODES = [
  "AI_TIMEOUT",
  "AI_RATE_LIMITED",
  "AI_AUTH_FAILED",
  "AI_PARSE_ERROR",
  "AI_NETWORK_ERROR",
  "AI_REQUEST_FAILED",
] as const;

type AiErrorCode = (typeof AI_ERROR_CODES)[number];

function aiError(code: AiErrorCode, message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = code;
  (err as { isAiError?: boolean }).isAiError = true;
  return err;
}

function isAiError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { isAiError?: boolean }).isAiError === true
  );
}

function createClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: BASE_URL,
    apiKey,
    timeout: TIMEOUT_MS,
    maxRetries: 0,
  });
}

function resolveApiKey(): string {
  let key: string | null;
  try {
    key = keychainService.getApiKey();
  } catch {
    throw aiError(
      "AI_AUTH_FAILED",
      "Unable to read the API key from secure storage.",
    );
  }
  if (!key) {
    throw aiError(
      "AI_AUTH_FAILED",
      "No API key configured. Add your DeepSeek API key in Settings.",
    );
  }
  return key;
}

function classifyError(err: unknown): {
  code: AiErrorCode;
  retryable: boolean;
} {
  const e = err as { status?: number; name?: string; code?: string };
  const status = e?.status;

  if (status === 401) {
    return { code: "AI_AUTH_FAILED", retryable: false };
  }
  if (status === 429) {
    return { code: "AI_RATE_LIMITED", retryable: true };
  }
  if (typeof status === "number" && status >= 400 && status < 500) {
    return { code: "AI_REQUEST_FAILED", retryable: false };
  }
  if (typeof status === "number" && status >= 500) {
    return { code: "AI_REQUEST_FAILED", retryable: true };
  }

  const name = e?.name ?? "";
  if (
    name === "AbortError" ||
    name === "APIConnectionTimeoutError" ||
    name.includes("Timeout") ||
    e?.code === "ETIMEDOUT"
  ) {
    return { code: "AI_TIMEOUT", retryable: true };
  }
  return { code: "AI_NETWORK_ERROR", retryable: true };
}

function describeError(err: unknown, code: AiErrorCode): string {
  const status = (err as { status?: number }).status;
  switch (code) {
    case "AI_TIMEOUT":
      return "The request to DeepSeek timed out after 30 seconds.";
    case "AI_RATE_LIMITED":
      return "DeepSeek rate limit reached. Please try again shortly.";
    case "AI_AUTH_FAILED":
      return "DeepSeek rejected the API key (401).";
    case "AI_REQUEST_FAILED":
      return status
        ? `DeepSeek returned an error (HTTP ${status}).`
        : "DeepSeek returned an invalid request.";
    case "AI_PARSE_ERROR":
      return "DeepSeek response did not match the expected format.";
    case "AI_NETWORK_ERROR":
    default:
      return "Unable to reach DeepSeek. Check your network connection.";
  }
}

function readRetryAfterMs(err: unknown): number | null {
  const headers = (err as { headers?: Headers }).headers;
  if (!headers || typeof headers.get !== "function") {
    return null;
  }
  const value = headers.get("retry-after");
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestContent(
  client: OpenAI,
  messages: ChatCompletionMessageParam[],
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        response_format: { type: "json_object" },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw aiError("AI_PARSE_ERROR", "DeepSeek returned an empty response.");
      }
      return content;
    } catch (err) {
      if (isAiError(err)) {
        throw err;
      }
      const { code, retryable } = classifyError(err);
      lastError = aiError(code, describeError(err, code));
      if (!retryable || attempt === MAX_RETRIES) {
        throw lastError;
      }
      await sleep(readRetryAfterMs(err) ?? BACKOFF_MS[attempt] ?? 4000);
    }
  }

  throw lastError ?? aiError("AI_NETWORK_ERROR", "AI request failed.");
}

async function chatJson(
  messages: ChatCompletionMessageParam[],
): Promise<unknown> {
  const apiKey = resolveApiKey();
  const client = createClient(apiKey);
  const content = await requestContent(client, messages);
  try {
    return JSON.parse(content);
  } catch {
    throw aiError("AI_PARSE_ERROR", "Failed to parse the DeepSeek response.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDailyPlan(data: unknown): DailyPlanSchedule {
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

  return plan as unknown as DailyPlanSchedule;
}

function validatePerformanceReport(data: unknown): PerformanceReportContent {
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
  return report as unknown as PerformanceReportContent;
}

export async function testConnection(): Promise<boolean> {
  try {
    await chatJson([
      {
        role: "system",
        content: 'Respond only with the JSON object {"ok": true}.',
      },
      { role: "user", content: "Ping" },
    ]);
    return true;
  } catch (err) {
    console.warn(
      "DeepSeek connection test failed:",
      (err as { message?: string }).message ?? "unknown error",
    );
    return false;
  }
}

export async function generateDailyPlan(
  input: DailyPlanRequest,
): Promise<DailyPlanSchedule> {
  const template = loadPlanPrompt();
  const system = fillTemplate(template, {
    todayDate: String(Date.now()),
    focusHours: String(input.focusHours),
    primaryGoal: input.primaryGoal,
    fixedBlocksJson: JSON.stringify(input.fixedBlocks ?? []),
    tasksJson: JSON.stringify(input.tasks),
    historicalVarianceJson: JSON.stringify(input.historicalVariance ?? null),
  });

  const data = await chatJson([
    { role: "system", content: system },
    { role: "user", content: "Generate the daily plan now." },
  ]);

  return validateDailyPlan(data);
}

export async function generatePerformanceReport(
  params: ReportParams,
): Promise<PerformanceReportContent> {
  const template = loadReportPrompt();
  const system = fillTemplate(template, {
    timeframeStart: String(params.timeframeStart),
    timeframeEnd: String(params.timeframeEnd),
    completedTasksJson: JSON.stringify(params.completedTasks),
    metricsJson: JSON.stringify(params.metrics),
  });

  const data = await chatJson([
    { role: "system", content: system },
    { role: "user", content: "Generate the performance report now." },
  ]);

  return validatePerformanceReport(data);
}
