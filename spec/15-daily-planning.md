# Daily Planning (Morning Standup)

## Overview
The AI evaluates the user's backlog, fixed recurring commitments, and historical estimation accuracy to generate a proposed daily schedule. The plan includes timed task allocations and time budgets, presented for the user to review and approve.

## User Input
1. **Available focus hours** — how many hours the user expects to be able to focus today (e.g., 6 hours).
2. **Primary goal** — optional free-text focus area for the day (e.g., "Finish API integration").
3. **Available tasks** — all tasks in Backlog with `status: 'todo'`.
4. **Fixed blocks** — time-anchored recurring tasks for today.
5. **Historical accuracy** — variance metrics from completed tasks.

## Process

```
User clicks "Generate Daily Plan"
→ IPC: ai:generatePlan({ focusHours, primaryGoal })
→ Main: load fixed blocks, backlog tasks, variance metrics
→ Main: construct prompt with context
→ Main: deepseekService.generateDailyPlan(input)
→ Main: validate response as DailyPlan schema
→ Renderer: display proposed plan for review
```

## AI Prompt Structure
- System prompt: "You are a productivity coach and scheduler."
- Context: today's date, available hours, primary goal.
- Fixed blocks: listed as non-negotiable time slots.
- Backlog tasks: each with title, priority, estimate, and historical accuracy note.
- Historical bias: overall trend (overestimator/underestimator) and priority-specific ratios.
- Instructions: produce a JSON schedule with start times, time budgets, and rationale.

## Response Schema
```ts
interface DailyPlan {
  date: number;
  focusHours: number;
  primaryGoal: string;
  schedule: {
    taskId: string;
    title: string;
    priority: Priority;
    estimatedMinutes: number;
    budgetedMinutes: number;     // AI-adjusted time budget
    scheduledStart: number;       // epoch ms
    isFixed: boolean;
    rationale: string;            // why this task at this time
  }[];
  unscheduledTasks: string[];     // task IDs that couldn't fit
  summary: string;                // 1-2 sentence plan summary
}
```

## UI Display
- Timeline view: vertical list of tasks with scheduled times.
- Each block shows: time range, task title, priority badge, budgeted time.
- Fixed blocks displayed with lock icon, distinct styling.
- Summary text at top.
- Unscheduled tasks section at bottom (couldn't fit in today's plan).

## Edge Cases
- No available tasks → AI returns empty plan with suggestion to add tasks.
- Zero available hours → error, must input positive hours.
- Fixed blocks consume all hours → AI schedules only fixed blocks.
- No API key set → prompt user to set key before generating.
- API failure → show error with retry option.

## Dependencies
- Feature 14 (DeepSeek Client), Feature 10 (Fixed-Time Blocking), Feature 13 (Variance Metrics)

## Acceptance Criteria
- [ ] Plan generates with scheduled tasks, start times, and time budgets.
- [ ] Fixed blocks respected (no overlaps).
- [ ] AI-adjusted time budgets reflect historical accuracy.
- [ ] Unscheduled tasks listed separately.
- [ ] Plan summary displayed at top.
- [ ] No API key → clear error before call.
