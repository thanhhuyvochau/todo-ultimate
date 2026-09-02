import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { RendererApi } from "@/shared/api";
import { GoogleCalendarSettings } from "../GoogleCalendarSettings";
import { useGoogleCalendarStore } from "../../stores/googleCalendarStore";

function installSettingsResponse(isAvailable: boolean): void {
  window.api = {
    getGoogleCalendarSettings: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        isAvailable,
        isConnected: false,
        calendars: [],
        selectedCalendarIds: [],
        lastSyncedAt: null,
        syncError: null,
      },
    }),
  } as unknown as RendererApi;
}

beforeEach(() => {
  useGoogleCalendarStore.setState({
    settings: null,
    isLoading: false,
    isSaving: false,
    error: null,
  });
});

describe("GoogleCalendarSettings", () => {
  it("hides the integration when the build has no Client ID", async () => {
    installSettingsResponse(false);
    render(<GoogleCalendarSettings />);

    await waitFor(() => {
      expect(screen.queryByText("Google Calendar")).toBeNull();
    });
  });

  it("offers one-click connection without exposing OAuth configuration", async () => {
    installSettingsResponse(true);
    render(<GoogleCalendarSettings />);

    expect(await screen.findByText("Connect Google Calendar")).toBeTruthy();
    expect(screen.queryByLabelText("OAuth client ID")).toBeNull();
  });
});
