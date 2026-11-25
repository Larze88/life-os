import { uuidv7, type DaySummary, type Entry, type Tracker } from '@lifeos/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seedModules } from '../core/seed.ts';
import { createTestContext, signedIn, type TestContext } from '../test/test-app.ts';

describe('phase 3a modules', () => {
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
  const put = (body: Record<string, unknown>, id = uuidv7()) =>
    ctx.request('PUT', `/api/v1/entries/${id}`, { cookie, body });
  const day = async (date: string) =>
    (await (await ctx.request('GET', `/api/v1/days/${date}`, { cookie })).json()) as DaySummary;

  describe('sleep', () => {
    it('derives the duration and counts the night for the wake-up day', async () => {
      const res = await put({
        trackerId: byKey('sleep').id,
        occurredAt: '2026-11-24T22:30:00Z', // 23:30 Berlin
        endsAt: '2026-11-25T06:15:00Z', // 07:15 Berlin
        tzOffsetMin: 60,
        value: 1, // ignored: the server computes the duration
        data: { quality: 4 },
      });
      expect(res.status).toBe(201);
      const entry = (await res.json()) as Entry;
      expect(entry).toMatchObject({
        value: 465,
        localDate: '2026-11-25',
        endsAt: '2026-11-25T06:15:00.000Z',
      });

      const summary = await day('2026-11-25');
      const sleep = summary.trackers.find((t) => t.tracker.key === 'sleep');
      expect(sleep).toMatchObject({ value: 465, count: 1 });
      expect(sleep?.goal?.target).toBe(420);
    });

    it('rejects missing or inverted end times and missing quality', async () => {
      const base = {
        trackerId: byKey('sleep').id,
        occurredAt: '2026-11-24T22:30:00Z',
        tzOffsetMin: 60,
        data: { quality: 3 },
      };
      expect((await put(base)).status).toBe(400);
      expect((await put({ ...base, endsAt: '2026-11-24T21:00:00Z' })).status).toBe(400);
      expect((await put({ ...base, endsAt: '2026-11-25T06:00:00Z', data: {} })).status).toBe(400);
      expect((await put({ ...base, endsAt: '2026-11-26T06:00:00Z' })).status).toBe(400); // > 20 h
    });
  });

  describe('mood', () => {
    it('averages several ratings per day', async () => {
      const trackerId = byKey('mood').id;
      await put({ trackerId, occurredAt: '2026-11-24T08:00:00Z', tzOffsetMin: 60, value: 2 });
      await put({
        trackerId,
        occurredAt: '2026-11-24T18:00:00Z',
        tzOffsetMin: 60,
        value: 5,
        data: { energy: 4, stress: 2 },
      });
      const mood = (await day('2026-11-24')).trackers.find((t) => t.tracker.key === 'mood');
      expect(mood).toMatchObject({ value: 3.5, count: 2 });
    });

    it('rejects values outside the scale', async () => {
      const res = await put({
        trackerId: byKey('mood').id,
        occurredAt: '2026-11-24T08:00:00Z',
        tzOffsetMin: 60,
        value: 7,
      });
      expect(res.status).toBe(400);
    });
  });

  describe('habits', () => {
    const createHabit = (body: Record<string, unknown>) =>
      ctx.request('POST', '/api/v1/trackers', { cookie, body });

    it('creates, counts and archives user habits', async () => {
      const res = await createHabit({
        module: 'habit',
        name: 'Zähne putzen',
        config: { schedule: { type: 'daily' }, targetPerDay: 2 },
      });
      expect(res.status).toBe(201);
      const habit = (await res.json()) as Tracker;
      expect(habit.key).toMatch(/^habit-zaehne-putzen-[0-9a-f]{6}$/);
      expect(habit.config).toEqual({ schedule: { type: 'daily' }, targetPerDay: 2 });

      await put({
        trackerId: habit.id,
        occurredAt: '2026-11-24T07:00:00Z',
        tzOffsetMin: 60,
        value: 1,
      });
      await put({
        trackerId: habit.id,
        occurredAt: '2026-11-24T21:00:00Z',
        tzOffsetMin: 60,
        value: 1,
      });
      const summary = await day('2026-11-24');
      expect(summary.trackers.find((t) => t.tracker.id === habit.id)).toMatchObject({
        value: 2,
        count: 2,
      });

      expect(
        (await ctx.request('POST', `/api/v1/trackers/${habit.id}/archive`, { cookie })).status,
      ).toBe(204);
      const after = await day('2026-11-24');
      expect(after.trackers.some((t) => t.tracker.id === habit.id)).toBe(false);
      // History is kept.
      const rows = ctx.handle.sqlite
        .prepare('SELECT COUNT(*) AS n FROM entries WHERE tracker_id = ?')
        .get(habit.id) as { n: number };
      expect(rows.n).toBe(2);
    });

    it('validates habit configs and refuses trackers for built-in modules', async () => {
      expect(
        (
          await createHabit({
            module: 'habit',
            name: 'X',
            config: { schedule: { type: 'weekdays', days: [] } },
          })
        ).status,
      ).toBe(400);
      expect((await createHabit({ module: 'water', name: 'Zweites Wasser' })).status).toBe(400);
      expect((await createHabit({ module: 'unknown', name: 'X' })).status).toBe(400);
      expect(
        (await ctx.request('POST', `/api/v1/trackers/${byKey('water').id}/archive`, { cookie }))
          .status,
      ).toBe(400);
    });

    it('seeds the habits widget once without a tracker', async () => {
      seedModules(ctx.handle.db, ctx.services.modules);
      const widgets = (await day('2026-11-24')).widgets.filter(
        (w) => w.widgetType === 'habits.today',
      );
      expect(widgets).toHaveLength(1);
      expect(widgets[0]?.trackerId).toBeNull();
    });
  });

  it('adds new default trackers to existing installations without touching old ones', async () => {
    // Simulates an installation from before phase 3a: only water existed.
    ctx.handle.sqlite
      .prepare("DELETE FROM dashboard_widgets WHERE widget_type != 'water.progress'")
      .run();
    ctx.handle.sqlite
      .prepare(
        "DELETE FROM goals WHERE tracker_id IN (SELECT id FROM trackers WHERE key != 'water')",
      )
      .run();
    ctx.handle.sqlite.prepare("DELETE FROM trackers WHERE key != 'water'").run();
    ctx.handle.sqlite.prepare("UPDATE trackers SET name = 'Trinken' WHERE key = 'water'").run();

    expect(seedModules(ctx.handle.db, ctx.services.modules).slice(0, 3)).toEqual([
      'mood',
      'sleep',
      'widget:habits.today',
    ]);
    const summary = await day('2026-11-24');
    expect(summary.trackers.map((t) => t.tracker.name).slice(0, 3)).toEqual([
      'Trinken',
      'Stimmung',
      'Schlaf',
    ]);
    expect(summary.widgets[0]?.widgetType).toBe('water.progress');
  });
});
