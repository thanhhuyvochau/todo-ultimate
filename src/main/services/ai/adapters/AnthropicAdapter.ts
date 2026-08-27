import type {
  AiProviderAdapter,
  AiRequestOptions,
  AiTestOptions,
} from "../types";
import { aiError, isAiError, classifyError, describeError } from "../ai-errors";
import { extractJsonString } from "../json-extractor";

export class AnthropicAdapter implements AiProviderAdapter {
  private getEndpoint(baseUrl?: string): string {
    if (baseUrl && baseUrl.trim()) {
      return baseUrl.endsWith("/v1/messages")
        ? baseUrl
        : `${baseUrl.replace(/\/+$/, "")}/v1/messages`;
    }
    return "https://api.anthropic.com/v1/messages";
  }

  async generateJsonCompletion(options: AiRequestOptions): Promise<string> {
    const endpoint = this.getEndpoint(options.baseUrl);
    const timeoutMs = options.timeoutMs ?? 30_000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-api-key": options.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          max_tokens: 4096,
          system: `${options.systemPrompt}\n\nIMPORTANT: You must return valid raw JSON only. Do not add markdown code fences, introductory or concluding commentary.`,
          messages: [{ role: "user", content: options.userPrompt }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errMessage = `HTTP ${response.status}`;
        try {
          const errBody = (await response.json()) as {
            error?: { message?: string };
          };
          if (errBody?.error?.message) {
            errMessage = errBody.error.message;
          }
        } catch {
          // ignore error body parse
        }
        const customErr = {
          status: response.status,
          message: errMessage,
        };
        const { code } = classifyError(customErr);
        throw aiError(code, describeError(customErr, code, "Anthropic"));
      }

      const body = (await response.json()) as {
        content?: { type: string; text?: string }[];
      };
      const text = body?.content?.[0]?.text;
      if (!text) {
        throw aiError(
          "AI_PARSE_ERROR",
          "Anthropic returned an empty response.",
        );
      }
      return extractJsonString(text);
    } catch (err) {
      if (isAiError(err)) {
        throw err;
      }
      const { code } = classifyError(err);
      throw aiError(code, describeError(err, code, "Anthropic"));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async testConnection(options: AiTestOptions): Promise<boolean> {
    const endpoint = this.getEndpoint(options.baseUrl);
    const timeoutMs = options.timeoutMs ?? 15_000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-api-key": options.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          max_tokens: 5,
          messages: [{ role: "user", content: "Ping" }],
        }),
        signal: controller.signal,
      });

      return response.ok;
    } catch (err) {
      console.warn("Anthropic connection test failed:", (err as Error).message);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
