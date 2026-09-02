import { createHash, randomBytes } from "crypto";
import { shell } from "electron";
import * as calendarEventRepo from "@/main/db/calendar-event-repository";
import * as dailyPlanRepo from "@/main/db/daily-plan-repository";
import * as settingsRepo from "@/main/db/settings-repository";
import * as keychainService from "@/main/services/keychain-service";
import { getStartOfDay } from "@/main/services/recurring-engine";
import type {
  CalendarConflict,
  CalendarEvent,
  GoogleCalendarInfo,
  GoogleCalendarSettings,
  UpdateGoogleCalendarSettingsInput,
} from "@/shared/models";

export const GOOGLE_CALENDAR_REDIRECT_URI =
  "com.ai-task-planner:/oauth2callback";
const GOOGLE_CALENDAR_SCOPE = [
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
].join(" ");
const GOOGLE_TOKEN_VAULT_KEY = "google-calendar-token";
const GOOGLE_CALENDAR_SETTINGS_KEY = "google_calendar_settings";
const SYNC_INTERVAL_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface GoogleCalendarConfig {
  clientId: string;
  calendars: GoogleCalendarInfo[];
  selectedCalendarIds: string[];
  lastSyncedAt: number | null;
  syncError: string | null;
}

interface GoogleToken {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

interface GoogleCalendarListResponse {
  items?: Array<{ id?: string; summary?: string; primary?: boolean }>;
}

interface GoogleEventResponse {
  nextPageToken?: string;
  items?: Array<{
    id?: string;
    summary?: string;
    status?: string;
    transparency?: string;
    start?: { dateTime?: string };
    end?: { dateTime?: string };
    attendees?: Array<{ self?: boolean; responseStatus?: string }>;
  }>;
}

let pendingAuthorization: { state: string; verifier: string } | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;

function defaultConfig(): GoogleCalendarConfig {
  return {
    clientId: "",
    calendars: [],
    selectedCalendarIds: [],
    lastSyncedAt: null,
    syncError: null,
  };
}

function getConfig(): GoogleCalendarConfig {
  const config = settingsRepo.getSetting<Partial<GoogleCalendarConfig>>(
    GOOGLE_CALENDAR_SETTINGS_KEY,
    {},
  );
  return {
    ...defaultConfig(),
    ...config,
    calendars: Array.isArray(config.calendars) ? config.calendars : [],
    selectedCalendarIds: Array.isArray(config.selectedCalendarIds)
      ? config.selectedCalendarIds
      : [],
  };
}

function saveConfig(config: GoogleCalendarConfig): void {
  settingsRepo.setSetting(GOOGLE_CALENDAR_SETTINGS_KEY, config);
}

function isConnected(): boolean {
  try {
    return Boolean(keychainService.getApiKey(GOOGLE_TOKEN_VAULT_KEY));
  } catch {
    return false;
  }
}

function toSettings(config = getConfig()): GoogleCalendarSettings {
  const selectedIds = new Set(config.selectedCalendarIds);
  return {
    clientId: config.clientId,
    isConnected: isConnected(),
    calendars: config.calendars.map((calendar) => ({
      ...calendar,
      selected: selectedIds.has(calendar.id),
    })),
    selectedCalendarIds: config.selectedCalendarIds,
    lastSyncedAt: config.lastSyncedAt,
    syncError: config.syncError,
  };
}

function calendarError(message: string, code = "CALENDAR_SYNC_FAILED"): Error {
  return Object.assign(new Error(message), { code });
}

function getToken(): GoogleToken {
  const raw = keychainService.getApiKey(GOOGLE_TOKEN_VAULT_KEY);
  if (!raw) {
    throw calendarError(
      "Google Calendar is not connected.",
      "CALENDAR_NOT_CONNECTED",
    );
  }
  try {
    const token = JSON.parse(raw) as Partial<GoogleToken>;
    if (
      typeof token.accessToken !== "string" ||
      typeof token.expiresAt !== "number"
    ) {
      throw new Error("Malformed token");
    }
    return {
      accessToken: token.accessToken,
      refreshToken:
        typeof token.refreshToken === "string" ? token.refreshToken : null,
      expiresAt: token.expiresAt,
    };
  } catch {
    throw calendarError("The saved Google Calendar credentials are invalid.");
  }
}

function saveToken(token: GoogleToken): void {
  keychainService.setApiKey(GOOGLE_TOKEN_VAULT_KEY, JSON.stringify(token));
}

function base64Url(input: Buffer): string {
  return input.toString("base64url");
}

async function postToken(body: URLSearchParams): Promise<GoogleToken> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  } | null;
  if (!response.ok || !payload?.access_token || !payload.expires_in) {
    throw calendarError(
      "Google Calendar authorization could not be completed.",
    );
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };
}

async function getValidAccessToken(): Promise<string> {
  const token = getToken();
  if (token.expiresAt > Date.now() + 60_000) return token.accessToken;

  const config = getConfig();
  if (!token.refreshToken || !config.clientId) {
    throw calendarError(
      "Google Calendar authorization expired. Reconnect to continue.",
    );
  }
  const refreshed = await postToken(
    new URLSearchParams({
      client_id: config.clientId,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    }),
  );
  refreshed.refreshToken = token.refreshToken;
  saveToken(refreshed);
  return refreshed.accessToken;
}

async function googleGet<T>(path: string, query?: URLSearchParams): Promise<T> {
  const accessToken = await getValidAccessToken();
  const url = new URL(`https://www.googleapis.com/calendar/v3${path}`);
  if (query) url.search = query.toString();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 401 || response.status === 403) {
    throw calendarError(
      "Google Calendar authorization expired. Reconnect to continue.",
    );
  }
  if (!response.ok) {
    throw calendarError(
      "Google Calendar sync failed. Your cached events are still available.",
    );
  }
  return (await response.json()) as T;
}

async function fetchCalendarList(): Promise<GoogleCalendarInfo[]> {
  const response = await googleGet<GoogleCalendarListResponse>(
    "/users/me/calendarList",
    new URLSearchParams({ minAccessRole: "reader" }),
  );
  return (response.items ?? [])
    .filter(
      (
        calendar,
      ): calendar is Required<Pick<GoogleCalendarInfo, "id">> & {
        summary?: string;
        primary?: boolean;
      } => typeof calendar.id === "string",
    )
    .map((calendar) => ({
      id: calendar.id,
      summary: calendar.summary?.trim() || "Untitled calendar",
      primary: calendar.primary === true,
      selected: false,
    }));
}

function toCalendarEvent(
  calendarId: string,
  event: NonNullable<GoogleEventResponse["items"]>[number],
): CalendarEvent | null {
  if (
    !event.id ||
    event.status === "cancelled" ||
    event.transparency === "transparent" ||
    !event.start?.dateTime ||
    !event.end?.dateTime ||
    event.attendees?.some(
      (attendee) => attendee.self && attendee.responseStatus === "declined",
    )
  ) {
    return null;
  }
  const startTime = Date.parse(event.start.dateTime);
  const endTime = Date.parse(event.end.dateTime);
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime <= startTime
  ) {
    return null;
  }
  const now = Date.now();
  return {
    id: `${calendarId}:${event.id}`,
    calendarId,
    gcalEventId: event.id,
    title: event.summary?.trim() || "Busy",
    startTime,
    endTime,
    status: event.status === "tentative" ? "tentative" : "confirmed",
    createdAt: now,
    updatedAt: now,
  };
}

async function fetchCalendarEvents(
  calendarId: string,
  rangeStart: number,
  rangeEnd: number,
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({
      timeMin: new Date(rangeStart).toISOString(),
      timeMax: new Date(rangeEnd).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "false",
    });
    if (pageToken) query.set("pageToken", pageToken);
    const response = await googleGet<GoogleEventResponse>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      query,
    );
    for (const item of response.items ?? []) {
      const event = toCalendarEvent(calendarId, item);
      if (event) events.push(event);
    }
    pageToken = response.nextPageToken;
  } while (pageToken);
  return events;
}

function recordSyncFailure(error: unknown): GoogleCalendarSettings {
  const config = getConfig();
  const message =
    error instanceof Error ? error.message : "Google Calendar sync failed.";
  saveConfig({ ...config, syncError: message });
  return toSettings(getConfig());
}

export function getGoogleCalendarSettings(): GoogleCalendarSettings {
  return toSettings();
}

export function updateGoogleCalendarSettings(
  input: UpdateGoogleCalendarSettingsInput,
): GoogleCalendarSettings {
  const config = getConfig();
  if (input.clientId !== undefined && typeof input.clientId !== "string") {
    throw calendarError(
      "Google OAuth client ID must be a string.",
      "VALIDATION_ERROR",
    );
  }
  if (
    input.selectedCalendarIds !== undefined &&
    (!Array.isArray(input.selectedCalendarIds) ||
      input.selectedCalendarIds.some((id) => typeof id !== "string"))
  ) {
    throw calendarError(
      "Selected calendar IDs must be a list of strings.",
      "VALIDATION_ERROR",
    );
  }
  const clientId =
    input.clientId === undefined ? config.clientId : input.clientId.trim();
  if (clientId.length > 500) {
    throw calendarError(
      "Google OAuth client ID must be 500 characters or fewer.",
      "VALIDATION_ERROR",
    );
  }
  const validIds = new Set(config.calendars.map((calendar) => calendar.id));
  const selectedCalendarIds =
    input.selectedCalendarIds === undefined
      ? config.selectedCalendarIds
      : [
          ...new Set(
            input.selectedCalendarIds.filter((id) => validIds.has(id)),
          ),
        ];
  const nextConfig = { ...config, clientId, selectedCalendarIds };
  saveConfig(nextConfig);
  return toSettings(nextConfig);
}

export async function beginGoogleCalendarAuthorization(): Promise<{
  authorizationStarted: boolean;
}> {
  const config = getConfig();
  if (!config.clientId) {
    throw calendarError(
      "Add your Google OAuth client ID before connecting.",
      "VALIDATION_ERROR",
    );
  }
  const state = base64Url(randomBytes(32));
  const verifier = base64Url(randomBytes(64));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  pendingAuthorization = { state, verifier };
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: GOOGLE_CALENDAR_REDIRECT_URI,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  await shell.openExternal(url.toString());
  return { authorizationStarted: true };
}

export async function handleGoogleCalendarCallback(
  callbackUrl: string,
): Promise<void> {
  const url = new URL(callbackUrl);
  if (
    url.protocol !== "com.ai-task-planner:" ||
    url.pathname !== "/oauth2callback" ||
    !pendingAuthorization
  ) {
    return;
  }
  const authorization = pendingAuthorization;
  pendingAuthorization = null;
  const denied = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (
    denied ||
    !code ||
    url.searchParams.get("state") !== authorization.state
  ) {
    recordSyncFailure(
      calendarError(
        "Google Calendar authorization was cancelled or could not be verified.",
      ),
    );
    return;
  }
  try {
    const config = getConfig();
    const token = await postToken(
      new URLSearchParams({
        code,
        client_id: config.clientId,
        redirect_uri: GOOGLE_CALENDAR_REDIRECT_URI,
        grant_type: "authorization_code",
        code_verifier: authorization.verifier,
      }),
    );
    saveToken(token);
    const calendars = await fetchCalendarList();
    const selectedCalendarIds =
      getConfig().selectedCalendarIds.length > 0
        ? getConfig().selectedCalendarIds.filter((id) =>
            calendars.some((calendar) => calendar.id === id),
          )
        : calendars
            .filter((calendar) => calendar.primary)
            .map((calendar) => calendar.id);
    saveConfig({
      ...getConfig(),
      calendars,
      selectedCalendarIds,
      syncError: null,
    });
    await syncGoogleCalendar();
  } catch (error) {
    recordSyncFailure(error);
  }
}

export async function syncGoogleCalendar(): Promise<GoogleCalendarSettings> {
  try {
    let config = getConfig();
    if (!isConnected()) {
      throw calendarError(
        "Google Calendar is not connected.",
        "CALENDAR_NOT_CONNECTED",
      );
    }
    const calendars = await fetchCalendarList();
    const selectedCalendarIds = config.selectedCalendarIds.filter((id) =>
      calendars.some((calendar) => calendar.id === id),
    );
    config = { ...config, calendars, selectedCalendarIds };
    const rangeStart = getStartOfDay(Date.now());
    const rangeEnd = rangeStart + 8 * DAY_MS;
    for (const calendarId of selectedCalendarIds) {
      const events = await fetchCalendarEvents(
        calendarId,
        rangeStart,
        rangeEnd,
      );
      calendarEventRepo.replaceCalendarEvents(
        calendarId,
        rangeStart,
        rangeEnd,
        events,
      );
    }
    const next = { ...config, lastSyncedAt: Date.now(), syncError: null };
    saveConfig(next);
    return toSettings(next);
  } catch (error) {
    recordSyncFailure(error);
    throw error;
  }
}

export function startGoogleCalendarSync(): void {
  if (syncTimer) return;
  syncTimer = setInterval(() => {
    void syncGoogleCalendar().catch(() => undefined);
  }, SYNC_INTERVAL_MS);
  if (isConnected()) {
    void syncGoogleCalendar().catch(() => undefined);
  }
}

export function stopGoogleCalendarSync(): void {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = null;
}

export function getTodayCalendarEvents(): CalendarEvent[] {
  const start = getStartOfDay(Date.now());
  return calendarEventRepo.getEventsInRange(start, start + DAY_MS);
}

export function getTodayCalendarConflicts(): CalendarConflict[] {
  const plan = dailyPlanRepo.getPlanForDate(getStartOfDay(Date.now()));
  if (!plan) return [];
  let blocks: Array<{
    taskId: string;
    title: string;
    scheduledStart: number;
    budgetedMinutes: number;
  }>;
  try {
    const parsed = JSON.parse(plan.planJson) as { schedule?: typeof blocks };
    blocks = Array.isArray(parsed.schedule) ? parsed.schedule : [];
  } catch {
    return [];
  }
  const events = getTodayCalendarEvents();
  return events.flatMap((event) =>
    blocks.flatMap((block) => {
      const scheduledEnd =
        block.scheduledStart + block.budgetedMinutes * 60_000;
      return event.startTime < scheduledEnd &&
        event.endTime > block.scheduledStart
        ? [
            {
              event,
              taskId: block.taskId,
              taskTitle: block.title,
              scheduledStart: block.scheduledStart,
              scheduledEnd,
            },
          ]
        : [];
    }),
  );
}
