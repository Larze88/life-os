import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type DbHandle } from '../db/client.ts';
import { runMigrations } from '../db/migrate.ts';
import { loadConfig } from '../config.ts';
import { SESSION_TTL_MS, SessionStore, deviceLabelFromUserAgent } from './session-store.ts';

describe('SessionStore', () => {
  let handle: DbHandle;
  let now: Date;
  let store: SessionStore;

  beforeEach(async () => {
    handle = openDatabase(':memory:');
    await runMigrations(handle, { migrationsDir: loadConfig({ NODE_ENV: 'test' }).migrationsDir });
    now = new Date('2026-11-24T10:00:00Z');
    store = new SessionStore(handle.db, () => now);
  });
  afterEach(() => handle.close());

  it('stores only a hash of the token', () => {
    const { token, session } = store.create(null);
    expect(session.id).not.toContain(token);
    expect(session.id).toMatch(/^[0-9a-f]{64}$/);
    expect(store.validate(token)?.id).toBe(session.id);
    expect(store.validate('unknown')).toBeNull();
    expect(store.validate(undefined)).toBeNull();
  });

  it('extends the expiry when used (sliding) but writes at most hourly', () => {
    const { token, session } = store.create(null);
    now = new Date(now.getTime() + 30 * 60 * 1000);
    expect(store.validate(token)?.expiresAt).toBe(session.expiresAt);
    now = new Date(now.getTime() + 60 * 60 * 1000);
    expect(store.validate(token)?.expiresAt).toBe(
      new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    );
  });

  it('expires and removes old sessions', () => {
    const { token } = store.create(null);
    now = new Date(now.getTime() + SESSION_TTL_MS + 1);
    expect(store.validate(token)).toBeNull();
    expect(store.list()).toHaveLength(0);
  });

  it('purges expired sessions', () => {
    store.create(null);
    now = new Date(now.getTime() + SESSION_TTL_MS + 1);
    expect(store.purgeExpired()).toBe(1);
  });
});

describe('deviceLabelFromUserAgent', () => {
  it('derives a coarse label', () => {
    expect(
      deviceLabelFromUserAgent(
        'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36',
      ),
    ).toBe('Android · Chrome');
    expect(deviceLabelFromUserAgent(undefined)).toBeNull();
  });
});
