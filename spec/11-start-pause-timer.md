# Start/Pause Timer

## Overview
Background-safe task timer started when a task transitions to `in_progress`. Runs in the Main Process to survive window minimize/close. Logs start/pause intervals to `task_time_logs`.

## Requirements
- Timer starts automatically when task status changes to `in_progress`.
- Timer pauses when: task status changes to `todo` or `completed`, or user manually pauses.
- Only one timer active at a time — starting a new task auto-pauses the previous.
- Timer runs in Main Process via `setInterval` (1-second tick for display). Actual duration computed from log intervals, not tick count.
- Main Process stores state in memory: `activeTimer: { taskId, logId, startedAt } | null`.
- Renderer subscribes to timer ticks via a dedicated IPC event (`timer:tick`) for display updates.

## Data Flow
```
Task status → in_progress
→ IPC: timer:start({ taskId })
→ Main: INSERT task_time_logs (id, task_id, started_at)
→ Main: set timerActive state
→ Main: emit timer:tick every 1s (elapsed seconds)
→ Renderer: display live counter

Task status → todo/completed OR manual pause
→ IPC: timer:pause({ taskId })
→ Main: UPDATE task_time_logs SET paused_at = NOW()
→ Main: compute duration_minutes = (paused_at - started_at) / 60000
→ Main: clear timerActive state
→ Renderer: show final elapsed time
```

## IPC Channels
| Channel | Direction | Request | Response |
|---------|-----------|---------|----------|
| `timer:start` | R → M | `{ taskId }` | `{ logId }` |
| `timer:pause` | R → M | `{ taskId }` | `{ durationMinutes }` |
| `timer:tick` | M → R | event | `{ taskId, elapsedSeconds }` |
| `timer:getActive` | R → M | `{}` | `{ taskId, elapsedSeconds } \| null` |

## Edge Cases
- App closes while timer active → pause time logged as `Date.now()`, timer state persists.
- App reopens → check for unfinished `task_time_logs` with `paused_at IS NULL`, restore timer.
- System sleep/hibernate → on resume, actual wall-clock elapsed time may be wrong. Use `paused_at - started_at` intervals only.
- Multiple rapid start/pause → debounce (200ms) to prevent log spam.

## Error Handling
- `timer:start` with already-active timer → auto-pause previous, start new. Return warning in response.
- `timer:pause` with no active timer → return `NOT_FOUND`.

## Today-Only and Transactional Behavior

- Starting requires a non-null persisted `scheduled_date`; the current timer is
  not disturbed when this validation fails.
- A task handoff closes the prior log, updates actual minutes, resets the prior
  task to `todo`, and starts the new task in one SQLite transaction.
- Returning an active task to Backlog closes its log, updates actual minutes,
  resets it to `todo`, and clears its schedule in one transaction.
- In-memory timer state and renderer tick broadcasts change only after commit.

## Dependencies
- Feature 6 (Status Workflow), Feature 2 (IPC Bridge)

## Acceptance Criteria
- [ ] Backlog timer starts return `STATE_TRANSITION_ILLEGAL` with the stable message.
- [ ] Active-task handoff and return to Backlog cannot partially persist.
- [ ] Timer starts on `in_progress` status change.
- [ ] Timer pauses on status change away from `in_progress`.
- [ ] Manual pause via UI button works.
- [ ] Renderer displays live elapsed time.
- [ ] App close/reopen preserves timer state.
- [ ] Only one active timer at a time.
