import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import type { CalendarEvent } from "@/shared/models";

const testDbReady = vi.fn<() => Database.Database>();

vi.mock("../database", () => ({ getDb: () => testDbReady() }));

let db: Database.Database;

function event(id: string, startTime: number, endTime: number): CalendarEvent {
  return {
    id: `primary:${id}`,
    calendarId: "primary",
    gcalEventId: id,
    title: id,
    startTime,
    endTime,
    status: "confirmed",
    createdAt: 1,
    updatedAt: 1,
  };
}

beforeEach(() => {
  db = new Database(":memory:");
  db.exec(`
    CREATE TABLE calendar_events (
      id TEXT PRIMARY KEY,
      calendar_id TEXT NOT NULL,
      gcal_event_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(calendar_id, gcal_event_id)
    );
  `);
  testDbReady.mockReturnValue(db);
});

afterAll(() => {
  if (db?.open) db.close();
});

describe("calendar-event-repository", () => {
  it("returns events that overlap a requested range", async () => {
    const repo = await import("../calendar-event-repository");
    repo.replaceCalendarEvents("primary", 0, 100, [event("overlap", 50, 150)]);

    expect(
      repo.getEventsInRange(100, 200).map((item) => item.gcalEventId),
    ).toEqual(["overlap"]);
  });

  it("removes absent events within the refreshed window", async () => {
    const repo = await import("../calendar-event-repository");
    repo.replaceCalendarEvents("primary", 0, 100, [event("removed", 10, 20)]);
    repo.replaceCalendarEvents("primary", 0, 100, [event("current", 40, 50)]);

    expect(
      repo.getEventsInRange(0, 100).map((item) => item.gcalEventId),
    ).toEqual(["current"]);
  });
});
