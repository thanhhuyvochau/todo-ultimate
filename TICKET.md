# AI Task & Performance Planner - INVEST User Stories

Based on the `spec/` folder, here is a comprehensive breakdown of the project into Agile tickets following the **INVEST** principle (Independent, Negotiable, Valuable, Estimable, Small, Testable). Each ticket represents a discrete vertical slice of value.

## Phase 1: Foundation

### TKT-001: Implement SQLite Database & Migration Engine
**As a** system, **I want to** initialize a local SQLite database with an automated migration engine **so that** the app can store local-first data reliably.
* **Acceptance Criteria**:
  * `better-sqlite3` is integrated in the Electron main process.
  * WAL mode is enabled.
  * Migration files (e.g., `001-initial-schema.sql`) are applied automatically on startup.
* **INVEST Check**: Independent (foundation), Valuable (enables all data), Small (just setup + migrations), Testable (can assert tables exist).

### TKT-002: Establish Type-Safe IPC Bridge
**As a** developer, **I want to** communicate between the main and renderer processes using a strongly typed IPC bridge **so that** data exchange is secure and predictable.
* **Acceptance Criteria**:
  * `contextBridge` exposes a typed `window.api`.
  * Standardized `IpcResult` object is used for success/error handling.
  * No `any` types in IPC payloads.
* **INVEST Check**: Small and Testable (can mock calls). 

### TKT-003: Configure safeStorage Keychain for API Keys
**As a** privacy-conscious user, **I want my** AI API keys encrypted natively **so that** they cannot be read by malicious software.
* **Acceptance Criteria**:
  * Electron's `safeStorage` is utilized to encrypt/decrypt string secrets.
  * API keys are never written to disk in plain text.
  * Clear error surfaces if encryption is unavailable.

---

## Phase 2: Task Management

### TKT-004: Implement Task Backlog CRUD
**As a** user, **I want to** create, read, update, and delete tasks in my backlog **so that** I can track things I need to do.
* **Acceptance Criteria**:
  * UI allows creating tasks with title, priority (low/medium/high), and estimated minutes.
  * Tasks are saved to SQLite and default to `todo` status.
  * User can edit inline and soft/hard delete with confirmation.
  * Backend validation ensures titles are 1-200 chars and estimated minutes < 1440.

### TKT-005: Integrate Rich Markdown Notes for Tasks
**As a** user, **I want to** add rich formatting (lists, links, code) to my task descriptions **so that** I have necessary context when starting work.
* **Acceptance Criteria**:
  * TipTap editor integrated for task descriptions.
  * Markdown input is parsed and saved properly.

### TKT-006: Build Task Status Workflow UI
**As a** user, **I want to** move tasks through distinct states (Todo → In Progress → Done) **so that** I can track my active execution.
* **Acceptance Criteria**:
  * Tasks can transition statuses.
  * Invalid transitions (e.g., Done -> In Progress) are blocked or handled cleanly.

### TKT-007: Develop the "Today" View
**As a** user, **I want to** view a focused list of tasks selected for today **so that** I am not distracted by the full backlog.
* **Acceptance Criteria**:
  * Dashboard shows tasks with date assigned = today.
  * Supports drag/drop or click-to-move from backlog to Today.

---

## Phase 3: Recurring Tasks

### TKT-008: Define Recurring Task Templates
**As a** user, **I want to** create task templates that repeat on a schedule (e.g., daily at 8 PM) **so that** I don't have to recreate habits manually.
* **Acceptance Criteria**:
  * UI to define a rule (CRON or daily/weekly selection).
  * Templates are saved separately from active tasks.

### TKT-009: Build Daily Instantiation Engine
**As a** system, **I want to** automatically instantiate today's recurring tasks on startup or date-rollover **so that** the user's daily habits are ready to go.
* **Acceptance Criteria**:
  * Background check runs on app launch or at midnight.
  * Active recurring rules generate standard Tasks in the "Today" view.

### TKT-010: Implement Fixed-Time Blocking
**As a** user, **I want to** mark specific recurring tasks at fixed times **so that** the AI planner treats them as non-negotiable anchor blocks.
* **Acceptance Criteria**:
  * Tasks can possess an `anchor_time` field.
  * Planner API rejects scheduling over fixed blocks.

---

## Phase 4: Precision Time Tracking

### TKT-011: Implement Start/Pause Task Timer
**As a** user, **I want to** start and pause a timer on my active task **so that** I can track exactly how much time I spend on it.
* **Acceptance Criteria**:
  * "In Progress" triggers a background-safe timer.
  * Minimizing or closing the app does not cause drift (uses absolute timestamps).

### TKT-012: Calculate Actual Task Duration
**As a** user, **I want** the system to aggregate my start/pause intervals **so that** I get an accurate total time spent when completing a task.
* **Acceptance Criteria**:
  * `task_time_logs` table records intervals.
  * Total duration is computed accurately upon task completion.

### TKT-013: Calculate & Store Variance Metrics
**As a** system, **I want to** compute the difference between estimated and actual time **so that** the AI can adjust my future scheduling.
* **Acceptance Criteria**:
  * Variance (Δ = Actual − Estimated) is computed on completion.
  * Data is made available to the AI via query endpoints.

---

## Phase 5: AI Integration

### TKT-014: Integrate DeepSeek API Client
**As a** system, **I want to** connect to the DeepSeek API with retries and timeouts **so that** AI features can be requested reliably.
* **Acceptance Criteria**:
  * DeepSeek client implemented.
  * Graceful fallback/timeout handling implemented.

### TKT-015: Build Daily AI Planning (Morning Standup)
**As a** user, **I want** the AI to propose a daily schedule based on my backlog, fixed blocks, and historical variance **so that** I can plan realistically.
* **Acceptance Criteria**:
  * Prompt gathers active backlog, daily hours limit, and variance data.
  * AI returns a structured JSON payload of proposed tasks and timeboxes.

### TKT-016: UI for Plan Review & Approval
**As a** user, **I want to** review and modify the AI's proposed schedule before it applies **so that** I retain final control over my day.
* **Acceptance Criteria**:
  * User can accept, reject, or adjust the proposed plan.
  * Accepted plan applies tasks to the Today view.

### TKT-017: Generate AI Performance Reports
**As a** user, **I want** the AI to analyze my completed tasks over a timeframe **so that** I can receive coaching on my estimation accuracy.
* **Acceptance Criteria**:
  * Gathers tasks in timeframe.
  * AI returns structured insights on under/over-estimation patterns.

### TKT-018: Implement AI Report Caching
**As a** system, **I want to** cache performance reports locally **so that** I minimize unnecessary/costly API calls for historical data.
* **Acceptance Criteria**:
  * Generated reports are stored in SQLite with timestamp and prompt version.

---

## Phase 6 & 7: UI Polish, State, and Packaging

### TKT-019: Setup Zustand Stores
**As a** developer, **I want to** manage frontend state with Zustand **so that** UI components stay perfectly in sync without deep prop drilling.
* **Acceptance Criteria**:
  * Stores created for Tasks, Timer, and User Settings.

### TKT-020: Build Main Dashboard Layout
**As a** user, **I want to** see my Today tasks, active timer, and backlog in a unified shell **so that** I can easily navigate my workflow.

### TKT-021: Theme System & Iconography
**As a** user, **I want to** toggle between light and dark themes with distinct iconography **so that** the app is comfortable to use in any lighting.

### TKT-022: Offline Resilience & Error Handling
**As a** user, **I want** my task lists and timers to work flawlessly offline **so that** only AI-specific features are disabled when my internet drops.
* **Acceptance Criteria**:
  * Non-AI features require 0 network calls.
  * Clear UI indicator when AI is unreachable.

### TKT-023: Electron App Packaging
**As a** user, **I want to** download a standalone executable **so that** I can install the app easily on my machine.
* **Acceptance Criteria**:
  * `electron-builder` configured.
  * Builds output executable files for Windows/Mac/Linux.
