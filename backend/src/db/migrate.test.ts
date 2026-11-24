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
});
