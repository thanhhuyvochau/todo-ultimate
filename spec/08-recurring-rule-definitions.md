# Recurring Rule Definitions

## Overview
Users define templates for tasks that repeat on a schedule (daily, weekly, monthly). These rules are stored as templates — individual task instances are created only on the target date by the Daily Instantiation Engine.

## Requirements
- Create recurring rules with: `title`, `description`, `priority`, `estimated_minutes`, `frequency`, optional `time_anchor`.
- Frequency options: `daily`, `weekly` (with day-of-week selection), `monthly` (with day-of-month).
- Time anchor: optional fixed time of day (e.g., 20:00 = 8:00 PM) stored as epoch ms offset.
- Enable/disable toggle per rule — inactive rules don't generate tasks.
- View all active rules in a "Recurring" settings panel.
- Edit and delete rules; deleting a rule does NOT delete already-generated task instances.

## Data Model
```ts
interface RecurringRule {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  estimated_minutes: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  time_anchor: number | null;           // epoch ms of HH:MM today (used as offset)
  is_active: boolean;
  last_instantiated_date: number | null; // epoch ms of last run
  created_at: number;
}
```

## UI Behavior
- Form: title input, priority dropdown, time estimate field, frequency selector.
- Weekly selector: multi-select checkboxes for days (Mon–Sun).
- Monthly selector: day-of-month number field (1–31) with validation.
- Time anchor: time picker (HH:MM), optional with clear button.
- Rule list: card per rule with toggle switch, edit/delete actions.
- Confirmation dialog on delete: "This won't remove existing tasks."

## Edge Cases
- Feb 30 or 31st: skip silently (only valid dates instantiate).
- Day-of-week schedule: task generated on the next matching day.
- Midnight time anchor: treat as 00:00 (start of day).
- Time anchor without specified date: anchor applies to the instantiated task's day.

## Dependencies
- Feature 1 (Database), Feature 4 (Backlog CRUD), Feature 9 (Instantiation Engine)

## Acceptance Criteria
- [ ] Create recurring rule with all frequency types.
- [ ] Time anchor saves and displays correctly.
- [ ] Toggle disables/enables rule generation.
- [ ] Edit rule updates stored template; existing tasks unchanged.
- [ ] Delete rule does not delete generated tasks.
