import { describe, it, expect } from "vitest";
import { ok, fail, type IpcResult } from "../ipcResult";

describe("ok", () => {
  it("returns a successful IpcResult", () => {
    const result = ok<string>("hello");
    expect(result).toEqual({ ok: true, data: "hello" });
  });

  it("works with objects", () => {
    const data = { id: "1", name: "test" };
    const result = ok(data);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(data);
    }
  });

  it("works with null data", () => {
    const result = ok(null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });
});

describe("fail", () => {
  it("returns a failure IpcResult", () => {
    const result = fail("NOT_IMPLEMENTED", "Not done yet.");
    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_IMPLEMENTED", message: "Not done yet." },
    });
  });

  it("narrows ok type in conditional", () => {
    const result = fail("DB_READ_FAILED", "Boom") as IpcResult<string>;
    if (!result.ok) {
      expect(result.error.code).toBe("DB_READ_FAILED");
    }
  });
});
