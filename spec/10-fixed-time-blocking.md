# Fixed-Time Blocking

## Overview
Recurring tasks with a time anchor (e.g., daily reading at 8:00 PM) are treated as non-negotiable fixed blocks during AI daily scheduling. The AI planner must schedule around these blocks and never double-book them.

## Requirements
- Recurring tasks with a `time_anchor` are marked as `fixed` in daily AI schedule.
- AI planner receives these as pre-allocated time slots in the schedule input.
- The AI must not schedule flexible tasks overlapping with fixed blocks.
- User cannot delete or reschedule a fixed-time task from Today without disabling the rule.
- Visual distinction: fixed blocks rendered with a lock icon and distinct background color.

## Data Flow
```
Recurring Engine → creates task with time_anchor → task in Today
AI Planner input includes: { fixedBlocks: [{ taskId, title, startTime, estimated_minutes }] }
AI must schedule around these blocks
```

## Schedule Input Format
```ts
interface AIScheduleInput {
  date: number;
  focusHours: number;
  primaryGoal: string;
  availableTasks: Task[];
  fixedBlocks: {
    taskId: string;
    title: string;
    startTime: number;       // epoch ms
    durationMinutes: number;
  }[];
}
```

## UI Behavior
- Fixed tasks in Today view: lock icon + time label (e.g., "🕗 8:00 PM").
- Cannot drag to reorder time-anchored tasks.
- Tooltip: "Fixed time block — managed by recurring rule."
- Clicking on a fixed task navigates to the recurring rule settings.

## Edge Cases
- Two fixed blocks at the same time → error, block second rule creation.
- Fixed block longer than available focus hours → warn user, AI must still schedule it.
- Time anchor task completed early → slot remains blocked in schedule view.

## Dependencies
- Feature 8 (Recurring Rules), Feature 9 (Instantiation Engine), Feature 15 (Daily Planning)

## Acceptance Criteria
- [ ] Fixed-time tasks appear with lock icon in Today view.
- [ ] AI planner receives fixed blocks in schedule input.
- [ ] AI-generated plan does not overlap with fixed blocks.
- [ ] Time-anchored tasks cannot be reordered by drag-and-drop.
- [ ] Duplicate time slot blocked at rule creation.
