import type {
  AiProviderAdapter,
  AiRequestOptions,
  AiTestOptions,
} from "../types";
import { aiError, isAiError, classifyError, describeError } from "../ai-errors";
import { extractJsonString } from "../json-extractor";

export class GeminiAdapter implements AiProviderAdapter {
  private getEndpoint(model: string, baseUrl?: string): string {
    const base =
      baseUrl && baseUrl.trim()
        ? baseUrl.replace(/\/+$/, "")
        : "https://generativelanguage.googleapis.com/v1beta";
    return `${base}/models/${encodeURIComponent(model)}:generateContent`;
  }

  async generateJsonCompletion(options: AiRequestOptions): Promise<string> {
    const endpoint = this.getEndpoint(options.model, options.baseUrl);
    const timeoutMs = options.timeoutMs ?? 30_000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-goog-api-key": options.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: options.userPrompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: options.systemPrompt }],
          },
          generationConfig: {
            responseMimeType: "application/json",
          },
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
          // ignore parse failure
        }
        const customErr = {
          status: response.status,
          message: errMessage,
        };
        const { code } = classifyError(customErr);
        throw aiError(code, describeError(customErr, code, "Google Gemini"));
      }

      const body = (await response.json()) as {
        candidates?: {
          content?: {
            parts?: { text?: string }[];
          };
        }[];
      };

      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw aiError(
          "AI_PARSE_ERROR",
          "Google Gemini returned an empty response.",
        );
      }
      return extractJsonString(text);
    } catch (err) {
      if (isAiError(err)) {
        throw err;
      }
      const { code } = classifyError(err);
      throw aiError(code, describeError(err, code, "Google Gemini"));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async testConnection(options: AiTestOptions): Promise<boolean> {
    const endpoint = this.getEndpoint(options.model, options.baseUrl);
    const timeoutMs = options.timeoutMs ?? 15_000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-goog-api-key": options.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Ping" }] }],
          generationConfig: {
            maxOutputTokens: 5,
          },
        }),
        signal: controller.signal,
      });

      return response.ok;
    } catch (err) {
      console.warn("Gemini connection test failed:", (err as Error).message);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
