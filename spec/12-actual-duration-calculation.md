# Actual Duration Calculation

## Overview
Compute the true elapsed time a task spent `in_progress` from raw `task_time_logs` intervals. Sum all (paused_at − started_at) gaps for a given task. This approach is drift-safe — it doesn't rely on a running tick count.

## Requirements
- Aggregate all `task_time_logs` rows for a task.
- For each log: if `paused_at` is null, use `Date.now()` (timer still running).
- Sum `(paused_at − started_at)` converted to minutes (integer).
- Store result in `task.actual_minutes` when task is completed.
- Display live elapsed time in renderer by summing logs + active interval.
- Persist `duration_minutes` per log on pause for fast queries and audit trail.

## Calculation

```ts
function calculateActualMinutes(taskId: string): number {
  const logs = db.prepare(
    'SELECT started_at, paused_at FROM task_time_logs WHERE task_id = ?'
  ).all(taskId) as TimeLogRow[];

  let totalMs = 0;
  for (const log of logs) {
    const end = log.paused_at ?? Date.now();
    totalMs += end - log.started_at;
  }
  return Math.round(totalMs / 60000);
}
```

## Data Integrity
- Never auto-delete `task_time_logs` — they are the audit trail.
- If `paused_at < started_at` (impossible but defensive): skip the row, log warning.
- If a log has `duration_minutes` already computed, prefer that to avoid recalculation drift.
- On task completion: stamp `task.actual_minutes` from the computed total, update `updated_at`.

## Performance
- For tasks with many intervals (>100), the sum is sub-millisecond in the main process.
- Cache `actual_minutes` on the task row to avoid recomputing on every render.

## Dependencies
- Feature 11 (Start/Pause Timer), Feature 6 (Status Workflow)

## Acceptance Criteria
- [ ] `actual_minutes` correct for a task paused multiple times.
- [ ] Running timer reflects current elapsed time (includes active interval).
- [ ] Completed task shows accurate total time.
- [ ] No drift after app close/reopen.
- [ ] `task_time_logs` are never deleted or modified.
