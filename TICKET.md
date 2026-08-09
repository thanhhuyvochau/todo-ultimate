# AI Task & Performance Planner - INVEST User Stories

Based on the [`spec/`](./spec/) folder and architecture guidelines in [`AGENTS.md`](./AGENTS.md), here is a comprehensive breakdown of the project into Agile tickets following the **INVEST** principle (Independent, Negotiable, Valuable, Estimable, Small, Testable). Each ticket represents a discrete vertical slice of value.

### References

- [`AGENTS.md`](./AGENTS.md) — Architecture rules, code style, IPC standards, AI integration guidelines
- [`TECHNICAL_SPEC.md`](./TECHNICAL_SPEC.md) — Database schemas, TypeScript interfaces, IPC channel specs, AI prompts
- [`DESIGN.md`](./DESIGN.md) — UI design system, theme tokens, iconography, component standards
- [`TECHNICAL_STACK.md`](./TECHNICAL_STACK.md) — Full engineering stack reference
- [`spec/`](./spec/) — 27 detailed feature specification files across 7 phases

### Status Legend

| Icon | Status          | Meaning                                                |
| ---- | --------------- | ------------------------------------------------------ |
| ✅   | **Done**        | Ticket is fully implemented and tested                 |
| 🟡   | **In Progress** | Partially implemented (backend done, UI pending, etc.) |
| ❌   | **Not Started** | No implementation exists                               |

---

## Phase 1: Foundation

### TKT-001: Implement SQLite Database & Migration Engine ✅ Done

**As a** system, **I want to** initialize a local SQLite database with an automated migration engine **so that** the app can store local-first data reliably.

- **Status**: `src/main/db/database.ts`, `src/main/db/migration-runner.ts`, `src/main/db/migrations/001_init.sql` — WAL mode enabled, all 6 tables (`tasks`, `task_time_logs`, `recurring_rules`, `daily_plans`, `performance_reports`, `schema_version`) created on startup.
- **Acceptance Criteria**:
  - `better-sqlite3` is integrated in the Electron main process.
  - WAL mode is enabled.
  - Migration files are applied automatically on startup.
  - Tests: `src/main/db/__tests__/recurring-rule-repository.test.ts`, `src/main/db/__tests__/task-repository-description.test.ts`.
- **INVEST Check**: Independent (foundation), Valuable (enables all data), Small (just setup + migrations), Testable (can assert tables exist).

### TKT-002: Establish Type-Safe IPC Bridge ✅ Done

**As a** developer, **I want to** communicate between the main and renderer processes using a strongly typed IPC bridge **so that** data exchange is secure and predictable.

- **Status**: `src/shared/ipcChannels.ts` (typed `IpcChannelMap`), `src/shared/ipcResult.ts` (standardized `IpcResult`), `src/preload/index.ts` (contextBridge), `src/main/ipc/register-ipc.ts`, `src/main/ipc/handlers.ts`. No `any` types in IPC payloads.
- **Acceptance Criteria**:
  - `contextBridge` exposes a typed `window.api`.
  - Standardized `IpcResult` object is used for success/error handling.
  - No `any` types in IPC payloads.
- **Tests**: `src/main/ipc/__tests__/handlers.test.ts`, `src/shared/__tests__/ipcResult.test.ts`.
- **INVEST Check**: Small and Testable (can mock calls).

### TKT-003: Configure safeStorage Keychain for API Keys ✅ Done

**As a** privacy-conscious user, **I want my** AI API keys encrypted natively **so that** they cannot be read by malicious software.

- **Status**: `src/main/services/keychain-service.ts` — full encrypt/decrypt/delete via Electron `safeStorage`. Keys stored encrypted in `userData/.encrypted-key`. App hard-fails if encryption unavailable.
- **Acceptance Criteria**:
  - Electron's `safeStorage` is utilized to encrypt/decrypt string secrets.
  - API keys are never written to disk in plain text.
  - Clear error surfaces if encryption is unavailable.
- **Tests**: `src/main/services/__tests__/keychain-service.test.ts`.

---

## Phase 2: Task Management

### TKT-004: Implement Task Backlog CRUD ✅ Done

**As a** user, **I want to** create, read, update, and delete tasks in my backlog **so that** I can track things I need to do.

- **Status**: Complete — `src/main/db/task-repository.ts` (full CRUD + validation + `scheduledDate` persistence), `src/main/ipc/handlers.ts` (4 task handlers), `src/renderer/src/stores/taskStore.ts` (Zustand store), `src/renderer/src/components/BacklogView.tsx` (list with search/sort/empty state), `src/renderer/src/components/TaskForm.tsx` (create/edit modal with validation + TipTap description), `src/renderer/src/components/TaskItem.tsx` (card row with inline editing, status menu, move-to-today, checkbox), `src/renderer/src/components/DeleteConfirmationDialog.tsx` (focus-trapped confirmation), `src/renderer/src/components/PriorityBadge.tsx`, `src/renderer/src/components/StatusBadge.tsx`.
- **Acceptance Criteria**:
  - UI allows creating tasks with title, priority (low/medium/high), and estimated minutes.
  - Tasks are saved to SQLite and default to `todo` status.
  - User can edit inline (pencil → inline title/priority/minutes with Save/Cancel) or full edit via modal.
  - Hard delete with confirmation dialog (focus-trapped, Escape-close).
  - Backend validation ensures titles are 1-200 chars and estimated minutes 1-1440.
  - Search matches both title and description.
  - Move-to-Today and Return-to-Backlog persist `scheduled_date`.
  - Checkbox visual placeholder present (functional in Today view).
- **Remaining**: Drag-to-Today cross-view DnD interaction (deferred to TKT-006/007).

### TKT-005: Integrate Rich Markdown Notes for Tasks ✅ Done

**As a** user, **I want to** add rich formatting (lists, links, code) to my task descriptions **so that** I have necessary context when starting work.

- **Status**: Complete — `src/renderer/src/components/MarkdownEditor.tsx` (TipTap wrapper with toolbar: bold, italic, strikethrough, H1-H3, bullet/ordered/task lists, blockquote, code block, link), `src/renderer/src/components/TaskForm.tsx` (auto-save 1.5s debounce, save indicator, preview toggle, unsaved-changes warning). `@tailwindcss/typography` configured for preview rendering. Backend enforces 100k char limit. Extensions: `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-code-block`, `@tiptap/extension-link`.
- **Acceptance Criteria**:
  - TipTap editor integrated for task descriptions.
  - Markdown input is parsed and saved properly.
- **Remaining (edge cases, not blocking):** Image paste handling, virtualized scrolling for very long content, Markdown serializer (currently stores as HTML).

### TKT-006: Build Task Status Workflow UI ✅ Done

**As a** user, **I want to** move tasks through distinct states (Todo → In Progress → Done) **so that** I can track my active execution.

- **Status**: Complete — `src/main/db/task-repository.ts` (`validateStatusTransition`: todo→in_progress, in_progress→todo|completed, completed→blocked; single-active-task guard), `src/main/ipc/handlers.ts` (maps `STATE_TRANSITION_ILLEGAL` + `TASK_ALREADY_ACTIVE`), `src/renderer/src/components/TaskItem.tsx` (`STATUS_ACTIONS` dropdown per state), `src/renderer/src/components/TodayView.tsx` (anchored/flexible/completed groups with collapsible completed section), `src/renderer/src/components/BacklogView.tsx` (completed tasks filtered from backlog, success/error toasts on transitions).
- **Acceptance Criteria**:
  - Tasks can transition statuses with correct allowed/blocked paths.
  - Invalid transitions are blocked with clear error messages.
  - Only one task can be `in_progress` at a time.
  - Completed tasks are filtered from the Backlog.
  - Success/error toasts provide feedback on status changes.
- **Depends on TKT-011/TKT-012 for**: Timer auto-start/pause on transitions, `actual_minutes` calculation on completion.

### TKT-007: Develop the "Today" View ✅ Done

**As a** user, **I want to** view a focused list of tasks selected for today **so that** I am not distracted by the full backlog.

- **Status**: Complete — `src/renderer/src/components/TodayView.tsx` (full Today view with anchored/flexible/completed task groups, collapsible completed section, lock icon + time label for anchored tasks, drag-and-drop excluded for anchored tasks). Wired into `src/renderer/src/components/AppShell.tsx` as the `today` route.
- **Acceptance Criteria**:
  - ✅ Dashboard shows tasks with `scheduled_date` = today.
  - ✅ Click-to-move from backlog to Today (via `TaskItem` "Move to Today" action).
  - Drag/drop cross-view interaction deferred (tasks move via button action).

---

## Phase 3: Recurring Tasks

### TKT-008: Define Recurring Task Templates ✅ Done

**As a** user, **I want to** create task templates that repeat on a schedule (e.g., daily at 8 PM) **so that** I don't have to recreate habits manually.

- **Status**: `src/main/db/recurring-rule-repository.ts` (full CRUD + toggle + validation), `src/main/ipc/handlers.ts` (5 recurring handlers), `src/main/ipc/__tests__/handlers.test.ts` (9 test cases), `src/renderer/src/stores/recurringRuleStore.ts` (Zustand store), `src/renderer/src/components/RecurringRuleForm.tsx` (create/edit form with frequency, days, time anchor), `src/renderer/src/components/RecurringRuleCard.tsx` (card with toggle/edit/delete), `src/renderer/src/components/RecurringRulesPanel.tsx` (list panel with empty state), `src/renderer/src/components/SettingsView.tsx` (integrated panel), `src/renderer/src/components/DeleteConfirmationDialog.tsx` (updated for rule deletion wording).
- **Acceptance Criteria**:
  - UI to define a rule (CRON or daily/weekly selection).
  - Templates are saved separately from active tasks.
- **INVEST Check**: Independent (standalone CRUD), Valuable (avoids manual recreation), Small (backlog CRUD pattern reused).

### TKT-009: Build Daily Instantiation Engine ✅ Done

**As a** system, **I want to** automatically instantiate today's recurring tasks on startup or date-rollover **so that** the user's daily habits are ready to go.

- **Status**: `src/main/services/recurring-engine.ts` (background service with `instantiateDailyTasks`, `getStartOfDay`, `matchesTodayFrequency`), `src/main/index.ts` (hooks engine on startup + 60s midnight-check interval), `src/main/db/task-repository.ts` (added `createRecurringChildTask` for rule→task instantiation), `src/main/services/__tests__/recurring-engine.test.ts` (11 tests: daily/weekly/monthly creation, dedup, inactive skip, time anchor, multi-rule count).
- **Acceptance Criteria**:
  - Background check runs on app launch or at midnight.
  - Active recurring rules generate standard Tasks in the "Today" view.
- **INVEST Check**: Independent (standalone service, depends on existing repos), Valuable (automatic task generation), Small (single service + hook).

### TKT-010: Implement Fixed-Time Blocking ✅ Done

**As a** user, **I want to** mark specific recurring tasks at fixed times **so that** the AI planner treats them as non-negotiable anchor blocks.

- **Status**: `src/shared/models.ts` (expanded `AIScheduleInput` with `fixedBlocks` field), `src/main/db/recurring-rule-repository.ts` (duplicate `timeAnchor` validation on create/update), `src/renderer/src/components/TodayView.tsx` (lock icon + time label on anchored tasks, anchored tasks excluded from drag-and-drop), `src/main/db/__tests__/recurring-rule-repository.test.ts` (2 new duplicate time anchor tests).
- **Acceptance Criteria**:
  - Tasks can possess an `anchor_time` field.
  - Planner API rejects scheduling over fixed blocks.
- **INVEST Check**: Independent (validation + UI guardrails), Valuable (prevents schedule conflicts), Small (targeted changes to existing components).

---

## Phase 4: Precision Time Tracking

### TKT-011: Implement Start/Pause Task Timer ✅ Done

**As a** user, **I want to** start and pause a timer on my active task **so that** I can track exactly how much time I spend on it.

- **Status**: Complete — `src/main/db/time-log-repository.ts` (time log CRUD + duration calculations), `src/main/services/timer-service.ts` (background-safe 1s tick loop, recovery on startup, auto-pausing previous task timer, cleanup on app quit), `src/shared/ipcChannels.ts` (`timer:start`, `timer:pause`, `timer:getActive`), `src/preload/index.ts` (`onTimerTick` subscription bridge), `src/renderer/src/stores/timerStore.ts` (Zustand store), `src/renderer/src/components/Header.tsx` (live active timer readout with pulsing indicator and pause control).
- **Acceptance Criteria**:
  - ✅ "In Progress" triggers a background-safe timer.
  - ✅ Minimizing or closing the app does not cause drift (uses absolute timestamps).
  - ✅ Live tick updates rendered in Header UI bar.
  - ✅ Only one task timer active at a time (starting another auto-pauses previous).
- **Tests**: `src/main/db/__tests__/time-log-repository.test.ts`, `src/main/services/__tests__/timer-service.test.ts`, `src/main/ipc/__tests__/handlers.test.ts`.

### TKT-012: Calculate Actual Task Duration ✅ Done

**As a** user, **I want** the system to aggregate my start/pause intervals **so that** I get an accurate total time spent when completing a task.

- **Status**: Complete — `src/main/db/time-log-repository.ts` (`pauseTimeLog` calculates interval duration and aggregates total minutes onto `tasks.actual_minutes`).
- **Acceptance Criteria**:
  - ✅ `task_time_logs` table records intervals.
  - ✅ Total duration is computed accurately and persisted to `tasks.actual_minutes`.

### TKT-013: Calculate & Store Variance Metrics ❌ Not Started

**As a** system, **I want to** compute the difference between estimated and actual time **so that** the AI can adjust my future scheduling.

- **Status**: `actual_minutes` column exists in `tasks` table. No Δ = Actual − Estimated computation anywhere.
- **Acceptance Criteria**:
  - Variance (Δ = Actual − Estimated) is computed on completion.
  - Data is made available to the AI via query endpoints.

---

## Phase 5: AI Integration

### TKT-014: Integrate DeepSeek API Client ❌ Not Started

**As a** system, **I want to** connect to the DeepSeek API with retries and timeouts **so that** AI features can be requested reliably.

- **Status**: `openai` ^4.83.0 is in `package.json` dependencies. No client module exists. `src/main/services/prompts/` directory not created. No retries/timeouts/response validation code.
- **Acceptance Criteria**:
  - DeepSeek client implemented.
  - Graceful fallback/timeout handling implemented.

### TKT-015: Build Daily AI Planning (Morning Standup) ❌ Not Started

**As a** user, **I want** the AI to propose a daily schedule based on my backlog, fixed blocks, and historical variance **so that** I can plan realistically.

- **Status**: `ai:generatePlan` handler returns `NOT_IMPLEMENTED`. `daily_plans` table + `DailyPlan`/`AIScheduleInput` types exist but unused.
- **Acceptance Criteria**:
  - Prompt gathers active backlog, daily hours limit, and variance data.
  - AI returns a structured JSON payload of proposed tasks and timeboxes.

### TKT-016: UI for Plan Review & Approval ❌ Not Started

**As a** user, **I want to** review and modify the AI's proposed schedule before it applies **so that** I retain final control over my day.

- **Status**: No UI; no plan-approval logic.
- **Acceptance Criteria**:
  - User can accept, reject, or adjust the proposed plan.
  - Accepted plan applies tasks to the Today view.

### TKT-017: Generate AI Performance Reports ❌ Not Started

**As a** user, **I want** the AI to analyze my completed tasks over a timeframe **so that** I can receive coaching on my estimation accuracy.

- **Status**: `ai:generateReport` handler returns `NOT_IMPLEMENTED`. `performance_reports` table + `PerformanceReport` type exist but unused.
- **Acceptance Criteria**:
  - Gathers tasks in timeframe.
  - AI returns structured insights on under/over-estimation patterns.

### TKT-018: Implement AI Report Caching ❌ Not Started

**As a** system, **I want to** cache performance reports locally **so that** I minimize unnecessary/costly API calls for historical data.

- **Status**: No cache logic; no report repository.
- **Acceptance Criteria**:
  - Generated reports are stored in SQLite with timestamp and prompt version.

---

## Phase 6 & 7: UI Polish, State, and Packaging

### TKT-019: Setup Zustand Stores 🟡 In Progress

**As a** developer, **I want to** manage frontend state with Zustand **so that** UI components stay perfectly in sync without deep prop drilling.

- **Status**: Partially complete — `src/renderer/src/stores/taskStore.ts` (task CRUD + filters), `src/renderer/src/stores/recurringRuleStore.ts` (recurring rule CRUD + toggle), `src/renderer/src/stores/timerStore.ts` (timer state + tick subscriptions). No user-settings store yet.
- **Acceptance Criteria**:
  - ✅ Task store created and in use.
  - ✅ Recurring rule store created and in use.
  - ✅ Timer store created and in use.
  - ❌ User Settings store (theme preference, API key status).

### TKT-020: Build Main Dashboard Layout ✅ Done

**As a** user, **I want to** see my Today tasks, active timer, and backlog in a unified shell **so that** I can easily navigate my workflow.

- **Status**: Complete — `src/renderer/src/components/AppShell.tsx` (full-screen layout shell with keyboard navigation Ctrl+1/2), `src/renderer/src/components/Sidebar.tsx` (collapsible nav with Backlog/Today/Daily Plan/Reports/Settings, Lucide icons, disabled state for unimplemented views), `src/renderer/src/components/Header.tsx` (app header), `src/renderer/src/components/StatusFooter.tsx` (live clock, API key status indicator, save status). `App.tsx` delegates to `<AppShell />`.
- **Acceptance Criteria**:
  - ✅ Dashboard shell with sidebar navigation.
  - ✅ Backlog and Today panels wired.
  - ❌ Active timer display (depends on TKT-011).
- **Remaining**: Timer widget in shell header/footer (blocked by TKT-011).

### TKT-021: Theme System & Iconography 🟡 In Progress

**As a** user, **I want to** toggle between light and dark themes with distinct iconography **so that** the app is comfortable to use in any lighting.

- **Status**: Partially complete — `src/renderer/src/assets/main.css` defines full dual-theme CSS custom properties (`:root` light theme + `.dark` dark theme with all color tokens mapped via `tailwind.config.js`). Lucide React icons used throughout: `Sidebar.tsx` (Inbox, Calendar, Lightbulb, BarChart3, Settings), `StatusFooter.tsx` (CheckCircle2, Key, KeyRound, Clock), `TaskItem.tsx`, `RecurringRuleCard.tsx`, etc. **No theme toggle UI** — the `.dark` class is never applied at runtime; app runs in light mode only.
- **Acceptance Criteria**:
  - ✅ Dual-theme CSS token system (light/dark variables).
  - ✅ Lucide React icons used throughout UI.
  - ❌ Theme toggle button to switch between light and dark at runtime.
- **Remaining**: Add a theme toggle (button in `Header` or `SettingsView`), persist preference, apply `.dark` class to `<html>` or `<body>`.

### TKT-022: Offline Resilience & Error Handling ❌ Not Started

**As a** user, **I want** my task lists and timers to work flawlessly offline **so that** only AI-specific features are disabled when my internet drops.

- **Status**: No offline indicator, no AI-unreachable UI, no reconnection logic.
- **Acceptance Criteria**:
  - Non-AI features require 0 network calls.
  - Clear UI indicator when AI is unreachable.

### TKT-023: Electron App Packaging 🟡 In Progress

**As a** user, **I want to** download a standalone executable **so that** I can install the app easily on my machine.

- **Status**: `electron-builder.json5` is configured (win/nsis, mac/dmg, linux/AppImage+deb). `out/` directory contains compiled main + preload but **no renderer bundle**. App cannot run in production mode.
- **Acceptance Criteria**:
  - ~~`electron-builder` configured.~~ _(done)_
  - ~~Builds output executable files for Windows/Mac/Linux.~~ _(pending — renderer build not producing output)_
- **Remaining**: Fix renderer build pipeline; produce distributable artifacts.

### TKT-024: Add Hover Tooltips to Icon Buttons ❌ Not Started

**As a** user, **I want to** see a text label when hovering over icon-only buttons **so that** I understand what each action does without trial-and-error.

- **Status**: All 16 icon-only buttons already have `aria-label` attributes for screen readers, but no visible hover tooltip exists. Buttons without tooltips: `TaskItem` (Save, Cancel, Return-to-backlog, Move-to-today, Status-change, Edit, Delete), `DeleteConfirmationDialog` (Close), `RecurringRuleCard` (Toggle, Edit, Delete), `RecurringRulesPanel` (Refresh), `Sidebar` (Toggle), `TaskForm`/`RecurringRuleForm` (Close).
- **Acceptance Criteria**:
  - Hovering any icon button shows a short text label describing the action.
  - Tooltip text matches existing `aria-label` values.
  - Works in both light and dark themes.
- **INVEST Check**: Independent (standalone component), Valuable (improves discoverability), Small (~30 min, simple component + wiring).
