import initSql from "./001_init.sql?raw";
import recurringConfigSql from "./002_recurring_config.sql?raw";
import taskCompletedAtSql from "./003_task_completed_at.sql?raw";

export interface Migration {
  version: number;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  { version: 1, sql: initSql },
  { version: 2, sql: recurringConfigSql },
  { version: 3, sql: taskCompletedAtSql },
];
