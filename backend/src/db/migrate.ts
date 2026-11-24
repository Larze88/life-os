import fs from 'node:fs';
import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { Logger } from 'pino';
import type { DbHandle } from './client.ts';
import { createSnapshot } from './snapshot.ts';

interface Journal {
  entries: { idx: number; tag: string }[];
}

function countMigrationFiles(migrationsDir: string): number {
  const journalFile = path.join(migrationsDir, 'meta', '_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalFile, 'utf8')) as Journal;
  return journal.entries.length;
}

function countAppliedMigrations(handle: DbHandle): number {
  const table = handle.sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'",
    )
    .get();
  if (!table) return 0;
  const row = handle.sqlite.prepare('SELECT COUNT(*) AS n FROM __drizzle_migrations').get() as {
    n: number;
  };
  return row.n;
}

export interface MigrationResult {
  applied: number;
  snapshotFile: string | undefined;
}

/**
 * Applies pending migrations. If the database already contains data, a snapshot is
 * taken first so a failed or faulty migration can be rolled back by hand.
 */
export async function runMigrations(
  handle: DbHandle,
  options: { migrationsDir: string; snapshotDir?: string; logger?: Logger },
): Promise<MigrationResult> {
  const total = countMigrationFiles(options.migrationsDir);
  const appliedBefore = countAppliedMigrations(handle);
  const pending = total - appliedBefore;
  if (pending <= 0) return { applied: 0, snapshotFile: undefined };

  let snapshotFile: string | undefined;
  if (appliedBefore > 0 && options.snapshotDir) {
    snapshotFile = await createSnapshot(handle.sqlite, options.snapshotDir, 'pre-migration');
    options.logger?.info({ snapshot: path.basename(snapshotFile) }, 'snapshot before migration');
  }

  migrate(handle.db, { migrationsFolder: options.migrationsDir });
  options.logger?.info({ applied: pending }, 'migrations applied');
  return { applied: pending, snapshotFile };
}
