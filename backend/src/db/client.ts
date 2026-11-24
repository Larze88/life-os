import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.ts';

export type Db = BetterSQLite3Database<typeof schema>;

export interface DbHandle {
  sqlite: Database.Database;
  db: Db;
  close(): void;
}

/**
 * Opens the SQLite database with settings tuned for a microSD card
 * (docs/FEASIBILITY.md §3): WAL for concurrent reads, synchronous=FULL for durability
 * on power loss (write volume is tiny), foreign keys on.
 */
export function openDatabase(file: string): DbHandle {
  const sqlite = new Database(file);
  if (file !== ':memory:') sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = FULL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  const db = drizzle(sqlite, { schema });
  return {
    sqlite,
    db,
    close() {
      if (sqlite.open) {
        if (file !== ':memory:') sqlite.pragma('wal_checkpoint(TRUNCATE)');
        sqlite.close();
      }
    },
  };
}
