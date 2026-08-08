# Report Caching

## Overview
Cache generated performance reports locally in the `performance_reports` SQLite table. Reports include metadata (timeframe, prompt version) for cache validation and historical browsing.

## Requirements
- Every generated report is saved to `performance_reports` table.
- Cache key: `timeframe_start + timeframe_end` — only one report per exact timeframe.
- If a report for the same timeframe already exists: replace or prompt user to keep both.
- Tag each cache entry with: `prompt_version` (from prompt template), `created_at`.
- Reports are immutable once stored (no editing cached reports).
- Browse past reports in a "Report History" view.

## Data Model
```ts
interface PerformanceReportCache {
  id: string;
  timeframe_start: number;
  timeframe_end: number;
  report_json: string;       // serialized PerformanceReport
  prompt_version: string;    // e.g., "report-v1"
  created_at: number;
}
```

## Cache Validation
- When generating a new report, check if prompt version has changed since cached report.
- If prompt version updated, auto-invalidate old cache for that timeframe.
- Cache is local-only; no remote sync needed.
- Cache uses SQLite for persistence — survives app restarts.
- No cache expiration (reports are historical records).

## Report History UI
- List view: each entry shows timeframe, generated date, efficiency score.
- Click entry → view full cached report.
- Delete action per entry with confirmation.
- Sort by date (newest first).
- Search/filter by timeframe range.

## Edge Cases
- Very large reports (lots of tasks) → JSON stored as TEXT, SQLite handles up to 1GB.
- Two reports generated back-to-back for same timeframe → prompt user: replace or keep.
- Corrupted cache entry → skip on list view, log warning, offer to regenerate.

## Dependencies
- Feature 1 (Database), Feature 17 (Report Generation)

## Acceptance Criteria
- [ ] Report saved to `performance_reports` table after generation.
- [ ] Same-timeframe duplicate prompts user action.
- [ ] Prompt version tagged on each cache entry.
- [ ] Report history view lists all cached reports.
- [ ] Click to view cached report works.
- [ ] Delete removes cache entry.
- [ ] Corrupted entries handled gracefully.
