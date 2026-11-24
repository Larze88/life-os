import fs from 'node:fs';
import { uuidv7, type BackupStatus, type DaySummary, type Tracker } from '@lifeos/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, sessionCookie, signedIn, type TestContext } from '../test/test-app.ts';

async function waterId(ctx: TestContext, cookie: string): Promise<string> {
  const trackers = (await (
    await ctx.request('GET', '/api/v1/trackers', { cookie })
  ).json()) as Tracker[];
  return trackers.find((t) => t.key === 'water')!.id;
}

async function addWater(ctx: TestContext, cookie: string, value: number) {
  const trackerId = await waterId(ctx, cookie);
  await ctx.request('PUT', `/api/v1/entries/${uuidv7()}`, {
    cookie,
    body: { trackerId, occurredAt: '2026-11-24T10:00:00Z', tzOffsetMin: 60, value },
  });
}

async function dayTotal(ctx: TestContext, cookie: string): Promise<number | null> {
  const day = (await (
    await ctx.request('GET', '/api/v1/days/2026-11-24', { cookie })
  ).json()) as DaySummary;
  return day.trackers[0]?.value ?? null;
}

function restore(ctx: TestContext, cookie: string, bytes: Uint8Array) {
  return ctx.app.request('/api/v1/backups/restore', {
    method: 'POST',
    headers: {
      host: 'localhost:5173',
      origin: 'http://localhost:5173',
      cookie,
      'content-type': 'application/octet-stream',
    },
    body: bytes,
  });
}

describe('backups', () => {
  let source: TestContext;
  let target: TestContext;
  beforeEach(async () => {
    source = await createTestContext();
    target = await createTestContext();
  });
  afterEach(() => {
    source.cleanup();
    target.cleanup();
  });

  it('requires authentication', async () => {
    expect((await source.request('GET', '/api/v1/backups/download')).status).toBe(401);
    expect((await restore(source, '', new Uint8Array(10))).status).toBe(401);
  });

  it('downloads a consistent SQLite file and records the time', async () => {
    const cookie = await signedIn(source);
    await addWater(source, cookie, 250);
    const before = (await (
      await source.request('GET', '/api/v1/backups/status', { cookie })
    ).json()) as BackupStatus;
    expect(before.lastDownloadAt).toBeNull();
    expect(before.firstEntryAt).toBe('2026-11-24T10:00:00.000Z');

    const res = await source.request('GET', '/api/v1/backups/download', { cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toMatch(
      /attachment; filename="lifeos-backup-.*\.db"/,
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Buffer.from(bytes.subarray(0, 15)).toString()).toBe('SQLite format 3');

    const after = (await (
      await source.request('GET', '/api/v1/backups/status', { cookie })
    ).json()) as BackupStatus;
    expect(after.lastDownloadAt).not.toBeNull();
  });

  it('moves all data to another instance (PC → Pi) and keeps the restoring device signed in', async () => {
    const sourceCookie = await signedIn(source);
    await addWater(source, sourceCookie, 250);
    await addWater(source, sourceCookie, 500);
    const backup = new Uint8Array(
      await (
        await source.request('GET', '/api/v1/backups/download', { cookie: sourceCookie })
      ).arrayBuffer(),
    );

    // Target: fresh installation with a different password and its own data.
    const targetCookie = sessionCookie(
      await target.request('POST', '/api/v1/auth/setup', {
        body: { password: 'anderes-passwort-1' },
      }),
    )!;
    await addWater(target, targetCookie, 100);

    expect((await restore(target, targetCookie, backup)).status).toBe(204);
    expect(await dayTotal(target, targetCookie)).toBe(750);

    // The password now is the one from the backup.
    const login = await target.request('POST', '/api/v1/auth/login', {
      body: { password: 'test-passwort-123' },
    });
    expect(login.status).toBe(204);
    // A snapshot of the replaced state was kept.
    expect(fs.readdirSync(target.config.snapshotDir).some((f) => f.includes('pre-restore'))).toBe(
      true,
    );
  });

  it('rejects files that are not backups without touching data', async () => {
    const cookie = await signedIn(target);
    await addWater(target, cookie, 300);
    const res = await restore(target, cookie, new TextEncoder().encode('x'.repeat(2000)));
    expect(res.status).toBe(400);
    expect(await dayTotal(target, cookie)).toBe(300);
  });
});
