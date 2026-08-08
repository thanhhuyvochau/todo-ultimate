# Plan Review & Approval

## Overview
After the AI generates a daily plan, the user reviews the proposed schedule, optionally adjusts time budgets or task order, and approves it. Only approved plans transition tasks to the Today view and activate the schedule.

## Requirements
- Display the full AI-generated plan in a reviewable format.
- User can adjust per-task `budgetedMinutes` and reorder non-fixed tasks.
- User can remove tasks from the plan (moved back to Backlog).
- User can adjust `focusHours` and re-generate.
- "Approve Plan" button finalizes the plan.
- On approval: tasks in plan get `scheduled_date` set to today, appear in Today view.
- On approval: plan saved to `daily_plans` table with `is_approved: true`.

## UI Behavior
- Timeline view with each task on a row.
- Editable time budget: click number → inline text input.
- Drag handle on non-fixed tasks to reorder.
- Remove button (X) to drop task from plan.
- Regenerate button to re-run AI with adjusted parameters.
- Approve button: primary CTA, triggers confirmation dialog.
- Confirmation dialog: "This will schedule X tasks for today. Continue?"
- Post-approval: redirect to Today view.

## Data Model
```ts
// daily_plans table entry
{
  id: string;
  date: number;          // epoch ms of plan date
  focus_hours: number;
  primary_goal: string;
  plan_json: string;     // serialized DailyPlan
  is_approved: 0 | 1;
  created_at: number;
}
```

## State Management
- Zustand `usePlanStore`: `{ plan, isGenerating, isReviewing, error }`.
- `plan` is null before generation, populated after AI response, cleared on approve/regenerate.
- `isApproved` flag controls transition from review → Today.

## Error Handling
- Approval save failure → rollback transaction, show error, don't transition tasks.
- Partial approval (some tasks saved, some not) → must be atomic (transaction).
- Already-approved plan for today → show warning, allow re-approval with confirmation.

## Dependencies
- Feature 15 (Daily Planning), Feature 7 (Today View)

## Acceptance Criteria
- [ ] AI plan displayed in review UI.
- [ ] Per-task budget editable inline.
- [ ] Non-fixed tasks reorderable.
- [ ] Tasks removable from plan (return to Backlog).
- [ ] Approve saves plan + schedules tasks to Today.
- [ ] Plan transaction is atomic (all tasks or none).
- [ ] Confirmation dialog before approval.
- [ ] Regenerate re-runs AI with current constraints.
