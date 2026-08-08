# Performance Report Generation

## Overview
The AI analyzes completed and active tasks within a user-selected timeframe, computes variance ratios, identifies underestimation patterns by priority and type, and delivers structured performance advice.

## Requirements
- User selects timeframe: last 7 days, 14 days, 30 days, or custom date range.
- Clicking "Generate Performance Report" triggers the AI analysis.
- AI receives: completed task list with estimates and actuals, active tasks, timeframe.
- AI output: structured report with key metrics, patterns, and actionable advice.
- Report displayed in a dedicated view with sections for each analysis dimension.

## Process
```
User selects timeframe → clicks "Generate"
→ IPC: ai:generateReport({ timeframeDays })
→ Main: query completed tasks, active tasks in timeframe
→ Main: compute variance metrics
→ Main: construct prompt with full task data + metrics
→ Main: deepseekService.generatePerformanceReport(params)
→ Main: validate response as PerformanceReport schema
→ Main: cache report in performance_reports table
→ Renderer: display structured report
```

## Report Schema
```ts
interface PerformanceReport {
  timeframe: { start: number; end: number };
  generatedAt: number;
  metrics: {
    totalCompleted: number;
    overallVariance: number;
    meanAbsoluteVariance: number;
    byPriority: { low: PriorityMetrics; medium: PriorityMetrics; high: PriorityMetrics };
    efficiencyScore: number;       // 0-100
    trendDirection: 'improving' | 'declining' | 'stable';
  };
  patterns: {
    title: string;
    description: string;
    severity: 'info' | 'warning' | 'positive';
  }[];
  advice: {
    category: 'estimation' | 'priority' | 'scheduling' | 'focus';
    recommendation: string;
    actionableTip: string;
  }[];
  summary: string;
}
```

## UI Display
- Report header: timeframe, generated date, efficiency score gauge.
- Key metrics cards: total completed, mean variance, on-point rate.
- Priority breakdown: bar chart (estimated vs actual by priority).
- Patterns section: bullet list with severity icons (⚠️ warning, ✅ positive, ℹ️ info).
- Advice section: categorized recommendations with actionable tips.
- Summary paragraph at bottom.
- Export option: print-friendly view or copy to clipboard.

## Edge Cases
- No completed tasks in timeframe → report shows "No data" with suggestion to track tasks.
- Very few tasks (<3) → generate but warn "low sample size."
- All tasks on point → celebrate with positive messaging.
- API failure → show cached last report if available.

## Dependencies
- Feature 14 (DeepSeek Client), Feature 13 (Variance Metrics), Feature 18 (Report Caching)

## Acceptance Criteria
- [ ] Report generates for 7/14/30 day and custom timeframes.
- [ ] All completed tasks in timeframe included in analysis.
- [ ] Metrics displayed: variance, by-priority breakdown, efficiency score.
- [ ] Patterns identified and displayed with severity indicators.
- [ ] Actionable advice provided per category.
- [ ] Export/copy report works.
- [ ] Empty state handled gracefully.
