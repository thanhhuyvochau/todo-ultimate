# Task Status Workflow

## Overview
Define and enforce valid state transitions for tasks. Every task progresses through a lifecycle: `todo → in_progress → completed`. Illegal transitions are rejected with descriptive errors. Tasks cannot skip states.

## States

| State | Meaning | Allowed From | Allowed To |
|-------|---------|-------------|------------|
| `todo` | In Backlog, not started | (initial) | `in_progress` |
| `in_progress` | Actively being worked on | `todo` | `todo` (return to backlog), `completed` |
| `completed` | Done | `in_progress` | (terminal) |

## Transition Rules
- `todo → completed`: **REJECTED** — must go through `in_progress`.
- `completed → todo`: **REJECTED** — completed tasks may not be reopened.
- `completed → in_progress`: **REJECTED** — completed tasks may not be re-activated.
- `in_progress → todo`: Allowed (return task to backlog, pause timer if active).

## Implementation
- Status changes via `tasks:update` IPC channel.
- Main process validates transitions before writing to DB.
- Only one task can be `in_progress` at a time. Starting a new task auto-pauses the previous one.
- When a task enters `in_progress`, auto-start the timer (Feature 11).
- When a task enters `completed`, calculate `actual_minutes` from time logs.

## IPC Behavior
```ts
// Rejected transition
// request: { id: 'abc', status: 'completed' }
// current status: 'todo'
// response: { ok: false, error: { code: 'STATE_TRANSITION_ILLEGAL', message: '...' } }
```

## Error Codes
- `STATE_TRANSITION_ILLEGAL`: invalid state jump.
- `TASK_NOT_FOUND`: task ID doesn't exist.
- `TASK_ALREADY_ACTIVE`: another task is already `in_progress`.
- `TIMER_STOP_FAILED`: couldn't pause the currently active timer.

## Today-Only Start and Atomic Handoff

- A task can enter `in_progress` only when its currently persisted
  `scheduled_date` is non-null.
- Moving to Today and starting are separate operations. A combined
  `scheduledDate` plus `in_progress` patch cannot bypass the guard.
- Both `tasks:update` and `timer:start` return `STATE_TRANSITION_ILLEGAL` with
  "Cannot start a task that is in the backlog. Move it to Today first."
- Starting another task atomically closes the prior log, updates accumulated
  minutes, resets the prior task to `todo`, and starts the selected task.
- Returning an active task to Backlog atomically closes its log, resets it to
  `todo`, and clears `scheduled_date`.

## Dependencies
- Feature 4 (Backlog CRUD), Feature 11 (Timer)

## Acceptance Criteria
- [ ] Backlog tasks cannot be started through either IPC path.
- [ ] Scheduling and starting must happen as two distinct operations.
- [ ] `todo → in_progress` succeeds.
- [ ] `todo → completed` rejected with clear error.
- [ ] `completed → todo` / `completed → in_progress` rejected.
- [ ] `in_progress → todo` succeeds, timer paused.
- [ ] Only one task `in_progress` at a time.
- [ ] Entering `completed` calculates `actual_minutes`.
