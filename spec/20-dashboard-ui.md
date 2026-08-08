# Dashboard UI

## Overview
The main application layout with navigation between views: Backlog, Today, Daily Plan, Reports, and Settings. Uses a sidebar navigation pattern with the active timer visible at all times.

## Layout Structure

```
┌──────────────────────────────────────────────────────┐
│  Header Bar                                          │
│  [☰] AI Task Planner         [⏱ Active Timer: 12:34]│
├──────────┬───────────────────────────────────────────┤
│ Sidebar  │                                           │
│          │         Content Area                       │
│ ▪ Backlog│                                           │
│ ▪ Today  │         (Current View)                    │
│ ▪ Plan   │                                           │
│ ▪ Reports│                                           │
│          │                                           │
│ ⚙ Settings│                                          │
├──────────┴───────────────────────────────────────────┤
│  Status Bar (sync status, last saved)                │
└──────────────────────────────────────────────────────┘
```

## Navigation
- Sidebar: icon + label per view, active state highlighting.
- Views: Backlog, Today, Daily Plan, Reports, Settings.
- Collapsible sidebar (toggle via hamburger ☰).
- Keyboard shortcuts: `Ctrl+1` Backlog, `Ctrl+2` Today, `Ctrl+3` Plan, `Ctrl+4` Reports.

## Header Bar
- App title "AI Task Planner" with logo/icon.
- Active timer display: shows current task title, elapsed time (HH:MM:SS).
- Pause button inline in header when timer running.
- Empty timer state: "No active timer" muted text.

## Content Area
- Full-height, scrollable.
- Each view is a separate component rendered conditionally based on active route.
- Smooth transitions between views (fade or slide).

## Status Bar (Footer)
- DB sync status: ✅ "All changes saved" or 🔄 "Saving..."
- API key status: 🔑 "API key set" or ⚠️ "Set API key in Settings"
- Current date and time.

## Responsive
- Minimum window size: 900×600.
- Sidebar collapses automatically below 1024px width.
- Content area takes remaining width.

## Dependencies
- Feature 19 (Zustand Stores), Feature 4 (Backlog), Feature 7 (Today), Feature 15 (Plan), Feature 17 (Reports)

## Acceptance Criteria
- [ ] Sidebar navigation switches between all views.
- [ ] Active timer visible in header at all times.
- [ ] Sidebar collapsible.
- [ ] Status bar shows sync/key status.
- [ ] Keyboard shortcuts work for navigation.
- [ ] Layout adapts to minimum window size.
