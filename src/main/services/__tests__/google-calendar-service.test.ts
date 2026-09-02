import { beforeEach, describe, expect, it, vi } from "vitest";

const getSetting = vi.fn();
const setSetting = vi.fn();
const deleteApiKey = vi.fn();
const openExternal = vi.fn();

vi.mock("electron", () => ({ shell: { openExternal } }));
vi.mock("@/main/config/google-calendar-config", () => ({
  GOOGLE_CALENDAR_CLIENT_ID: "app.apps.googleusercontent.com",
  isGoogleCalendarAvailable: () => true,
}));
vi.mock("@/main/db/settings-repository", () => ({ getSetting, setSetting }));
vi.mock("@/main/services/keychain-service", () => ({
  deleteApiKey,
  getApiKey: () => null,
  setApiKey: vi.fn(),
}));
vi.mock("@/main/db/calendar-event-repository", () => ({}));
vi.mock("@/main/db/daily-plan-repository", () => ({}));
vi.mock("@/main/services/recurring-engine", () => ({
  getStartOfDay: () => 0,
}));

async function getService() {
  return import("../google-calendar-service");
}

beforeEach(() => {
  vi.clearAllMocks();
  getSetting.mockReturnValue({
    clientId: "legacy.apps.googleusercontent.com",
    calendars: [{ id: "primary", summary: "Primary", primary: true }],
    selectedCalendarIds: ["primary"],
    lastSyncedAt: 100,
    syncError: null,
  });
});

describe("google-calendar-service app-owned OAuth migration", () => {
  it("clears legacy credentials while retaining calendar selection metadata", async () => {
    const service = await getService();
    service.migrateLegacyGoogleCalendarCredentials();

    expect(deleteApiKey).toHaveBeenCalledWith("google-calendar-token");
    expect(setSetting).toHaveBeenCalledWith(
      "google_calendar_settings",
      expect.objectContaining({ selectedCalendarIds: ["primary"] }),
    );
    expect(setSetting.mock.calls[0]?.[1]).not.toHaveProperty("clientId");
  });

  it("uses the build-injected client ID for one-click authorization", async () => {
    const service = await getService();
    await service.beginGoogleCalendarAuthorization();

    const authorizationUrl = new URL(openExternal.mock.calls[0]?.[0]);
    expect(authorizationUrl.searchParams.get("client_id")).toBe(
      "app.apps.googleusercontent.com",
    );
  });
});
