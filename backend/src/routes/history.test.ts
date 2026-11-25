import { uuidv7, type History, type Tracker } from '@lifeos/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, signedIn, type TestContext } from '../test/test-app.ts';

describe('history API', () => {
  let ctx: TestContext;
  let cookie: string;
  let trackers: Tracker[];
  beforeEach(async () => {
    ctx = await createTestContext();
    cookie = await signedIn(ctx);
    trackers = (await (
      await ctx.request('GET', '/api/v1/trackers', { cookie })
    ).json()) as Tracker[];
  });
  afterEach(() => ctx.cleanup());

  const id = (key: string) => trackers.find((t) => t.key === key)!.id;
  const add = (
    trackerId: string,
    date: string,
    value: number | null,
    data: Record<string, unknown> = {},
  ) =>
    ctx.request('PUT', `/api/v1/entries/${uuidv7()}`, {
      cookie,
      body: { trackerId, occurredAt: `${date}T11:00:00Z`, tzOffsetMin: 60, value, data },
    });
  const history = async (from: string, to: string) =>
    (await (
      await ctx.request('GET', `/api/v1/history?from=${from}&to=${to}`, { cookie })
    ).json()) as History;

  it('lists days with entries newest first, aggregated per tracker in dashboard order', async () => {
    await add(id('water'), '2026-11-20', 250);
    await add(id('water'), '2026-11-20', 500);
    await add(id('mood'), '2026-11-20', 2);
    await add(id('mood'), '2026-11-20', 4);
    await add(id('meals'), '2026-11-22', null, { mealType: 'lunch' });

    const h = await history('2026-11-19', '2026-11-25');
    expect(h.days.map((d) => d.date)).toEqual(['2026-11-22', '2026-11-20']);
    expect(h.days[1]!.trackers).toEqual([
      { trackerId: id('water'), value: 750, count: 2 },
      { trackerId: id('mood'), value: 3, count: 2 },
    ]);
    expect(h.days[0]!.trackers).toEqual([{ trackerId: id('meals'), value: 1, count: 1 }]);
    expect(h.hasMoreBefore).toBe(false);
  });

  it('reports older entries for paging and excludes deleted ones', async () => {
    await add(id('water'), '2026-10-01', 250);
    const res = await add(id('water'), '2026-11-24', 250);
    const { id: entryId } = (await res.json()) as { id: string };
    await ctx.request('DELETE', `/api/v1/entries/${entryId}`, { cookie });

    const recent = await history('2026-11-12', '2026-11-25');
    expect(recent).toEqual({ days: [], hasMoreBefore: true });
    const older = await history('2026-09-28', '2026-10-11');
    expect(older.days.map((d) => d.date)).toEqual(['2026-10-01']);
    expect(older.hasMoreBefore).toBe(false);
  });

  it('validates the range and requires authentication', async () => {
    expect(
      (await ctx.request('GET', '/api/v1/history?from=2026-11-25&to=2026-11-01', { cookie }))
        .status,
    ).toBe(400);
    expect((await ctx.request('GET', '/api/v1/history?from=2026-11-01&to=2026-11-25')).status).toBe(
      401,
    );
  });
});
