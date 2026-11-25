import { addDays, uuidv7, type Correlation, type StatsSeries, type Tracker } from '@lifeos/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, signedIn, type TestContext } from '../test/test-app.ts';

describe('stats API', () => {
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

  const byKey = (key: string) => trackers.find((t) => t.key === key)!;
  /** Adds an entry at noon UTC (+60 min offset) on the given logical day. */
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
  const series = async (trackerId: string, from: string, to: string) => {
    const res = await ctx.request(
      'GET',
      `/api/v1/stats/series?trackerId=${trackerId}&from=${from}&to=${to}`,
      { cookie },
    );
    expect(res.status).toBe(200);
    return (await res.json()) as StatsSeries;
  };

  it('returns one value per day, goals per day and an average over tracked days', async () => {
    const water = byKey('water').id;
    await add(water, '2026-11-02', 1500);
    await add(water, '2026-11-02', 1000);
    await add(water, '2026-11-04', 1200);
    // Goal raised from 2000 to 2400 from 4 Nov on (historized).
    await ctx.request('PUT', `/api/v1/trackers/${water}/goal`, {
      cookie,
      body: { target: 2400, effectiveFrom: '2026-11-04' },
    });

    const s = await series(water, '2026-11-01', '2026-11-05');
    expect(s.days.map((d) => d.value)).toEqual([null, 2500, null, 1200, null]);
    expect(s.goalTarget).toBe(2400);
    // 1 Nov is before tracking started → not counted as missed.
    expect(s.days.map((d) => d.met)).toEqual([null, true, false, false, false]);
    expect(s.summary).toMatchObject({
      total: 3700,
      daysWithData: 2,
      min: 1200,
      max: 2500,
      goal: { met: 1, evaluated: 4 },
    });
    expect(s.summary.average).toBeCloseTo(3700 / 4);
    expect(s.streak).toEqual({ current: 0, longest: 1 });
  });

  it('averages non-additive values over days with data', async () => {
    const mood = byKey('mood').id;
    await add(mood, '2026-11-01', 2);
    await add(mood, '2026-11-01', 4);
    await add(mood, '2026-11-03', 5);
    const s = await series(mood, '2026-11-01', '2026-11-03');
    expect(s.days.map((d) => d.value)).toEqual([3, null, 5]);
    expect(s.summary.average).toBe(4);
    expect(s.summary.goal).toBeNull();
    expect(s.streak).toBeNull();
  });

  it('computes habit streaks on due days only and ignores a still-open last day', async () => {
    const res = await ctx.request('POST', '/api/v1/trackers', {
      cookie,
      body: {
        module: 'habit',
        name: 'Laufen',
        config: { schedule: { type: 'weekdays', days: [1, 3, 5] } },
      },
    });
    const habit = ((await res.json()) as Tracker).id;
    // Mon 2 Nov … Fri 13 Nov 2026; done on every due day except Mon 2 Nov.
    for (const d of ['2026-11-04', '2026-11-06', '2026-11-09', '2026-11-11'])
      await add(habit, d, 1);
    await add(habit, '2026-11-02', 1);
    const s = await series(habit, '2026-11-02', '2026-11-13'); // Fri 13 Nov due but not yet done
    const due = s.days.filter((d) => d.met !== null).map((d) => d.date);
    expect(due).toEqual([
      '2026-11-02',
      '2026-11-04',
      '2026-11-06',
      '2026-11-09',
      '2026-11-11',
      '2026-11-13',
    ]);
    expect(s.streak).toEqual({ current: 5, longest: 5 });
  });

  it('validates the range and the tracker', async () => {
    const water = byKey('water').id;
    expect(
      (
        await ctx.request(
          'GET',
          `/api/v1/stats/series?trackerId=${water}&from=2026-11-05&to=2026-11-01`,
          { cookie },
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await ctx.request(
          'GET',
          `/api/v1/stats/series?trackerId=${water}&from=2025-01-01&to=2026-11-01`,
          { cookie },
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await ctx.request(
          'GET',
          '/api/v1/stats/series?trackerId=nope&from=2026-11-01&to=2026-11-02',
          { cookie },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await ctx.request(
          'GET',
          `/api/v1/stats/series?trackerId=${water}&from=2026-11-01&to=2026-11-02`,
        )
      ).status,
    ).toBe(401);
  });

  describe('correlation', () => {
    const correlation = async (a: string, b: string, lag = 0) =>
      (await (
        await ctx.request(
          'GET',
          `/api/v1/stats/correlation?a=${a}&b=${b}&from=2026-10-01&to=2026-10-31&lag=${lag}`,
          { cookie },
        )
      ).json()) as Correlation;

    it('relates two trackers per day and needs enough shared days', async () => {
      const sleep = byKey('sleep').id;
      const mood = byKey('mood').id;
      for (let i = 0; i < 20; i++) {
        const date = addDays('2026-10-01', i);
        const minutes = 360 + i * 6; // 6 h … ~8 h
        await ctx.request('PUT', `/api/v1/entries/${uuidv7()}`, {
          cookie,
          body: {
            trackerId: sleep,
            occurredAt: new Date(Date.parse(`${date}T06:00:00Z`) - minutes * 60_000).toISOString(),
            endsAt: `${date}T06:00:00Z`,
            tzOffsetMin: 60,
            data: { quality: 3 },
          },
        });
        await add(mood, date, i < 7 ? 2 : i < 14 ? 3 : 4);
      }
      const c = await correlation(sleep, mood);
      expect(c.n).toBe(20);
      expect(c.rho).toBeGreaterThan(0.8);

      const few = await ctx.request(
        'GET',
        `/api/v1/stats/correlation?a=${sleep}&b=${mood}&from=2026-10-01&to=2026-10-05`,
        { cookie },
      );
      expect((await few.json()) as Correlation).toMatchObject({ n: 5, rho: null });
    });

    it('pairs with the following day when lag = 1 and counts missing activity as 0', async () => {
      const activity = byKey('activity').id;
      const sleep = byKey('sleep').id;
      // Activity on even days only; sleep the following night is longer after activity.
      for (let i = 0; i < 20; i++) {
        const date = addDays('2026-10-01', i);
        if (i % 2 === 0) await add(activity, date, 45, { type: 'Laufen', intensity: 2 });
        const next = addDays(date, 1);
        const minutes = i % 2 === 0 ? 480 : 400;
        await ctx.request('PUT', `/api/v1/entries/${uuidv7()}`, {
          cookie,
          body: {
            trackerId: sleep,
            occurredAt: new Date(Date.parse(`${next}T06:00:00Z`) - minutes * 60_000).toISOString(),
            endsAt: `${next}T06:00:00Z`,
            tzOffsetMin: 60,
            data: { quality: 3 },
          },
        });
      }
      const c = await correlation(activity, sleep, 1);
      // Activity days 1 Oct … 19 Oct (last entry); sleep nights 2 Oct … 21 Oct.
      expect(c.n).toBe(19);
      expect(c.pairs.some((p) => p.a === 0)).toBe(true);
      expect(c.pairs.every((p) => p.b > 0)).toBe(true);
      expect(c.rho).toBeCloseTo(1);
    });
  });
});

describe('sleep statistics', () => {
  it('does not count unrecorded nights as zero sleep', async () => {
    const ctx = await createTestContext();
    try {
      const cookie = await signedIn(ctx);
      const trackers = (await (
        await ctx.request('GET', '/api/v1/trackers', { cookie })
      ).json()) as Tracker[];
      const sleep = trackers.find((t) => t.key === 'sleep')!.id;
      for (const date of ['2026-11-01', '2026-11-03']) {
        await ctx.request('PUT', `/api/v1/entries/${uuidv7()}`, {
          cookie,
          body: {
            trackerId: sleep,
            occurredAt: `${addDays(date, -1)}T22:00:00Z`,
            endsAt: `${date}T06:00:00Z`,
            tzOffsetMin: 60,
            data: { quality: 4 },
          },
        });
      }
      const res = await ctx.request(
        'GET',
        `/api/v1/stats/series?trackerId=${sleep}&from=2026-11-01&to=2026-11-03`,
        { cookie },
      );
      const s = (await res.json()) as StatsSeries;
      expect(s.days.map((d) => d.met)).toEqual([true, null, true]);
      expect(s.summary.average).toBe(480);
      expect(s.summary.goal).toEqual({ met: 2, evaluated: 2 });
    } finally {
      ctx.cleanup();
    }
  });
});
