import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config.ts';
import { openDatabase } from './client.ts';
import { runMigrations } from './migrate.ts';

const migrationsDir = loadConfig({ NODE_ENV: 'test' }).migrationsDir;

function tableNames(handle: ReturnType<typeof openDatabase>): string[] {
  return (
    handle.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as {
      name: string;
    }[]
  ).map((r) => r.name);
}

describe('migrations', () => {
  it('create the full schema on an empty database', async () => {
    const handle = openDatabase(':memory:');
    const result = await runMigrations(handle, { migrationsDir });
    expect(result.applied).toBeGreaterThan(0);
    expect(tableNames(handle)).toEqual(
      expect.arrayContaining([
        'settings',
        'auth_credentials',
        'sessions',
        'trackers',
        'entries',
        'goals',
        'dashboard_widgets',
      ]),
    );
    handle.close();
  });

  it('are idempotent', async () => {
    const handle = openDatabase(':memory:');
    await runMigrations(handle, { migrationsDir });
    expect((await runMigrations(handle, { migrationsDir })).applied).toBe(0);
    handle.close();
  });

  it('enable foreign keys and WAL on file databases', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-db-'));
    const handle = openDatabase(path.join(dir, 'test.db'));
    expect(handle.sqlite.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(handle.sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
    handle.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('upgrade an existing database with data from the previous schema version', async () => {
    // Build a migrations folder that only contains the first migration (= version 0.5.0 schema).
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-migr-'));
    const oldDir = path.join(dir, 'old');
    fs.mkdirSync(path.join(oldDir, 'meta'), { recursive: true });
    const journal = JSON.parse(
      fs.readFileSync(path.join(migrationsDir, 'meta', '_journal.json'), 'utf8'),
    ) as {
      entries: { tag: string }[];
    };
    const first = journal.entries[0]!;
    fs.copyFileSync(
      path.join(migrationsDir, `${first.tag}.sql`),
      path.join(oldDir, `${first.tag}.sql`),
    );
    fs.writeFileSync(
      path.join(oldDir, 'meta', '_journal.json'),
      JSON.stringify({ ...journal, entries: [first] }),
    );

    const file = path.join(dir, 'lifeos.db');
    const handle = openDatabase(file);
    await runMigrations(handle, { migrationsDir: oldDir });
    handle.sqlite
      .prepare(
        "INSERT INTO trackers (id, key, module, name) VALUES ('t1', 'water', 'water', 'Wasser')",
      )
      .run();
    handle.sqlite
      .prepare(
        "INSERT INTO dashboard_widgets (id, widget_type, tracker_id, position) VALUES ('w1', 'water.progress', 't1', 0)",
      )
      .run();

    // Now the current release starts: pending migrations are applied after a snapshot.
    const result = await runMigrations(handle, {
      migrationsDir,
      snapshotDir: path.join(dir, 'backups'),
    });
    expect(result.applied).toBe(journal.entries.length - 1);
    expect(result.snapshotFile).toBeDefined();
    const row = handle.sqlite
      .prepare("SELECT id, hidden FROM dashboard_widgets WHERE id = 'w1'")
      .get() as {
      id: string;
      hidden: number;
    };
    expect(row).toEqual({ id: 'w1', hidden: 0 });
    handle.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
