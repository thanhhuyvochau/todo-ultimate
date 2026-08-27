import { aiError } from "./ai-errors";

export function extractJsonString(raw: string): string {
  if (!raw || typeof raw !== "string") {
    throw aiError("AI_PARSE_ERROR", "Received empty response from AI model.");
  }

  let text = raw.trim();

  // Strip <think>...</think> if present (DeepSeek Reasoner / R1)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Check for ```json ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // Find first { or [ and last } or ]
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");

  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = text.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = text.lastIndexOf("]");
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return text.substring(startIdx, endIdx + 1).trim();
  }

  return text;
}

export function extractJson<T = unknown>(raw: string): T {
  const jsonStr = extractJsonString(raw);
  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    throw aiError(
      "AI_PARSE_ERROR",
      `Failed to parse JSON from AI response: ${(err as Error).message}`,
    );
  }
}
