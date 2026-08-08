# Variance Metrics

## Overview
Compute how accurate the user's time estimates are by comparing `actual_minutes` against `estimated_minutes` for completed tasks. These metrics feed into the AI planner to refine future estimations and into performance reports for user insight.

## Requirements
- Per-task variance: `Δ = actual_minutes − estimated_minutes`.
- Per-task variance ratio: `actual_minutes / estimated_minutes` (≥ 0).
- Aggregate metrics: mean variance, mean absolute variance, variance by priority, variance by task type.
- Metrics computed on-demand (not pre-aggregated) from completed tasks within a timeframe.
- Feed metrics into AI plan input as historical context.

## Metrics Computed

```ts
interface VarianceMetrics {
  totalCompleted: number;
  overallMeanVariance: number;          // avg(actual − estimated)
  overallMeanAbsoluteVariance: number;  // avg(|actual − estimated|)
  byPriority: {
    low: { meanVariance: number; count: number };
    medium: { meanVariance: number; count: number };
    high: { meanVariance: number; count: number };
  };
  underestimationRate: number;          // % of tasks where actual > estimated
  overestimationRate: number;           // % of tasks where actual < estimated
  onPointRate: number;                  // % of tasks where |Δ| ≤ 5 minutes
}
```

## AI Input Format
Appended to the daily planning prompt:
```
Historical estimation accuracy:
- Overall bias: +12 min (tendency to underestimate)
- High-priority tasks: 1.4x actual/estimated ratio
- 35% of estimates within 5 min accuracy
```

## UI Display
- Performance report dashboard shows trend chart (variance over time).
- Task card shows Δ badge: "+15 min" (red, underestimated) or "−5 min" (green, overestimated).
- "Estimation Accuracy" gauge on dashboard: percentage of tasks within tolerance.

## Edge Cases
- Zero estimated_minutes → skip from ratio calculation, flag as invalid.
- No completed tasks → return empty metrics, AI uses default assumptions.
- Very large variance (>10x estimate) → include in metrics but flag as outlier.

## Dependencies
- Feature 12 (Duration Calculation), Feature 17 (Performance Reports), Feature 15 (Daily Planning)

## Acceptance Criteria
- [ ] Per-task Δ computed correctly on completion.
- [ ] Aggregate metrics computed for any timeframe.
- [ ] Metrics included in AI plan prompt.
- [ ] Δ badge displayed on completed task cards.
- [ ] Trend chart shows accuracy improvement over time.
- [ ] Priority-based breakdown accurate.
