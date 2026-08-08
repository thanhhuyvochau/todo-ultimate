# Performance Report History

## Overview
Browse, view, and manage previously generated performance reports. Each report is stored in the `performance_reports` SQLite table and is accessible from the Reports view as a history list.

## Requirements
- List all cached reports sorted by `created_at` (newest first).
- Each list item shows: timeframe range, generated date, efficiency score.
- Click a list item to view the full report.
- Delete reports with confirmation.
- Filter/search by timeframe or date.
- Click-to-view restores the full `report_json` into the report viewer.

## UI Layout

```
┌─────────────────────────────────────────────┐
│  Reports                                    │
│  ┌─────────────────────────────────────┐    │
│  │ [Generate New Report ▼]  timeframes │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Report History (3)                         │
│  ┌─────────────────────────────────────┐    │
│  │ 📊 Jul 28 – Aug 3, 2026            │    │
│  │ Score: 72/100 · 12 tasks · Aug 3   │    │
│  │                          [View][🗑] │    │
│  ├─────────────────────────────────────┤    │
│  │ 📊 Jul 21 – Jul 27, 2026           │    │
│  │ Score: 68/100 · 8 tasks · Jul 28   │    │
│  │                          [View][🗑] │    │
│  ├─────────────────────────────────────┤    │
│  │ 📊 Jul 14 – Jul 20, 2026           │    │
│  │ Score: 58/100 · 10 tasks · Jul 21  │    │
│  │                          [View][🗑] │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## Full Report View
- When viewing a cached report, render same UI as freshly generated report (Feature 17).
- Show "Cached Report — generated on [date]" banner at top.
- Regenerate button: re-run AI for same timeframe.
- Back button returns to history list.

## Filtering
- Text search: searches timeframe labels and generated dates.
- Date range filter: show reports within a custom start/end range.

## Edge Cases
- Empty history: "No reports yet. Generate your first performance report."
- Very large report JSON (many tasks) → load lazily, not all at once.
- Deleted report currently being viewed → redirect to history list.

## Dependencies
- Feature 18 (Report Caching), Feature 17 (Report Generation)

## Acceptance Criteria
- [ ] History list shows all cached reports, newest first.
- [ ] Each item shows timeframe, score, task count, date.
- [ ] Click to view loads full cached report.
- [ ] Delete with confirmation works.
- [ ] Empty state with call-to-action.
- [ ] Regenerate button re-runs AI for same timeframe.
