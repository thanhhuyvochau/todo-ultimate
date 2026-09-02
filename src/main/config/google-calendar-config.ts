declare const __GOOGLE_CALENDAR_CLIENT_ID__: string | undefined;

export function resolveGoogleCalendarClientId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const injectedClientId = resolveGoogleCalendarClientId(
  typeof __GOOGLE_CALENDAR_CLIENT_ID__ === "string"
    ? __GOOGLE_CALENDAR_CLIENT_ID__
    : "",
);

/** Public build-time OAuth configuration; user tokens remain in safeStorage. */
export const GOOGLE_CALENDAR_CLIENT_ID = injectedClientId;

export function isGoogleCalendarAvailable(): boolean {
  return GOOGLE_CALENDAR_CLIENT_ID.length > 0;
}
