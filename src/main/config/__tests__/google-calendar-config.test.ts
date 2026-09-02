import { describe, expect, it } from "vitest";
import { resolveGoogleCalendarClientId } from "../google-calendar-config";

describe("resolveGoogleCalendarClientId", () => {
  it("returns a trimmed injected public client ID", () => {
    expect(
      resolveGoogleCalendarClientId(" app.apps.googleusercontent.com "),
    ).toBe("app.apps.googleusercontent.com");
  });

  it("returns an empty value when no build configuration exists", () => {
    expect(resolveGoogleCalendarClientId(undefined)).toBe("");
    expect(resolveGoogleCalendarClientId(42)).toBe("");
  });
});
