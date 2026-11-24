import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { asc, eq, isNull, sql } from 'drizzle-orm';
import type { BackupStatus } from '@lifeos/shared';
import type { Logger } from 'pino';
import { openDatabase, type DbHandle } from '../db/client.ts';
import { countMigrationFiles, runMigrations } from '../db/migrate.ts';
import { entries, settings } from '../db/schema.ts';
import { createSnapshot } from '../db/snapshot.ts';
import { HttpProblem, problems } from '../lib/problem.ts';

const LAST_DOWNLOAD_KEY = 'last_backup_download_at';
const SQLITE_HEADER = 'SQLite format 3\0';

/**
 * Tables restored from a backup, parents first. Sessions are deliberately not restored:
 * the device performing the restore stays signed in, all others sign in again.
 */
const RESTORE_TABLES = [
  'settings',
  'auth_credentials',
  'trackers',
  'goals',
  'entries',
  'dashboard_widgets',
] as const;

function tempFile(name: string): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-')), name);
}

function removeTemp(file: string): void {
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
}

/** Consistent snapshot of the live database as bytes (ADR-013 download). */
export async function exportDatabase(handle: DbHandle, now: Date = new Date()): Promise<Buffer> {
  const file = tempFile('export.db');
  try {
    await handle.sqlite.backup(file);
    const bytes = fs.readFileSync(file);
    handle.db
      .insert(settings)
      .values({ key: LAST_DOWNLOAD_KEY, value: now.toISOString() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: now.toISOString(), updatedAt: now.toISOString() },
      })
      .run();
    return bytes;
  } finally {
    removeTemp(file);
  }
}

export function getBackupStatus(handle: DbHandle): BackupStatus {
  const last = handle.db.select().from(settings).where(eq(settings.key, LAST_DOWNLOAD_KEY)).get();
  const first = handle.db
    .select({ occurredAt: entries.occurredAt })
    .from(entries)
    .where(isNull(entries.deletedAt))
    .orderBy(asc(entries.occurredAt))
    .get();
  return {
    lastDownloadAt: typeof last?.value === 'string' ? last.value : null,
    firstEntryAt: first?.occurredAt ?? null,
  };
}

/**
 * Replaces all data with the content of an uploaded backup.
 * The upload is validated and migrated to the current schema in a temporary copy,
 * a snapshot of the current state is taken, then the data is copied in one transaction.
 */
export async function restoreDatabase(
  handle: DbHandle,
  bytes: Uint8Array,
  options: { migrationsDir: string; snapshotDir: string; logger: Logger },
): Promise<void> {
  if (
    bytes.byteLength < 512 ||
    Buffer.from(bytes.subarray(0, 16)).toString('latin1') !== SQLITE_HEADER
  ) {
    throw problems.badRequest('Die Datei ist kein Life-OS-Backup.');
  }

  const file = tempFile('restore.db');
  fs.writeFileSync(file, bytes);
  try {
    // 1. Validate the upload in isolation.
    let upload: DbHandle;
    try {
      const probe = new Database(file, { readonly: true });
      const check = probe.pragma('quick_check', { simple: true });
      const tables = new Set(
        (
          probe.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
            name: string;
          }[]
        ).map((r) => r.name),
      );
      const applied = tables.has('__drizzle_migrations')
        ? (probe.prepare('SELECT COUNT(*) AS n FROM __drizzle_migrations').get() as { n: number }).n
        : 0;
      probe.close();
      if (check !== 'ok' || !tables.has('entries') || !tables.has('trackers')) {
        throw problems.badRequest('Die Datei ist kein gültiges Life-OS-Backup.');
      }
      if (applied > countMigrationFiles(options.migrationsDir)) {
        throw problems.badRequest(
          'Das Backup stammt aus einer neueren Life-OS-Version. Bitte zuerst aktualisieren.',
        );
      }
      upload = openDatabase(file);
    } catch (err) {
      if (err instanceof HttpProblem) throw err;
      throw problems.badRequest('Die Datei ist kein gültiges Life-OS-Backup.');
    }

    // 2. Bring the upload to the current schema.
    try {
      await runMigrations(upload, { migrationsDir: options.migrationsDir });
    } finally {
      upload.close();
    }

    // 3. Keep the current state, then swap the data atomically.
    const snapshot = await createSnapshot(handle.sqlite, options.snapshotDir, 'pre-restore');
    const { sqlite } = handle;
    sqlite.prepare('ATTACH DATABASE ? AS restore_src').run(file);
    try {
      sqlite.transaction(() => {
        for (const table of [...RESTORE_TABLES].reverse())
          sqlite.prepare(`DELETE FROM main.${table}`).run();
        for (const table of RESTORE_TABLES) {
          sqlite.prepare(`INSERT INTO main.${table} SELECT * FROM restore_src.${table}`).run();
        }
      })();
    } finally {
      sqlite.prepare('DETACH DATABASE restore_src').run();
    }
    const count =
      handle.db
        .select({ n: sql<number>`count(*)` })
        .from(entries)
        .get()?.n ?? 0;
    options.logger.info({ snapshot: path.basename(snapshot), entries: count }, 'backup restored');
  } finally {
    removeTemp(file);
  }
}
