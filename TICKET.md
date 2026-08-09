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
  - Tests: `src/main/db/__tests__/` (empty — tests pending).
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

### TKT-004: Implement Task Backlog CRUD 🟡 In Progress

**As a** user, **I want to** create, read, update, and delete tasks in my backlog **so that** I can track things I need to do.

- **Status**: **Backend complete** — `src/main/db/task-repository.ts` with full CRUD + validation (title 1-200 chars, priority enum, estimatedMinutes 1-1440, description ≤100k). IPC handlers registered for `tasks:getAll`, `tasks:create`, `tasks:update`, `tasks:delete`. **UI missing** — no task form, no list component, no delete confirmation, no inline editing. Only hard delete (no soft delete).
- **Acceptance Criteria**:
  - ~~UI allows creating tasks with title, priority (low/medium/high), and estimated minutes.~~ _(pending renderer)_
  - ~~Tasks are saved to SQLite and default to `todo` status.~~ _(done)_
  - ~~User can edit inline and soft/hard delete with confirmation.~~ _(pending UI)_
  - ~~Backend validation ensures titles are 1-200 chars and estimated minutes < 1440.~~ _(done)_
- **Remaining**: Renderer components for task form, task list, edit/delete UI, drag-to-Today interaction.

### TKT-005: Integrate Rich Markdown Notes for Tasks ❌ Not Started

**As a** user, **I want to** add rich formatting (lists, links, code) to my task descriptions **so that** I have necessary context when starting work.

- **Status**: No implementation. `@tiptap/*` packages (react, starter-kit, task-item, task-list, code-block) are already in `package.json` but unused.
- **Acceptance Criteria**:
  - TipTap editor integrated for task descriptions.
  - Markdown input is parsed and saved properly.

### TKT-006: Build Task Status Workflow UI ❌ Not Started

**As a** user, **I want to** move tasks through distinct states (Todo → In Progress → Done) **so that** I can track my active execution.

- **Status**: No implementation. ⚠ **Note**: Backend `updateTask` does **not** guard illegal state transitions despite `STATE_TRANSITION_ILLEGAL` error code being defined in `src/shared/ipcResult.ts`. This guard must be added server-side.
- **Acceptance Criteria**:
  - Tasks can transition statuses.
  - Invalid transitions (e.g., Done -> In Progress) are blocked or handled cleanly.

### TKT-007: Develop the "Today" View ❌ Not Started

**As a** user, **I want to** view a focused list of tasks selected for today **so that** I am not distracted by the full backlog.

- **Status**: No renderer views exist (`src/renderer/src/App.tsx` is a static placeholder).
- **Acceptance Criteria**:
  - Dashboard shows tasks with date assigned = today.
  - Supports drag/drop or click-to-move from backlog to Today.

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

### TKT-010: Implement Fixed-Time Blocking ❌ Not Started

**As a** user, **I want to** mark specific recurring tasks at fixed times **so that** the AI planner treats them as non-negotiable anchor blocks.

- **Status**: `time_anchor` column in `recurring_rules` table + `timeAnchor` field in `RecurringRule` type exist. No logic uses it.
- **Acceptance Criteria**:
  - Tasks can possess an `anchor_time` field.
  - Planner API rejects scheduling over fixed blocks.

---

## Phase 4: Precision Time Tracking

### TKT-011: Implement Start/Pause Task Timer ❌ Not Started

**As a** user, **I want to** start and pause a timer on my active task **so that** I can track exactly how much time I spend on it.

- **Status**: `timer:start` and `timer:pause` channels are defined in `ipcChannels.ts` + preload, but handlers return `fail("NOT_IMPLEMENTED")`. `task_time_logs` table exists in schema. No timer service, no `timer:tick` event, no `timer:getActive` channel.
- **Acceptance Criteria**:
  - "In Progress" triggers a background-safe timer.
  - Minimizing or closing the app does not cause drift (uses absolute timestamps).

### TKT-012: Calculate Actual Task Duration ❌ Not Started

**As a** user, **I want** the system to aggregate my start/pause intervals **so that** I get an accurate total time spent when completing a task.

- **Status**: No logic computing durations from `task_time_logs` intervals. No `time-log-repository`.
- **Acceptance Criteria**:
  - `task_time_logs` table records intervals.
  - Total duration is computed accurately upon task completion.

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

### TKT-019: Setup Zustand Stores ❌ Not Started

**As a** developer, **I want to** manage frontend state with Zustand **so that** UI components stay perfectly in sync without deep prop drilling.

- **Status**: `zustand` ^5.0.3 is in `package.json` dependencies but unused. No stores exist (no `create()`/`useStore` anywhere in `src/`).
- **Acceptance Criteria**:
  - Stores created for Tasks, Timer, and User Settings.

### TKT-020: Build Main Dashboard Layout ❌ Not Started

**As a** user, **I want to** see my Today tasks, active timer, and backlog in a unified shell **so that** I can easily navigate my workflow.

- **Status**: `src/renderer/src/App.tsx` is a static placeholder ("AI Task Planner / Environment Ready"). No layout components.
- **Acceptance Criteria**:
  - Dashboard shell with Today panel, backlog panel, and timer display.

### TKT-021: Theme System & Iconography ❌ Not Started

**As a** user, **I want to** toggle between light and dark themes with distinct iconography **so that** the app is comfortable to use in any lighting.

- **Status**: `lucide-react` is in `package.json` but unused. `DESIGN.md` defines color tokens and typography. No CSS variables, no theme toggle, `main.css` has only Tailwind directives.
- **Acceptance Criteria**:
  - Dual-theme system with light/dark toggle.
  - Lucide React icons used throughout UI.

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
