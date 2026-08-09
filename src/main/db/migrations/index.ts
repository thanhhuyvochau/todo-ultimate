import initSql from "./001_init.sql?raw";

export interface Migration {
  version: number;
  sql: string;
}

export const MIGRATIONS: Migration[] = [{ version: 1, sql: initSql }];
