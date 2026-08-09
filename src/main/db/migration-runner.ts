import type { Database as DatabaseType } from "better-sqlite3";
import { MIGRATIONS, type Migration } from "./migrations";

export function runMigrations(db: DatabaseType): void {
  // Check if schema_version exists
  const tableCheck = db
    .prepare(
      `
    SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'
  `,
    )
    .get();

  let currentVersion = 0;
  if (tableCheck) {
    const row = db
      .prepare(`SELECT MAX(version) as version FROM schema_version`)
      .get() as { version: number } | undefined;
    if (row && row.version) {
      currentVersion = row.version;
    }
  }

  const pendingMigrations = MIGRATIONS.filter(
    (m) => m.version > currentVersion,
  ).sort((a, b) => a.version - b.version);

  if (pendingMigrations.length === 0) {
    return;
  }

  const applyMigration = db.transaction((migration: Migration) => {
    db.exec(migration.sql);
    db.prepare(
      `INSERT INTO schema_version (version, applied_at) VALUES (?, ?)`,
    ).run(migration.version, Date.now());
  });

  for (const migration of pendingMigrations) {
    try {
      applyMigration(migration);
      console.log(`Successfully applied migration ${migration.version}`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration.version}:`, error);
      throw new Error(
        `Database migration failed on version ${migration.version}`,
      ); // Rethrow to prevent app loading data
    }
  }
}
