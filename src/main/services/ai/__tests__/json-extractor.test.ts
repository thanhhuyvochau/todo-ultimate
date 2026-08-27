import { describe, it, expect } from "vitest";
import { extractJsonString, extractJson } from "../json-extractor";

describe("json-extractor", () => {
  it("extracts json string properly", () => {
    const raw = '```json\n{"foo": 1}\n```';
    expect(extractJsonString(raw)).toBe('{"foo": 1}');
  });

  it("parses raw JSON string without fences", () => {
    const raw = '{"name": "test", "count": 42}';
    expect(extractJson(raw)).toEqual({ name: "test", count: 42 });
  });

  it("strips ```json code fences", () => {
    const raw = '```json\n{\n  "valid": true\n}\n```';
    expect(extractJson(raw)).toEqual({ valid: true });
  });

  it("strips generic ``` code fences", () => {
    const raw = '```\n{\n  "item": 123\n}\n```';
    expect(extractJson(raw)).toEqual({ item: 123 });
  });

  it("strips DeepSeek Reasoner <think> tags", () => {
    const raw =
      '<think>I should plan out the user day carefully...</think>\n```json\n{"thoughtProcessed": true}\n```';
    expect(extractJson(raw)).toEqual({ thoughtProcessed: true });
  });

  it("extracts outermost JSON object when surrounded by conversational text", () => {
    const raw =
      'Here is the generated schedule for today:\n{"schedule": [], "summary": "great"}\nLet me know if you need changes!';
    expect(extractJson(raw)).toEqual({ schedule: [], summary: "great" });
  });

  it("throws AI_PARSE_ERROR on malformed JSON", () => {
    const raw = "{ invalid json here ...";
    expect(() => extractJson(raw)).toThrow();
  });

  it("throws AI_PARSE_ERROR on empty input", () => {
    expect(() => extractJson("")).toThrow();
  });
});
