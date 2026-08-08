# SQLite Database & Migrations

## Overview
Initialize the local SQLite database used by the Electron Main Process for all persistent data storage. Define the schema for all domain entities and implement a numbered migration runner that applies sequentially on app startup.

## Requirements
- Use `sql.js` (pure WASM SQLite) in the Main Process.
- Enable WAL mode (`PRAGMA journal_mode = WAL;`) for fast concurrent reads.
- Store the database file in the OS-appropriate app data directory.
- Timestamps stored as Unix epoch milliseconds (`Date.now()`).
- Durations stored in integer minutes.
- Never execute raw concatenated SQL; use prepared statements only.

## Schema Tables

### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | Markdown notes |
| `priority` | TEXT NOT NULL | `low` / `medium` / `high` |
| `status` | TEXT NOT NULL | `todo` / `in_progress` / `completed` |
| `estimated_minutes` | INTEGER NOT NULL | |
| `actual_minutes` | INTEGER | Populated on completion |
| `is_recurring_child` | INTEGER DEFAULT 0 | `0` or `1` |
| `recurring_rule_id` | TEXT FK | References `recurring_rules.id` |
| `scheduled_date` | INTEGER | Epoch ms for today view |
| `created_at` | INTEGER NOT NULL | |
| `updated_at` | INTEGER NOT NULL | |

### `task_time_logs`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `task_id` | TEXT FK NOT NULL | |
| `started_at` | INTEGER NOT NULL | Epoch ms |
| `paused_at` | INTEGER | Epoch ms, NULL if still running |
| `duration_minutes` | INTEGER | Calculated on pause/stop |

### `recurring_rules`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | Markdown notes |
| `priority` | TEXT NOT NULL | |
| `estimated_minutes` | INTEGER NOT NULL | |
| `frequency` | TEXT NOT NULL | `daily` / `weekly` / `monthly` |
| `time_anchor` | INTEGER | Epoch ms of fixed time (e.g., 20:00) |
| `is_active` | INTEGER DEFAULT 1 | |
| `last_instantiated_date` | INTEGER | |
| `created_at` | INTEGER NOT NULL | |

### `daily_plans`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `date` | INTEGER NOT NULL | Epoch ms of plan date |
| `focus_hours` | REAL | User's available hours |
| `primary_goal` | TEXT | |
| `plan_json` | TEXT NOT NULL | AI-generated plan JSON |
| `is_approved` | INTEGER DEFAULT 0 | |
| `created_at` | INTEGER NOT NULL | |

### `performance_reports`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `timeframe_start` | INTEGER NOT NULL | |
| `timeframe_end` | INTEGER NOT NULL | |
| `report_json` | TEXT NOT NULL | AI-generated report JSON |
| `prompt_version` | TEXT NOT NULL | |
| `created_at` | INTEGER NOT NULL | |

## Migration Runner
- Migrations located in `src/main/db/migrations/` as numbered SQL files (`001_init.sql`, `002_add_column.sql`, ...).
- On startup, check a `schema_version` table for the last applied migration.
- Apply any unapplied migrations in order inside a transaction.

## Error Handling
- Database open failure: throw clear error, prevent app from loading data-dependent views.
- Migration failure: roll back transaction, log error, alert user to restore backup.

## Dependencies
- Feature 2 (IPC Bridge), Feature 3 (safeStorage)

## Acceptance Criteria
- [ ] App starts and creates database file on first run.
- [ ] All tables exist and match schema.
- [ ] Migrations run sequentially and are idempotent.
- [ ] WAL mode enabled.
- [ ] Prepared statements used exclusively.
