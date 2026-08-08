# Zustand Stores

## Overview
All renderer state is managed via topic-specific Zustand stores. Stores encapsulate IPC calls and provide reactive state for React components. No state is duplicated between stores — each store owns one domain.

## Store Architecture

```
useTaskStore        → tasks, filters, CRUD actions
useTimerStore       → activeTimer, elapsed, start/pause actions
usePlanStore        → currentPlan, isGenerating, review state, approve/regenerate
useReportStore      → reports, selectedReport, generate/delete actions
useSettingsStore    → apiKeyStatus, theme, focusHours, preferences
useUIStore          → sidebar state, active view, modals, toasts
```

## Store Design Rules
- One store per domain — no cross-domain state in stores.
- Store actions call `window.api` IPC methods, never direct DB access.
- Derived state computed in selectors/`useMemo`, not stored in state.
- Actions are async (return promises) — loading/error state tracked.
- Use `immer` middleware if needed for nested state updates (optional).

## useTaskStore

```ts
interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: IpcError | null;
  filter: { status?: TaskStatus; priority?: Priority; search?: string };

  fetchTasks: () => Promise<void>;
  createTask: (data: Omit<Task, 'id'>) => Promise<Task | null>;
  updateTask: (data: Partial<Task> & { id: string }) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  setFilter: (filter: Partial<TaskStore['filter']>) => void;
}
```

## useTimerStore

```ts
interface TimerStore {
  activeTaskId: string | null;
  elapsedSeconds: number;
  isRunning: boolean;

  startTimer: (taskId: string) => Promise<void>;
  pauseTimer: () => Promise<void>;
  syncTimer: () => Promise<void>;       // restore on app startup
  subscribeToTicks: () => () => void;   // cleanup function
}
```

## usePlanStore

```ts
interface PlanStore {
  plan: DailyPlan | null;
  isGenerating: boolean;
  isReviewing: boolean;
  error: IpcError | null;

  generatePlan: (input: AIScheduleInput) => Promise<void>;
  updateTaskBudget: (taskId: string, minutes: number) => void;
  reorderTask: (fromIndex: number, toIndex: number) => void;
  removeTaskFromPlan: (taskId: string) => void;
  approvePlan: () => Promise<boolean>;
  regenerate: () => Promise<void>;
  clearPlan: () => void;
}
```

## useReportStore

```ts
interface ReportStore {
  reports: PerformanceReportCache[];
  selectedReport: PerformanceReportCache | null;
  isGenerating: boolean;
  error: IpcError | null;

  generateReport: (timeframeDays: number) => Promise<void>;
  fetchReports: () => Promise<void>;
  selectReport: (id: string) => void;
  deleteReport: (id: string) => Promise<void>;
}
```

## useSettingsStore

```ts
interface SettingsStore {
  isApiKeySet: boolean;
  theme: 'light' | 'dark' | 'system';
  focusHours: number;
  isCheckingKey: boolean;

  checkApiKey: () => Promise<void>;
  setApiKey: (key: string) => Promise<boolean>;
  deleteApiKey: () => Promise<void>;
  setTheme: (theme: SettingsStore['theme']) => void;
  setFocusHours: (hours: number) => void;
}
```

## Dependencies
- Feature 2 (IPC Bridge), Feature 4 (Backlog CRUD), Feature 11 (Timer), Feature 15 (Planning), Feature 17 (Reports)

## Acceptance Criteria
- [ ] Each store owns one domain without overlap.
- [ ] All IPC calls go through store actions.
- [ ] Loading/error states surfaced to components.
- [ ] Timer store syncs on app startup.
- [ ] Plan store handles review + edit workflow.
- [ ] Report store loads history on mount.
- [ ] No raw `window.api` calls in component JSX.
