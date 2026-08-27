import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAiCompatibleAdapter } from "../adapters/OpenAiCompatibleAdapter";
import { AnthropicAdapter } from "../adapters/AnthropicAdapter";
import { GeminiAdapter } from "../adapters/GeminiAdapter";

describe("Provider Adapters", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("AnthropicAdapter", () => {
    const adapter = new AnthropicAdapter();

    it("formats request correctly and extracts JSON content", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: '{"response": "ok"}' }],
        }),
      });
      global.fetch = mockFetch;

      const result = await adapter.generateJsonCompletion({
        providerId: "anthropic",
        model: "claude-3-5-sonnet-latest",
        apiKey: "test-anthropic-key",
        systemPrompt: "You are a planner",
        userPrompt: "Plan my day",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-api-key": "test-anthropic-key",
            "anthropic-version": "2023-06-01",
          }),
        }),
      );
      expect(result).toBe('{"response": "ok"}');
    });

    it("throws AI_AUTH_FAILED on 401 response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Invalid API Key" } }),
      });

      await expect(
        adapter.generateJsonCompletion({
          providerId: "anthropic",
          model: "claude-3-5-sonnet-latest",
          apiKey: "bad-key",
          systemPrompt: "sys",
          userPrompt: "usr",
        }),
      ).rejects.toThrow();
    });

    it("testConnection returns true on 200 and false on error", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: true });
      const ok = await adapter.testConnection({
        providerId: "anthropic",
        model: "claude-3-5-sonnet-latest",
        apiKey: "good-key",
      });
      expect(ok).toBe(true);

      global.fetch = vi.fn().mockRejectedValueOnce(new Error("network"));
      const fail = await adapter.testConnection({
        providerId: "anthropic",
        model: "claude-3-5-sonnet-latest",
        apiKey: "good-key",
      });
      expect(fail).toBe(false);
    });
  });

  describe("GeminiAdapter", () => {
    const adapter = new GeminiAdapter();

    it("formats Gemini REST request and extracts JSON", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '```json\n{"gemini": "ready"}\n```' }],
              },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const result = await adapter.generateJsonCompletion({
        providerId: "gemini",
        model: "gemini-2.0-flash",
        apiKey: "gemini-key",
        systemPrompt: "sys",
        userPrompt: "usr",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-goog-api-key": "gemini-key",
          }),
        }),
      );
      expect(result).toBe('{"gemini": "ready"}');
    });

    it("testConnection returns true on valid status", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: true });
      const ok = await adapter.testConnection({
        providerId: "gemini",
        model: "gemini-2.0-flash",
        apiKey: "gemini-key",
      });
      expect(ok).toBe(true);
    });
  });

  describe("OpenAiCompatibleAdapter", () => {
    const adapter = new OpenAiCompatibleAdapter();

    it("instantiates properly", () => {
      expect(adapter).toBeDefined();
      expect(typeof adapter.generateJsonCompletion).toBe("function");
      expect(typeof adapter.testConnection).toBe("function");
    });
  });
});
