import type { AiProviderId } from "@/shared/models";

export const AI_ERROR_CODES = [
  "AI_TIMEOUT",
  "AI_RATE_LIMITED",
  "AI_AUTH_FAILED",
  "AI_PARSE_ERROR",
  "AI_NETWORK_ERROR",
  "AI_REQUEST_FAILED",
] as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

export interface AiRequestOptions {
  providerId: AiProviderId;
  model: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
}

export interface AiTestOptions {
  providerId: AiProviderId;
  model: string;
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface AiProviderAdapter {
  generateJsonCompletion(options: AiRequestOptions): Promise<string>;
  testConnection(options: AiTestOptions): Promise<boolean>;
}
