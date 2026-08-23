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

- **Spec**: [`01-sqlite-database-migrations.md`](./spec/01-sqlite-database-migrations.md)

**As a** system, **I want to** initialize a local SQLite database with an automated migration engine **so that** the app can store local-first data reliably.

- **Status**: `src/main/db/database.ts`, `src/main/db/migration-runner.ts`, `src/main/db/migrations/001_init.sql` — WAL mode enabled, all 6 tables (`tasks`, `task_time_logs`, `recurring_rules`, `daily_plans`, `performance_reports`, `schema_version`) created on startup.
- **Acceptance Criteria**:
  - `better-sqlite3` is integrated in the Electron main process.
  - WAL mode is enabled.
  - Migration files are applied automatically on startup.
  - Tests: `src/main/db/__tests__/recurring-rule-repository.test.ts`, `src/main/db/__tests__/task-repository-description.test.ts`.
- **INVEST Check**: Independent (foundation), Valuable (enables all data), Small (just setup + migrations), Testable (can assert tables exist).

### TKT-002: Establish Type-Safe IPC Bridge ✅ Done

- **Spec**: [`02-ipc-bridge-protocol.md`](./spec/02-ipc-bridge-protocol.md)

**As a** developer, **I want to** communicate between the main and renderer processes using a strongly typed IPC bridge **so that** data exchange is secure and predictable.

- **Status**: `src/shared/ipcChannels.ts` (typed `IpcChannelMap`), `src/shared/ipcResult.ts` (standardized `IpcResult`), `src/preload/index.ts` (contextBridge), `src/main/ipc/register-ipc.ts`, `src/main/ipc/handlers.ts`. No `any` types in IPC payloads.
- **Acceptance Criteria**:
  - `contextBridge` exposes a typed `window.api`.
  - Standardized `IpcResult` object is used for success/error handling.
  - No `any` types in IPC payloads.
- **Tests**: `src/main/ipc/__tests__/handlers.test.ts`, `src/shared/__tests__/ipcResult.test.ts`.
- **INVEST Check**: Small and Testable (can mock calls).

### TKT-003: Configure safeStorage Keychain for API Keys ✅ Done

- **Spec**: [`03-safestorage-keychain.md`](./spec/03-safestorage-keychain.md)

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

- **Spec**: [`04-backlog-crud.md`](./spec/04-backlog-crud.md)

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

- **Spec**: [`05-rich-markdown-notes.md`](./spec/05-rich-markdown-notes.md)

**As a** user, **I want to** add rich formatting (lists, links, code) to my task descriptions **so that** I have necessary context when starting work.

- **Status**: Complete — `src/renderer/src/components/MarkdownEditor.tsx` (TipTap wrapper with toolbar: bold, italic, strikethrough, H1-H3, bullet/ordered/task lists, blockquote, code block, link), `src/renderer/src/components/TaskForm.tsx` (auto-save 1.5s debounce, save indicator, preview toggle, unsaved-changes warning). `@tailwindcss/typography` configured for preview rendering. Backend enforces 100k char limit. Extensions: `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-code-block`, `@tiptap/extension-link`.
- **Acceptance Criteria**:
  - TipTap editor integrated for task descriptions.
  - Markdown input is parsed and saved properly.
- **Remaining (edge cases, not blocking):** Image paste handling, virtualized scrolling for very long content, Markdown serializer (currently stores as HTML).

### TKT-006: Build Task Status Workflow UI ✅ Done

- **Spec**: [`06-task-status-workflow.md`](./spec/06-task-status-workflow.md)

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

- **Spec**: [`07-today-view.md`](./spec/07-today-view.md)

**As a** user, **I want to** view a focused list of tasks selected for today **so that** I am not distracted by the full backlog.

- **Status**: Complete — `src/renderer/src/components/TodayView.tsx` (full Today view with anchored/flexible/completed task groups, collapsible completed section, lock icon + time label for anchored tasks, drag-and-drop excluded for anchored tasks). Wired into `src/renderer/src/components/AppShell.tsx` as the `today` route.
- **Acceptance Criteria**:
  - ✅ Dashboard shows tasks with `scheduled_date` = today.
  - ✅ Click-to-move from backlog to Today (via `TaskItem` "Move to Today" action).
  - Drag/drop cross-view interaction deferred (tasks move via button action).

---

## Phase 3: Recurring Tasks

### TKT-008: Define Recurring Task Templates ✅ Done

- **Spec**: [`08-recurring-rule-definitions.md`](./spec/08-recurring-rule-definitions.md)

**As a** user, **I want to** create task templates that repeat on a schedule (e.g., daily at 8 PM) **so that** I don't have to recreate habits manually.

- **Status**: `src/main/db/recurring-rule-repository.ts` (full CRUD + toggle + validation), `src/main/ipc/handlers.ts` (5 recurring handlers), `src/main/ipc/__tests__/handlers.test.ts` (9 test cases), `src/renderer/src/stores/recurringRuleStore.ts` (Zustand store), `src/renderer/src/components/RecurringRuleForm.tsx` (create/edit form with frequency, days, time anchor), `src/renderer/src/components/RecurringRuleCard.tsx` (card with toggle/edit/delete), `src/renderer/src/components/RecurringRulesPanel.tsx` (list panel with empty state), `src/renderer/src/components/SettingsView.tsx` (integrated panel), `src/renderer/src/components/DeleteConfirmationDialog.tsx` (updated for rule deletion wording).
- **Acceptance Criteria**:
  - UI to define a rule (CRON or daily/weekly selection).
  - Templates are saved separately from active tasks.
- **INVEST Check**: Independent (standalone CRUD), Valuable (avoids manual recreation), Small (backlog CRUD pattern reused).

### TKT-009: Build Daily Instantiation Engine ✅ Done

- **Spec**: [`09-daily-instantiation-engine.md`](./spec/09-daily-instantiation-engine.md)

**As a** system, **I want to** automatically instantiate today's recurring tasks on startup or date-rollover **so that** the user's daily habits are ready to go.

- **Status**: `src/main/services/recurring-engine.ts` (background service with `instantiateDailyTasks`, `getStartOfDay`, `matchesTodayFrequency`), `src/main/index.ts` (hooks engine on startup + 60s midnight-check interval), `src/main/db/task-repository.ts` (added `createRecurringChildTask` for rule→task instantiation), `src/main/services/__tests__/recurring-engine.test.ts` (11 tests: daily/weekly/monthly creation, dedup, inactive skip, time anchor, multi-rule count).
- **Acceptance Criteria**:
  - Background check runs on app launch or at midnight.
  - Active recurring rules generate standard Tasks in the "Today" view.
- **INVEST Check**: Independent (standalone service, depends on existing repos), Valuable (automatic task generation), Small (single service + hook).

### TKT-010: Implement Fixed-Time Blocking ✅ Done

- **Spec**: [`10-fixed-time-blocking.md`](./spec/10-fixed-time-blocking.md)

**As a** user, **I want to** mark specific recurring tasks at fixed times **so that** the AI planner treats them as non-negotiable anchor blocks.

- **Status**: `src/shared/models.ts` (expanded `AIScheduleInput` with `fixedBlocks` field), `src/main/db/recurring-rule-repository.ts` (duplicate `timeAnchor` validation on create/update), `src/renderer/src/components/TodayView.tsx` (lock icon + time label on anchored tasks, anchored tasks excluded from drag-and-drop), `src/main/db/__tests__/recurring-rule-repository.test.ts` (2 new duplicate time anchor tests).
- **Acceptance Criteria**:
  - Tasks can possess an `anchor_time` field.
  - Planner API rejects scheduling over fixed blocks.
- **INVEST Check**: Independent (validation + UI guardrails), Valuable (prevents schedule conflicts), Small (targeted changes to existing components).

---

## Phase 4: Precision Time Tracking

### TKT-011: Implement Start/Pause Task Timer ✅ Done

- **Spec**: [`11-start-pause-timer.md`](./spec/11-start-pause-timer.md)

**As a** user, **I want to** start and pause a timer on my active task **so that** I can track exactly how much time I spend on it.

- **Status**: Complete — `src/main/db/time-log-repository.ts` (time log CRUD + duration calculations), `src/main/services/timer-service.ts` (background-safe 1s tick loop, recovery on startup, auto-pausing previous task timer, cleanup on app quit), `src/shared/ipcChannels.ts` (`timer:start`, `timer:pause`, `timer:getActive`), `src/preload/index.ts` (`onTimerTick` subscription bridge), `src/renderer/src/stores/timerStore.ts` (Zustand store), `src/renderer/src/components/Header.tsx` (live active timer readout with pulsing indicator and pause control).
- **Acceptance Criteria**:
  - ✅ "In Progress" triggers a background-safe timer.
  - ✅ Minimizing or closing the app does not cause drift (uses absolute timestamps).
  - ✅ Live tick updates rendered in Header UI bar.
  - ✅ Only one task timer active at a time (starting another auto-pauses previous).
- **Tests**: `src/main/db/__tests__/time-log-repository.test.ts`, `src/main/services/__tests__/timer-service.test.ts`, `src/main/ipc/__tests__/handlers.test.ts`.

### TKT-012: Calculate Actual Task Duration ✅ Done

- **Spec**: [`12-actual-duration-calculation.md`](./spec/12-actual-duration-calculation.md)

**As a** user, **I want** the system to aggregate my start/pause intervals **so that** I get an accurate total time spent when completing a task.

- **Status**: Complete — `src/main/db/time-log-repository.ts` (`pauseTimeLog` calculates interval duration and aggregates total minutes onto `tasks.actual_minutes`).
- **Acceptance Criteria**:
  - ✅ `task_time_logs` table records intervals.
  - ✅ Total duration is computed accurately and persisted to `tasks.actual_minutes`.

### TKT-013: Calculate & Store Variance Metrics ✅ Done

- **Spec**: [`13-variance-metrics.md`](./spec/13-variance-metrics.md)

**As a** system, **I want to** compute the difference between estimated and actual time **so that** the AI can adjust my future scheduling.

- **Status**: Complete — `src/main/db/migrations/003_task_completed_at.sql` (`completed_at` column, set on →`completed` transition), `src/main/db/task-repository.ts` (`getCompletedTasks(timeframe?)`), `src/main/services/variance-service.ts` (`getTaskVariance`, `getVarianceMetrics`, `formatVarianceContext`), `src/shared/models.ts` (`TaskVariance`, `VarianceBucket`, `VarianceMetrics`, `TaskType`, `AIScheduleInput.historicalVariance`), `src/shared/ipcChannels.ts` (`metrics:getVariance`, `metrics:getTaskVariance`), `src/preload/index.ts` + `src/shared/api.ts` (exposed `getVarianceMetrics`/`getTaskVariance`), `src/main/ipc/handlers.ts` (handlers + timer finalize on completion), `src/renderer/src/components/VarianceBadge.tsx` (Δ badge on completed task cards).
- **Acceptance Criteria**:
  - ✅ Variance (Δ = Actual − Estimated) computed on-demand for completed tasks (per-task + aggregate by priority and task type).
  - ✅ Data made available to the AI via `metrics:getVariance` / `metrics:getTaskVariance` query endpoints, plus `formatVarianceContext` prompt snippet for TKT-015.
  - ✅ Δ badge displayed on completed task cards (red `+Xm` underestimated / green `−Xm` overestimated).
  - ✅ `tasks:update` finalizes any unclosed timer on completion so `actual_minutes` is complete before Δ is derived.
- **Tests**: `src/main/services/__tests__/variance-service.test.ts`, `src/main/ipc/__tests__/handlers.test.ts` (metrics handlers), `src/renderer/src/components/__tests__/VarianceBadge.test.tsx`.
- **Deferred (per spec dependencies)**: Trend chart + accuracy gauge → report dashboard (TKT-017/TKT-025); actual prompt assembly → TKT-015.

---

## Phase 5: AI Integration

### TKT-014: Integrate DeepSeek API Client ✅ Done

- **Spec**: [`14-deepseek-api-client.md`](./spec/14-deepseek-api-client.md)

**As a** system, **I want to** connect to the DeepSeek API with retries and timeouts **so that** AI features can be requested reliably.

- **Status**: Complete — `src/main/services/deepseekService.ts` (single client module: `openai` with `baseURL` + `deepseek-chat`, `response_format: json_object`, keychain-loaded API key at call time, 30s timeout, 3-retry exponential backoff with `Retry-After` support, `AI_*` error codes, `validateDailyPlan`/`validatePerformanceReport` response validation, `testConnection`), `src/main/services/prompts/` (versioned `plan-v1.txt`/`report-v1.txt` + `fillTemplate`), `src/shared/models.ts` (`DailyPlanRequest`, `ReportParams`, `PerformanceReportContent`, `DailyPlanSchedule`).
- **Acceptance Criteria**:
  - ✅ API key loaded from keychain, never logged.
  - ✅ 30s timeout enforced.
  - ✅ Retry with exponential backoff (max 3) on 50x/network errors.
  - ✅ Responses validated against expected schema.
  - ✅ Structured error codes returned to renderer.
  - ✅ `ai:testConnection` handler exposed; UI stays responsive (async IPC).
- **Tests**: `src/main/services/__tests__/deepseek-service.test.ts`.

### TKT-015: Build Daily AI Planning (Morning Standup) ✅ Done

- **Spec**: [`15-daily-planning.md`](./spec/15-daily-planning.md)

**As a** user, **I want to** the AI to propose a daily schedule based on my backlog, fixed blocks, and historical variance **so that** I can plan realistically.

- **Status**: Complete — `src/main/services/daily-plan-service.ts` (assembles `DailyPlanRequest` from todo backlog, today's time-anchored fixed blocks, and variance metrics; validates positive `focusHours`), `src/main/ipc/handlers.ts` (`ai:generatePlan` handler + `mapAiError` mapping `AI_*`/`VALIDATION_ERROR` → `IpcErrorCode`), `src/shared/ipcChannels.ts` (`ai:generatePlan` response → `DailyPlanSchedule`), `src/main/services/deepseekService.ts` (feeds `formatVarianceContext` into the plan prompt), `src/main/services/prompts/plan-v1.txt` (`{{historicalVarianceContext}}` placeholder).
- **Acceptance Criteria**:
  - ✅ Prompt gathers active backlog, daily hours limit, and variance data.
  - ✅ AI returns a structured JSON payload of proposed tasks and timeboxes (`DailyPlanSchedule`).
  - ✅ Fixed blocks partitioned separately (no overlap / no double-counting) and excluded from flexible backlog.
  - ✅ No API key / AI failures surface structured error codes (e.g. `AI_AUTH_FAILED`) to the renderer.
- **Tests**: `src/main/services/__tests__/daily-plan-service.test.ts`, `src/main/ipc/__tests__/handlers.test.ts`.
- **Deferred (per spec dependencies)**: Plan review UI, approval, and `daily_plans` persistence → TKT-016.

### TKT-016: UI for Plan Review & Approval ✅ Done

- **Spec**: [`16-plan-review-approval.md`](./spec/16-plan-review-approval.md)

**As a** user, **I want to** review and modify the AI's proposed schedule before it applies **so that** I retain final control over my day.

- **Status**: Complete — `src/main/db/daily-plan-repository.ts` (`getPlanForDate` / `saveApprovedPlan` upsert into `daily_plans`), `src/main/services/plan-approval-service.ts` (atomic `approvePlan`: schedules flexible tasks to today, leaves fixed blocks untouched, persists `plan_json` with `is_approved: 1`, full rollback on missing/unavailable task), `src/shared/ipcChannels.ts` (`plan:getToday`, `plan:approve`), `src/main/ipc/handlers.ts` (2 plan handlers), `src/preload/index.ts` + `src/shared/api.ts` (`getTodayPlan`/`approvePlan`), `src/renderer/src/stores/planStore.ts` (Zustand: generate/review/update-budget/reorder/remove/approve/discard), `src/renderer/src/components/PlanView.tsx` (generate form + review timeline with drag-to-reorder), `src/renderer/src/components/PlanBlockRow.tsx` (inline budget edit + remove), `src/renderer/src/components/ApprovePlanDialog.tsx` (focus-trapped confirmation), wired into `AppShell.tsx` (`plan` route) + `Sidebar.tsx` (`plan` enabled).
- **Acceptance Criteria**:
  - User can accept, reject, or adjust the proposed plan (approve/discard/regenerate + inline budget edits + reorder + remove).
  - Accepted plan applies tasks to the Today view (flexible tasks get `scheduled_date = start-of-day` → Today's Flexible group; fixed blocks already anchored).
  - Plan persisted atomically to `daily_plans` with `is_approved: true`; missing/unavailable tasks cause full rollback.
  - Confirmation dialog before approval ("This will schedule X tasks for today"), plus warning when a plan is already approved for today.
  - Post-approval redirects to Today view.
- **Decisions**: `budgetedMinutes` is stored only in `plan_json` (original `estimated_minutes` preserved for variance metrics); reorder affects stored schedule order only.
- **Tests**: `src/main/db/__tests__/daily-plan-repository.test.ts`, `src/main/services/__tests__/plan-approval-service.test.ts`, `src/main/ipc/__tests__/handlers.test.ts` (plan handlers).

### TKT-017: Generate AI Performance Reports ✅ Done

- **Spec**: [`17-performance-report-generation.md`](./spec/17-performance-report-generation.md)

**As a** user, **I want** the AI to analyze my completed tasks over a timeframe **so that** I can receive coaching on my estimation accuracy.

- **Status**: `src/main/services/report-service.ts` (orchestration: validates timeframe, gathers `getCompletedTasks` + `getVarianceMetrics`, empty-state fallback, calls `deepseekService.generatePerformanceReport`), `src/main/ipc/handlers.ts` (`ai:generateReport` handler + `mapAiError`), `src/shared/ipcChannels.ts` (`ai:generateReport` request `{timeframeStart, timeframeEnd}` → response `PerformanceReportContent`), `src/shared/api.ts` + `src/preload/index.ts` (updated `generateReport` signature), `src/renderer/src/stores/reportStore.ts` (Zustand store: preset/custom timeframe resolution + generate), `src/renderer/src/components/ReportsView.tsx` (timeframe selector 7/14/30/custom, efficiency gauge, metric cards, priority variance bars, patterns + advice + summary sections, copy-to-clipboard, empty state), wired into `AppShell.tsx` + `Sidebar.tsx` (`reports` enabled).
- **Acceptance Criteria**:
  - ✅ Gathers tasks in timeframe (completed tasks + variance metrics).
  - ✅ AI returns structured insights on under/over-estimation patterns (`PerformanceReportContent`: metrics, patterns, advice, summary).
  - ✅ 7/14/30-day presets + custom date range.
  - ✅ Metrics/patterns/advice displayed; copy-to-clipboard export.
  - ✅ Empty state handled gracefully (no-data fallback without an AI call).
- **Tests**: `src/main/services/__tests__/report-service.test.ts`, `src/main/ipc/__tests__/handlers.test.ts` (report cases), `src/renderer/src/stores/__tests__/reportStore.test.ts`.
- **Deferred**: `performance_reports` caching + history browsing → TKT-018 (spec 18/25).

### TKT-018: Implement AI Report Caching ✅ Done

- **Spec**: [`18-report-caching.md`](./spec/18-report-caching.md)

**As a** system, **I want to** cache performance reports locally **so that** I minimize unnecessary/costly API calls for historical data.

- **Status**: Complete — `src/main/db/performance-report-repository.ts` (`saveReport` upsert by `(timeframe_start, timeframe_end)` + `getById`/`listAll`/`deleteById`/`findByTimeframe`), `src/main/services/report-service.ts` (persists AI-generated reports tagged with `REPORT_PROMPT_VERSION`; adds `listReports`/`getCachedReport`/`deleteReport` with corrupted-entry skipping), `src/shared/models.ts` (`PerformanceReportSummary`), `src/shared/ipcChannels.ts` (`report:list`/`report:get`/`report:delete`), `src/main/ipc/handlers.ts` (3 report handlers incl. `REPORT_CORRUPTED` mapping), `src/preload/index.ts` + `src/shared/api.ts` (`listReports`/`getReport`/`deleteReport`), `src/renderer/src/stores/reportStore.ts` (history state + `loadReports`/`viewReport`/`deleteReport`; reload after generate), `src/renderer/src/components/ReportHistory.tsx` (history list with view/delete + empty state), `src/renderer/src/components/ReportsView.tsx` (history panel, cached-report banner + back, replace-on-duplicate confirm), `src/renderer/src/components/DeleteConfirmationDialog.tsx` (`report` item type).
- **Acceptance Criteria**:
  - ✅ Generated reports are stored in SQLite with timestamp and prompt version (`performance_reports` table already existed; `saveReport` tags `prompt_version = REPORT_PROMPT_VERSION`).
  - ✅ Same-timeframe duplicate prompts user action (replace-on-duplicate confirm before regenerating; upsert keeps one-report-per-timeframe).
  - ✅ Report history view lists all cached reports, newest first, showing timeframe, score, task count, and generated date.
  - ✅ Click-to-view loads the full cached report; delete removes the entry with confirmation.
  - ✅ Corrupted entries are skipped on list (with a warning) and surface `REPORT_CORRUPTED` on view.
- **Decisions**: Only AI-generated reports are cached (empty "no data" fallback stays ephemeral); empty fallback is not persisted.
- **Tests**: `src/main/db/__tests__/performance-report-repository.test.ts`, `src/main/services/__tests__/report-service.test.ts` (persistence/list/get/delete/corruption), `src/main/ipc/__tests__/handlers.test.ts` (report handlers), `src/renderer/src/stores/__tests__/reportStore.test.ts` (history actions).

---

## Phase 6 & 7: UI Polish, State, and Packaging

### TKT-019: Setup Zustand Stores ✅ Done

- **Spec**: [`19-zustand-stores.md`](./spec/19-zustand-stores.md)

**As a** developer, **I want to** manage frontend state with Zustand **so that** UI components stay perfectly in sync without deep prop drilling.

- **Status**: Complete — `src/renderer/src/stores/taskStore.ts` (task CRUD + filters), `src/renderer/src/stores/recurringRuleStore.ts` (recurring rule CRUD + toggle), `src/renderer/src/stores/timerStore.ts` (timer state + tick subscriptions), `src/renderer/src/stores/settingsStore.ts` (API key status + save/delete/test), `src/renderer/src/stores/themeStore.ts` (theme preference + toggle, via TKT-021).
- **Acceptance Criteria**:
  - ✅ Task store created and in use.
  - ✅ Recurring rule store created and in use.
  - ✅ Timer store created and in use.
  - ✅ User Settings store (API key status via TKT-025; theme preference via TKT-021).

### TKT-020: Build Main Dashboard Layout ✅ Done

- **Spec**: [`20-dashboard-ui.md`](./spec/20-dashboard-ui.md)

**As a** user, **I want to** see my Today tasks, active timer, and backlog in a unified shell **so that** I can easily navigate my workflow.

- **Status**: Complete — `src/renderer/src/components/AppShell.tsx` (full-screen layout shell with keyboard navigation Ctrl+1/2), `src/renderer/src/components/Sidebar.tsx` (collapsible nav with Backlog/Today/Daily Plan/Reports/Settings, Lucide icons, disabled state for unimplemented views), `src/renderer/src/components/Header.tsx` (app header + active-timer pill with Pause), `src/renderer/src/components/StatusFooter.tsx` (live clock, API key status indicator, save status). `App.tsx` delegates to `<AppShell />`.
- **Acceptance Criteria**:
  - ✅ Dashboard shell with sidebar navigation.
  - ✅ Backlog and Today panels wired.
  - ✅ Active timer display (Header timer pill, via TKT-011).

### TKT-021: Theme System & Iconography ✅ Done

- **Specs**: [`22-dark-light-theme.md`](./spec/22-dark-light-theme.md), [`23-icon-system.md`](./spec/23-icon-system.md)

**As a** user, **I want to** toggle between light and dark themes with distinct iconography **so that** the app is comfortable to use in any lighting.

- **Status**: Complete — `src/renderer/src/assets/main.css` (dark-first theme tokens: `:root` = dark, `.light` = light), `src/renderer/src/stores/themeStore.ts` (`useThemeStore` with `theme`/`toggleTheme`/`setTheme`, `initTheme()` for pre-render flash-free application, localStorage persistence under `app.theme`), `src/renderer/src/main.tsx` (calls `initTheme()` before render), `src/renderer/src/components/Header.tsx` (Sun/Moon toggle button with `Tooltip`, toggles `.light` class on `<html>`). Lucide React icons used throughout the UI.
- **Acceptance Criteria**:
  - ✅ Dual-theme CSS token system (dark `:root` default + `.light` overrides).
  - ✅ Lucide React icons used throughout UI.
  - ✅ Theme toggle button in the Header switches light/dark at runtime.
  - ✅ Preference persisted (localStorage) and restored on startup.
- **Tests**: `src/renderer/src/stores/__tests__/themeStore.test.ts` (5 cases: default dark, toggle→light applies class + persists, toggle→dark removes class, setTheme persists/applies, initTheme reads persisted value).

### TKT-022: Offline Resilience & Error Handling ✅ Done

- **Specs**: [`24-offline-resilience.md`](./spec/24-offline-resilience.md), [`26-error-handling-reconnection.md`](./spec/26-error-handling-reconnection.md)

**As a** user, **I want** my task lists and timers to work flawlessly offline **so that** only AI-specific features are disabled when my internet drops.

- **Status**: Complete — `src/renderer/src/stores/networkStore.ts` (`useNetworkStore` with debounced 1s `isOnline` via `navigator.onLine` + `online`/`offline` listeners, idempotent `initNetwork()`), `src/renderer/src/components/AppShell.tsx` (calls `initNetwork()`), `src/renderer/src/components/StatusFooter.tsx` (offline indicator: ⚠️ "Offline — AI features unavailable"), `src/renderer/src/components/PlanView.tsx` (Generate/Regenerate disabled offline + "Requires internet connection." note), `src/renderer/src/components/ReportsView.tsx` (Generate disabled offline + note), `src/renderer/src/components/ApiKeySettings.tsx` (Test Connection disabled offline).
- **Acceptance Criteria**:
  - ✅ Non-AI features require 0 network calls (SQLite local; only DeepSeek calls hit network).
  - ✅ Clear UI indicator when AI is unreachable (footer warning + disabled AI buttons with inline messaging).
- **Deferred (broader spec-26 items, not in this ticket's AC)**: global toast notification system + React error boundary — **now implemented**: `src/renderer/src/components/ErrorBoundary.tsx` (class-based boundary wrapping `<AppShell/>`, reload fallback, sanitized logging), `src/renderer/src/stores/toastStore.ts` + `src/renderer/src/components/ToastContainer.tsx` (global toast system wired into `AppShell`; `PlanView` refactored to use it).
- **Tests**: `src/renderer/src/stores/__tests__/networkStore.test.ts` (4 cases: default online, offline debounce, reconnection, rapid-transition debounce), `src/renderer/src/components/__tests__/ErrorBoundary.test.tsx` (2 cases), `src/renderer/src/stores/__tests__/toastStore.test.ts` (3 cases).

### TKT-023: Electron App Packaging ✅ Done

- **Spec**: [`27-electron-packaging.md`](./spec/27-electron-packaging.md)

**As a** user, **I want to** download a standalone executable **so that** I can install the app easily on my machine.

- **Status**: Complete — `electron-builder.json5` configured (win/nsis, mac/dmg, linux/AppImage+deb). `npm run build` produces all three bundles (`out/main/index.js`, `out/preload/index.js`, `out/renderer/`). `npm run package` (added script: `npm run build && electron-builder`) produces `dist/AI Task Planner Setup 1.0.0.exe` (NSIS) + `dist/win-unpacked/`. Set `win.signAndEditExecutable: false` (no signing cert/icon configured; avoids the `winCodeSign` symlink extraction that requires Windows Developer Mode).
- **Acceptance Criteria**:
  - ✅ `electron-builder` configured.
  - ✅ Renderer build pipeline produces output (verified via `npm run build`).
  - ✅ Produces distributable installers (verified via `npm run package` → `dist/*.exe`).
- **Notes**: Non-blocking: default Electron icon used (no `icon` configured). Windows code signing requires a certificate (`CSC_LINK`) once available. **Gotcha**: `npm run package` rebuilds `better-sqlite3` for Electron's Node ABI; run `npm rebuild better-sqlite3` afterward to restore the system-Node build before running `npm test`.

### TKT-024: Add Hover Tooltips to Icon Buttons ✅ Done

- **Spec**: [`23-icon-system.md`](./spec/23-icon-system.md)

**As a** user, **I want to** see a text label when hovering over icon-only buttons **so that** I understand what each action does without trial-and-error.

- **Status**: Complete — `src/renderer/src/components/ui/Tooltip.tsx` (reusable CSS-only tooltip component: hover + keyboard-focus via `group-focus-within`, configurable `side`, theme tokens only). Wired into icon-only buttons: `TaskItem` (Save, Cancel, Return-to-backlog, Move-to-today, Change-status, Edit, Delete), `DeleteConfirmationDialog` (Close), `RecurringRuleCard` (Toggle, Edit, Delete), `RecurringRulesPanel` (Refresh), `Header` (Pause timer), `TaskForm`/`RecurringRuleForm` (Close). Redundant native `title` attributes removed in favor of the styled tooltip.
- **Acceptance Criteria**:
  - ✅ Hovering any icon button shows a short text label describing the action.
  - ✅ Tooltip text matches existing `aria-label` values.
  - ✅ Works in both light and dark themes (uses `bg-bg-elevated` / `text-text-primary` / `border-border` theme tokens).
- **Notes**: Sidebar nav items retain native `title` tooltips (wrapping would clip against the shell's `overflow-hidden` container; no toggle button exists in the current icon-only sidebar).
- **Tests**: `src/renderer/src/components/__tests__/Tooltip.test.tsx` (4 cases: renders children, tooltip role + label, default top position, custom side).
- **INVEST Check**: Independent (standalone component), Valuable (improves discoverability), Small (~30 min, simple component + wiring).

### TKT-025: Settings — API Key Management ✅ Done

- **Spec**: [`21-settings-page.md`](./spec/21-settings-page.md)

**As a** user, **I want to** configure and validate my DeepSeek API key from Settings **so that** AI features work without manual console commands.

- **Status**: Complete — `src/renderer/src/stores/settingsStore.ts` (Zustand: `hasKey`, `loadStatus`, `saveKey`, `deleteKey`, `testConnection`, `clearError`), `src/renderer/src/components/ApiKeySettings.tsx` (masked password input + Save / Test Connection / Delete, status badge, error banner), `src/renderer/src/components/DeleteConfirmationDialog.tsx` (added `itemType="key"` wording), `src/renderer/src/components/SettingsView.tsx` (renders `ApiKeySettings` above recurring rules), `src/renderer/src/components/StatusFooter.tsx` (consumes `settingsStore.hasKey` for a reactive footer indicator).
- **Acceptance Criteria**:
  - ✅ API key saves and encrypts via safeStorage (`key:set`).
  - ✅ Test Connection validates the key (`ai:testConnection`; boolean result, frontend-only).
  - ✅ Delete key removes from keychain (`key:delete`) with confirmation.
  - ❌ Default focus hours, theme, report timeframe preferences (future tickets).
  - ❌ Data export / clear-all (future tickets).
- **Tests**: `src/renderer/src/stores/__tests__/settingsStore.test.ts`, `src/renderer/src/components/__tests__/ApiKeySettings.test.tsx`.
