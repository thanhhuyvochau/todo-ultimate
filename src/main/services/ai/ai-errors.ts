import { AI_ERROR_CODES, type AiErrorCode } from "./types";

export function aiError(code: AiErrorCode, message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = code;
  (err as { isAiError?: boolean }).isAiError = true;
  return err;
}

export function isAiError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { isAiError?: boolean }).isAiError === true
  );
}

export function classifyError(err: unknown): {
  code: AiErrorCode;
  retryable: boolean;
} {
  const e = err as {
    status?: number;
    statusCode?: number;
    name?: string;
    code?: string;
  };

  if (e?.code && (AI_ERROR_CODES as readonly string[]).includes(e.code)) {
    const code = e.code as AiErrorCode;
    const retryable = code !== "AI_AUTH_FAILED" && code !== "AI_PARSE_ERROR";
    return { code, retryable };
  }

  const status = e?.status ?? e?.statusCode;

  if (status === 401 || status === 403) {
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
  const codeStr = e?.code ?? "";
  if (
    name === "AbortError" ||
    name === "APIConnectionTimeoutError" ||
    name.includes("Timeout") ||
    codeStr === "ETIMEDOUT" ||
    codeStr === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    return { code: "AI_TIMEOUT", retryable: true };
  }

  return { code: "AI_NETWORK_ERROR", retryable: true };
}

export function describeError(
  err: unknown,
  code: AiErrorCode,
  providerName = "AI Provider",
): string {
  const status = (err as { status?: number; statusCode?: number }).status;
  switch (code) {
    case "AI_TIMEOUT":
      return `The request to ${providerName} timed out after 30 seconds.`;
    case "AI_RATE_LIMITED":
      return `${providerName} rate limit reached. Please try again shortly.`;
    case "AI_AUTH_FAILED":
      return `${providerName} rejected the API key (${status ?? 401}). Check your settings.`;
    case "AI_REQUEST_FAILED":
      return status
        ? `${providerName} returned an error (HTTP ${status}).`
        : `${providerName} returned an invalid request.`;
    case "AI_PARSE_ERROR":
      return `${providerName} response did not match the expected format.`;
    case "AI_NETWORK_ERROR":
    default:
      return `Unable to reach ${providerName}. Check your network connection.`;
  }
}
