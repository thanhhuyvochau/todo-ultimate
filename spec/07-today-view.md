# Today View

## Overview
A focused view showing tasks scheduled for the current day. Tasks are promoted here from the Backlog (manually or via AI daily plan approval) and from recurring rule instantiation.

## Requirements
- Display tasks where `scheduled_date` matches today's date (normalized to start of day).
- Tasks from approved `daily_plan` automatically appear here.
- Recurring task children auto-generated for today appear here.
- Split view: active tasks (top) and completed today (bottom, collapsed by default).
- Drag-and-drop to reorder priority within Today.
- "Add to Today" action on Backlog tasks (sets `scheduled_date` to today).
- "Return to Backlog" action on Today tasks (clears `scheduled_date`).

## UI Behavior
- Date header: "Today — Saturday, August 8, 2026".
- Task cards show: title, priority badge, estimated time, elapsed timer (if active).
- Completed section: collapsible, shows count ("3 completed today").
- Empty state: illustration + "Add tasks from Backlog or wait for your morning plan."
- Switching days: future dates show empty; past dates show completed tasks read-only.

## Data Model
- `tasks.scheduled_date`: epoch ms of midnight for the target day.
- `daily_plans.date`: epoch ms of the plan's target day.
- `daily_plans.is_approved`: when true, tasks in `plan_json` are promoted to Today.

## Edge Cases
- Midnight crossing: tasks from yesterday not completed remain in Today (no forced reset).
- Plan approval: replacing today's existing tasks requires confirmation.
- Multiple plans for same date: only the latest approved plan applies.

## Carry-Forward Behavior

- Unfinished tasks with `scheduled_date` before today's local midnight appear
  in an Overdue section above today's fixed and flexible tasks.
- Overdue tasks retain their original scheduled timestamp and sort oldest first.
- Overdue tasks can be started or returned to Backlog.
- Completed past tasks and future scheduled tasks remain excluded.
- Returning an active task closes its timer log and resets it to `todo` before
  clearing `scheduled_date`.

## Dependencies
- Feature 4 (Backlog CRUD), Feature 9 (Recurring Instantiation), Feature 16 (Plan Approval)

## Acceptance Criteria
- [ ] Unfinished past tasks appear in the dedicated Overdue section.
- [ ] Today view shows only tasks with matching `scheduled_date`.
- [ ] "Add to Today" and "Return to Backlog" actions work.
- [ ] Completed section shows with correct count.
- [ ] Empty state displayed when no tasks for today.
- [ ] Approved AI plan populates Today view automatically.
