import { uuidv7, type DaySummary, type Entry, type Goal, type Tracker } from '@lifeos/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seedModules } from '../core/seed.ts';
import { createTestContext, signedIn, type TestContext } from '../test/test-app.ts';

/** The water tracker's day within a summary. */
const waterOf = (summary: DaySummary) => summary.trackers.find((t) => t.tracker.key === 'water');

describe('tracking API', () => {
  let ctx: TestContext;
  let cookie: string;
  let water: Tracker;

  beforeEach(async () => {
    ctx = await createTestContext();
    cookie = await signedIn(ctx);
    const trackers = (await (
      await ctx.request('GET', '/api/v1/trackers', { cookie })
    ).json()) as Tracker[];
    water = trackers.find((t) => t.key === 'water')!;
  });
  afterEach(() => ctx.cleanup());

  const put = (id: string, body: Record<string, unknown>) =>
    ctx.request('PUT', `/api/v1/entries/${id}`, { cookie, body });
  const day = async (date: string) =>
    (await (await ctx.request('GET', `/api/v1/days/${date}`, { cookie })).json()) as DaySummary;
  const drink = (ml: number, occurredAt = '2026-11-24T10:00:00Z', tzOffsetMin = 60) =>
    put(uuidv7(), {
      trackerId: water.id,
      occurredAt,
      tzOffsetMin,
      value: ml,
      source: 'quick_action',
    });

  it('requires authentication', async () => {
    expect((await ctx.request('GET', '/api/v1/trackers')).status).toBe(401);
    expect((await ctx.request('GET', '/api/v1/days/2026-11-24')).status).toBe(401);
  });

  it('seeds the water tracker with goal and widget exactly once', async () => {
    expect(water).toMatchObject({
      module: 'water',
      name: 'Wasser',
      config: { unit: 'ml', quickAmounts: [250, 500] },
    });
    expect(seedModules(ctx.handle.db, ctx.services.modules)).toEqual([]);
    const summary = await day('2026-11-24');
    expect(summary.trackers.map((t) => t.tracker.key)).toEqual(['water', 'mood', 'sleep']);
    expect(waterOf(summary)?.goal?.target).toBe(2000);
    expect(summary.widgets.map((w) => w.widgetType)).toEqual([
      'water.progress',
      'mood.today',
      'sleep.last_night',
      'habits.today',
    ]);
  });

  it('creates entries idempotently under the client id', async () => {
    const id = uuidv7();
    const body = {
      trackerId: water.id,
      occurredAt: '2026-11-24T10:00:00Z',
      tzOffsetMin: 60,
      value: 250,
    };
    const first = await put(id, body);
    expect(first.status).toBe(201);
    const entry = (await first.json()) as Entry;
    expect(entry).toMatchObject({ id, localDate: '2026-11-24', value: 250, source: 'manual' });

    // Retry of the same request: no duplicate.
    expect((await put(id, body)).status).toBe(200);
    // Update
    const updated = (await (await put(id, { ...body, value: 300 })).json()) as Entry;
    expect(updated.value).toBe(300);

    expect(waterOf(await day('2026-11-24'))).toMatchObject({ value: 300, count: 1 });
  });

  it('computes the logical day from the device offset', async () => {
    // 23:30 UTC = 00:30 next day in Berlin
    const entry = (await (await drink(250, '2026-11-24T23:30:00Z', 60)).json()) as Entry;
    expect(entry.localDate).toBe('2026-11-25');
  });

  it('respects the configured day start', async () => {
    await ctx.request('PUT', '/api/v1/settings', { cookie, body: { dayStart: '04:00' } });
    const entry = (await (await drink(250, '2026-11-25T01:00:00Z', 60)).json()) as Entry; // 02:00 local
    expect(entry.localDate).toBe('2026-11-24');
  });

  it('validates values through the module', async () => {
    for (const value of [0, -250, 12.5, 99_999, null]) {
      const res = await put(uuidv7(), {
        trackerId: water.id,
        occurredAt: '2026-11-24T10:00:00Z',
        tzOffsetMin: 60,
        value,
      });
      expect(res.status).toBe(400);
      expect(
        ((await res.json()) as { errors: Record<string, string[]> }).errors.value,
      ).toBeDefined();
    }
  });

  it('rejects unknown trackers, malformed ids and bad timestamps', async () => {
    const base = {
      trackerId: water.id,
      occurredAt: '2026-11-24T10:00:00Z',
      tzOffsetMin: 60,
      value: 250,
    };
    expect((await put(uuidv7(), { ...base, trackerId: 'nope' })).status).toBe(400);
    expect((await put('not-a-uuid', base)).status).toBe(400);
    expect((await put(uuidv7(), { ...base, occurredAt: 'gestern' })).status).toBe(400);
    expect((await put(uuidv7(), { ...base, tzOffsetMin: 5000 })).status).toBe(400);
  });

  it('soft-deletes entries and excludes them everywhere', async () => {
    const res = await drink(250);
    const { id } = (await res.json()) as Entry;
    await drink(500);
    expect((await ctx.request('DELETE', `/api/v1/entries/${id}`, { cookie })).status).toBe(204);
    expect((await ctx.request('DELETE', `/api/v1/entries/${id}`, { cookie })).status).toBe(404);
    // Deleted entries cannot be resurrected by a late retry.
    expect(
      (
        await put(id, {
          trackerId: water.id,
          occurredAt: '2026-11-24T10:00:00Z',
          tzOffsetMin: 60,
          value: 250,
        })
      ).status,
    ).toBe(409);

    expect(waterOf(await day('2026-11-24'))).toMatchObject({ value: 500, count: 1 });
    const list = (await (
      await ctx.request('GET', '/api/v1/entries?from=2026-11-24&to=2026-11-24', { cookie })
    ).json()) as Entry[];
    expect(list.map((e) => e.value)).toEqual([500]);
    // The row still exists in the database (soft delete).
    const row = ctx.handle.sqlite
      .prepare('SELECT deleted_at FROM entries WHERE id = ?')
      .get(id) as { deleted_at: string };
    expect(row.deleted_at).not.toBeNull();
  });

  it('lists entries per tracker and date range in chronological order', async () => {
    await drink(500, '2026-11-24T12:00:00Z');
    await drink(250, '2026-11-24T08:00:00Z');
    await drink(750, '2026-11-26T08:00:00Z');
    const res = await ctx.request(
      'GET',
      `/api/v1/entries?trackerId=${water.id}&from=2026-11-24&to=2026-11-25`,
      { cookie },
    );
    expect(((await res.json()) as Entry[]).map((e) => e.value)).toEqual([250, 500]);
    expect(
      (await ctx.request('GET', '/api/v1/entries?from=2026-11-25&to=2026-11-24', { cookie }))
        .status,
    ).toBe(400);
    expect(
      (await ctx.request('GET', '/api/v1/entries?from=2024-01-01&to=2026-11-24', { cookie }))
        .status,
    ).toBe(400);
  });

  it('historizes goal changes', async () => {
    const res = await ctx.request('PUT', `/api/v1/trackers/${water.id}/goal`, {
      cookie,
      body: { target: 2500, effectiveFrom: '2026-11-24' },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as Goal).target).toBe(2500);

    expect(waterOf(await day('2026-11-23'))?.goal?.target).toBe(2000);
    expect(waterOf(await day('2026-11-24'))?.goal?.target).toBe(2500);
    expect(waterOf(await day('2027-01-01'))?.goal?.target).toBe(2500);

    // Correcting on the same day changes the target in place, no extra history row.
    await ctx.request('PUT', `/api/v1/trackers/${water.id}/goal`, {
      cookie,
      body: { target: 3000, effectiveFrom: '2026-11-24' },
    });
    expect(waterOf(await day('2026-11-24'))?.goal?.target).toBe(3000);
    expect(waterOf(await day('2026-11-23'))?.goal?.target).toBe(2000);
    const goalRows = ctx.handle.sqlite
      .prepare('SELECT COUNT(*) AS n FROM goals WHERE tracker_id = ?')
      .get(water.id) as { n: number };
    expect(goalRows.n).toBe(2);
  });

  it('updates tracker config through the module schema', async () => {
    const ok = await ctx.request('PATCH', `/api/v1/trackers/${water.id}`, {
      cookie,
      body: { config: { quickAmounts: [200, 330, 500] } },
    });
    expect(((await ok.json()) as Tracker).config).toEqual({
      unit: 'ml',
      quickAmounts: [200, 330, 500],
    });
    const bad = await ctx.request('PATCH', `/api/v1/trackers/${water.id}`, {
      cookie,
      body: { config: { quickAmounts: [] } },
    });
    expect(bad.status).toBe(400);
    expect(
      (await ctx.request('PATCH', '/api/v1/trackers/unknown', { cookie, body: { name: 'x' } }))
        .status,
    ).toBe(404);
  });

  it('returns and stores settings', async () => {
    expect(await (await ctx.request('GET', '/api/v1/settings', { cookie })).json()).toEqual({
      dayStart: '00:00',
    });
    expect(
      (await ctx.request('PUT', '/api/v1/settings', { cookie, body: { dayStart: '25:00' } }))
        .status,
    ).toBe(400);
  });
});
