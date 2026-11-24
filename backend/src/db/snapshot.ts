import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';

/**
 * Writes a consistent copy of the live database via SQLite's online backup API.
 * Never copy the database file directly while the server is running.
 */
export async function createSnapshot(
  sqlite: Database.Database,
  dir: string,
  label: string,
  now: Date = new Date(),
): Promise<string> {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `lifeos-${stamp}-${label}.db`);
  await sqlite.backup(file);
  return file;
}
