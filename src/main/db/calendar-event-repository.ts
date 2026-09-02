import { getDb } from "./database";
import type { CalendarEvent } from "@/shared/models";

interface CalendarEventRow {
  id: string;
  calendar_id: string;
  gcal_event_id: string;
  title: string;
  start_time: number;
  end_time: number;
  status: "confirmed" | "tentative";
  created_at: number;
  updated_at: number;
}

function rowToEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    gcalEventId: row.gcal_event_id,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getEventsInRange(
  startTime: number,
  endTime: number,
): CalendarEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM calendar_events
       WHERE start_time < ? AND end_time > ?
       ORDER BY start_time ASC, end_time ASC`,
    )
    .all(endTime, startTime) as CalendarEventRow[];
  return rows.map(rowToEvent);
}

export function replaceCalendarEvents(
  calendarId: string,
  rangeStart: number,
  rangeEnd: number,
  events: CalendarEvent[],
): void {
  const db = getDb();
  const replace = db.transaction(() => {
    db.prepare(
      `DELETE FROM calendar_events
       WHERE calendar_id = ? AND start_time < ? AND end_time > ?`,
    ).run(calendarId, rangeEnd, rangeStart);

    const insert = db.prepare(
      `INSERT INTO calendar_events (
        id, calendar_id, gcal_event_id, title, start_time, end_time, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(calendar_id, gcal_event_id) DO UPDATE SET
        title = excluded.title,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        status = excluded.status,
        updated_at = excluded.updated_at`,
    );
    for (const event of events) {
      insert.run(
        event.id,
        event.calendarId,
        event.gcalEventId,
        event.title,
        event.startTime,
        event.endTime,
        event.status,
        event.createdAt,
        event.updatedAt,
      );
    }
  });
  replace();
}
