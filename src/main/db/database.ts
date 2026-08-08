import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { runMigrations } from './migration-runner';

let dbInstance: DatabaseType | null = null;

export function initDb(): DatabaseType {
  if (dbInstance) {
    return dbInstance;
  }

  const userDataPath = app.getPath('userData');
  const dbPath = join(userDataPath, 'ai-task-planner.sqlite');

  try {
    dbInstance = new Database(dbPath);
    console.log('AFTER DB');
    
    // Enable WAL mode for better concurrency (per requirements)
    // dbInstance.pragma('journal_mode = WAL');
    
    // Run migrations
    // runMigrations(dbInstance);
    
    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export function getDb(): DatabaseType {
  if (!dbInstance) {
    throw new Error('Database has not been initialized. Call initDb first.');
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
