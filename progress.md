# Progress

## Current Goal

Describe the current project goal here.

## Agent Rules

- Do not ask questions unless truly blocked.
- Make reasonable assumptions and continue.
- Work on unfinished TODOs in order.
- Mark completed TODOs with [x].
- Add new bugs, ideas, and follow-up work as TODOs.
- Run tests, lint, or build when available.
- Do not run destructive commands, force pushes, production deploys, or database resets.

## Active TODO

- [ ] (none — awaiting next ticket selection)

## Completed

- [x] Created progress.md.
- [x] TKT-024: Add hover tooltips to icon-only buttons (`ui/Tooltip.tsx` + wiring + tests).
- [x] TKT-021: Add runtime theme toggle (`themeStore.ts` + Header Sun/Moon toggle + `initTheme()` + tests). Also removed stale `class="dark"` from `index.html`.
- [x] TKT-022: Offline resilience (`networkStore.ts` debounced network detection + footer indicator + AI buttons disabled offline + tests).
- [x] TKT-023 (partial): verified `npm run build` produces renderer bundle; added missing `package` script.
- [x] Test suite now fully green (251 passing): fixed `keychain-service.test.ts` (fs mock missing `default` export), `recurring-engine.test.ts` (wrong relative import paths + inactive-rule creation via `toggleActive`), and a real bug in `timer-service.ts` (auto-pausing a previous timer now resets that task's status to `todo`, satisfying the single-active-task guard).
- [x] Error handling (spec 26): React error boundary (`ErrorBoundary.tsx` wrapping `<AppShell/>`) + global toast system (`toastStore.ts` + `ToastContainer.tsx`; `PlanView` refactored to use it).
- [x] Fixed broken `typecheck` script (was a no-op: root `tsconfig.json` has `include: []`). Now runs `tsc -p tsconfig.node.json && tsc -p tsconfig.web.json`. Added missing `@shared/*` path alias (tsconfig + electron-vite + vitest) and fixed all surfaced type errors: `handlers` uses `satisfies HandlerMap` (preserves sync/async return types), `object`-request handlers accept `_request`, `RecurringRuleForm` description null, `task-repository-description.test.ts` full input.
- [x] Narrowed `createTask` input type (`CreateTaskInput` in `models.ts`) — DB `task-repository.ts`, IPC `tasks:create` request, and renderer `taskStore` now use the accurate 4-field input (removed redundant status/actualMinutes/createdAt payload).
- [x] Narrowed `createRule` input type (`CreateRuleInput` in `models.ts`) — DB `recurring-rule-repository.ts`, IPC `recurring:create` request, and renderer `recurringRuleStore` now use the accurate input (removed redundant isActive/lastInstantiatedDate/createdAt payload).
- [x] TKT-023: Packaging works — `npm run package` produces `dist/AI Task Planner Setup 1.0.0.exe` (NSIS) + `dist/win-unpacked/`. Set `win.signAndEditExecutable: false` to avoid `winCodeSign` symlink extraction (Windows Developer Mode requirement). Removed dead `Play` import in `Header.tsx`.
- [x] Doc cleanup: fixed stale ticket statuses (TKT-019 header → Done; TKT-020 timer display → implemented; TKT-021 dead-code note removed), added `author` to `package.json`.

## Backlog Ideas

- [ ] Add app `icon` to packaging (electron-builder uses default Electron icon); wire Windows code signing (`CSC_LINK`) when a certificate is available.
- [ ] Consider `electron-builder install-app-deps` in `postinstall` vs `electron-rebuild` (note: `npm run package` rebuilds `better-sqlite3` for Electron ABI; `npm rebuild better-sqlite3` restores system-Node build for tests).

## Blocked

- None.
