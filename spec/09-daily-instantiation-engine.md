# Daily Instantiation Engine

## Overview
Background service in the Main Process that checks active recurring rules on app startup and on date change (midnight crossing) and instantiates today's task instances.

## Requirements
- Runs on: app startup, date change detection (setInterval every 60s or native notification).
- For each active `recurring_rule` with a matching frequency:
  - Check `last_instantiated_date` — if it's before today, create a new task.
  - Create task in Backlog with `is_recurring_child: true` and `recurring_rule_id` set.
  - If the rule has a `time_anchor`, set the task's `scheduled_date` to today.
- Update `last_instantiated_date` to today after successful instantiation.
- Deduplication: never create the same recurring task twice for the same date.

## Logic

```ts
// Main Process: src/main/services/recurringEngine.ts
async function instantiateDailyTasks(): Promise<void> {
  const today = getStartOfDay(Date.now());
  const activeRules = db.prepare(
    'SELECT * FROM recurring_rules WHERE is_active = 1'
  ).all() as RecurringRule[];

  for (const rule of activeRules) {
    if (!rule.last_instantiated_date || rule.last_instantiated_date < today) {
      if (matchesFrequency(rule.frequency, today)) {
        db.prepare(
          'INSERT INTO tasks (id, title, description, priority, status, estimated_minutes, is_recurring_child, recurring_rule_id, scheduled_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)'
        ).run(
          crypto.randomUUID(),
          rule.title,
          rule.description,
          rule.priority,
          'todo',
          rule.estimated_minutes,
          rule.id,
          rule.time_anchor ? applyTimeAnchor(today, rule.time_anchor) : null,
          Date.now(),
          Date.now()
        );
        db.prepare(
          'UPDATE recurring_rules SET last_instantiated_date = ? WHERE id = ?'
        ).run(today, rule.id);
      }
    }
  }
}
```

## Frequency Matching
- `daily`: always matches.
- `weekly`: matches on the rule's configured day(s) of week.
- `monthly`: matches on the configured day of month (skip invalid dates).

## Performance
- Runs synchronously in main process (sub-second for reasonable rule counts).
- Batched DB writes in a single transaction.

## Dependencies
- Feature 1 (Database), Feature 8 (Recurring Rules)

## Acceptance Criteria
- [ ] App startup creates today's recurring tasks.
- [ ] Only one task per rule per day (no duplicates).
- [ ] Inactive rules produce no tasks.
- [ ] Daily rules generate every day.
- [ ] Weekly rules generate on correct day only.
- [ ] Monthly rules generate on correct day, skip invalid dates.
- [ ] Time-anchored tasks have `scheduled_date` set.
