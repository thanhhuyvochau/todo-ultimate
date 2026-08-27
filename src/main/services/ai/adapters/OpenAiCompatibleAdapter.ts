import OpenAI from "openai";
import type {
  AiProviderAdapter,
  AiRequestOptions,
  AiTestOptions,
} from "../types";
import { aiError, isAiError, classifyError, describeError } from "../ai-errors";
import { extractJsonString } from "../json-extractor";

export class OpenAiCompatibleAdapter implements AiProviderAdapter {
  private createClient(
    apiKey: string,
    baseUrl?: string,
    timeoutMs = 30_000,
  ): OpenAI {
    return new OpenAI({
      baseURL: baseUrl || undefined,
      apiKey: apiKey || "dummy-key-for-local",
      timeout: timeoutMs,
      maxRetries: 0,
    });
  }

  async generateJsonCompletion(options: AiRequestOptions): Promise<string> {
    const client = this.createClient(
      options.apiKey,
      options.baseUrl,
      options.timeoutMs ?? 30_000,
    );

    try {
      // Try with response_format json_object first
      const completion = await client.chat.completions.create({
        model: options.model,
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw aiError("AI_PARSE_ERROR", "Model returned an empty response.");
      }
      return extractJsonString(content);
    } catch (err) {
      if (isAiError(err)) {
        throw err;
      }
      // If error might be due to response_format not supported (e.g. some local models / custom endpoints), retry without response_format
      const e = err as { message?: string; status?: number };
      if (
        e?.message &&
        (e.message.includes("response_format") ||
          e.message.includes("json_object") ||
          e.message.includes("unsupported"))
      ) {
        try {
          const fallback = await client.chat.completions.create({
            model: options.model,
            messages: [
              {
                role: "system",
                content: `${options.systemPrompt}\n\nIMPORTANT: You MUST respond ONLY with valid JSON. Do not include markdown code fences or conversational text.`,
              },
              { role: "user", content: options.userPrompt },
            ],
          });
          const content = fallback.choices[0]?.message?.content;
          if (!content) {
            throw aiError(
              "AI_PARSE_ERROR",
              "Model returned an empty response.",
            );
          }
          return extractJsonString(content);
        } catch (fallbackErr) {
          const { code } = classifyError(fallbackErr);
          throw aiError(
            code,
            describeError(fallbackErr, code, options.providerId),
          );
        }
      }

      const { code } = classifyError(err);
      throw aiError(code, describeError(err, code, options.providerId));
    }
  }

  async testConnection(options: AiTestOptions): Promise<boolean> {
    const client = this.createClient(
      options.apiKey,
      options.baseUrl,
      options.timeoutMs ?? 15_000,
    );
    try {
      await client.chat.completions.create({
        model: options.model,
        messages: [{ role: "user", content: "Ping" }],
        max_tokens: 5,
      });
      return true;
    } catch (err) {
      const { code } = classifyError(err);
      console.warn(
        `OpenAI-compatible (${options.providerId}) connection test failed:`,
        (err as Error).message || code,
      );
      return false;
    }
  }
}
