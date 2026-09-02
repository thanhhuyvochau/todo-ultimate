# Google Calendar Integration

## Overview
Import Google Calendar events as fixed time blocks to ensure the AI Planner schedules tasks around your meetings. The integration is strictly read-only, ensuring privacy and non-destructive behavior on the user's external calendar.

## Requirements
- **Authentication**: OAuth2 with PKCE using a custom protocol handler (`todo-ultimate://oauth2callback`).
- **Scopes**: Requires `https://www.googleapis.com/auth/calendar.events.readonly` scope.
- **Syncing Strategy**: Background sync every 15 minutes for a rolling window of the current day plus the next 7 days.
- **Event Filtering**: Only import events marked as "Busy", that are NOT all-day, and are NOT declined.
- **Multi-Calendar Support**: After authentication, users can select which calendars to sync via the settings UI.
- **Error Resilience**: If sync fails (offline or token expired), show a non-intrusive warning badge/icon and silently pause syncing until restored.
- **Conflict Handling**: If a new calendar event arrives and overlaps with an already scheduled AI task, the UI visually flags the conflict and suggests clicking a "Re-plan" button for the AI to fix it.

## Data Flow
```text
User OAuth via Browser → Desktop App Protocol Handler → Store Token in safeStorage
Background Poller (every 15m) → Google Calendar API → Store in `calendar_events` Table
AI Planner Input ← Merged Tasks + Calendar Events
UI Today View ← Merged Tasks + Calendar Events
```

## Database Schema Extension
```sql
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL,
  gcal_event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_time INTEGER NOT NULL, -- Unix epoch ms
  end_time INTEGER NOT NULL,   -- Unix epoch ms
  status TEXT NOT NULL,        -- e.g., 'confirmed', 'tentative'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for fast time range queries
CREATE INDEX idx_calendar_events_time ON calendar_events(start_time, end_time);
```

## AI Schedule Input Modification
```typescript
interface AIScheduleInput {
  date: number;
  focusHours: number;
  primaryGoal: string;
  availableTasks: Task[];
  fixedBlocks: {
    taskId: string;
    title: string;
    startTime: number;
    durationMinutes: number;
  }[];
  // New section passed as non-negotiable blocks
  calendarEvents: {
    eventId: string;
    title: string;
    startTime: number;
    endTime: number;
  }[];
}
```

## UI Behavior
- Calendar events are shown as fixed blocks in the Today view, styled distinctly (e.g., with a calendar icon and distinct background color).
- Calendar events cannot be started/paused (timer is disabled) or reordered.
- A warning icon appears in the header if background sync fails. Clicking it reveals the error (e.g., "Network offline" or "Token expired, click to re-authenticate").
- The Settings page includes a new "Google Calendar Integration" section listing available calendars with toggle switches.

## Edge Cases
- **Network Offline**: Show warning badge, pause background sync, and use locally cached events.
- **Token Expiration**: Show warning badge; clicking it initiates a new OAuth flow.
- **Overlapping Calendar Events**: If two calendars have meetings at the same time, the AI Planner treats the union of these time blocks as unavailable.
- **Event Deletion**: If an event is deleted from Google Calendar, the rolling window sync must detect its absence and delete it locally from `calendar_events`.

## Dependencies
- Feature 3 (safeStorage for OAuth token)
- Feature 10 (Fixed-time blocking logic in UI)
- Feature 15 (Daily AI Planning context)

## Acceptance Criteria
- [ ] OAuth2 flow works and stores token securely via `safeStorage`.
- [ ] Background sync runs successfully every 15 minutes.
- [ ] Only busy, non-all-day, accepted events appear in the `calendar_events` table.
- [ ] Settings page correctly fetches and allows toggling of specific calendars.
- [ ] AI generated plan successfully schedules tasks around calendar events.
- [ ] UI properly flags conflicts between new events and previously scheduled tasks.
