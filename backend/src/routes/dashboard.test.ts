import type { DaySummary, Tracker, Widget } from '@lifeos/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, signedIn, type TestContext } from '../test/test-app.ts';

describe('dashboard layout API', () => {
  let ctx: TestContext;
  let cookie: string;
  beforeEach(async () => {
    ctx = await createTestContext();
    cookie = await signedIn(ctx);
  });
  afterEach(() => ctx.cleanup());

  const widgets = async () =>
    (
      (await (await ctx.request('GET', '/api/v1/dashboard', { cookie })).json()) as {
        widgets: Widget[];
      }
    ).widgets;
  const save = (items: { id: string; hidden: boolean }[]) =>
    ctx.request('PUT', '/api/v1/dashboard/layout', { cookie, body: { widgets: items } });
  const dayWidgets = async () =>
    (
      (await (await ctx.request('GET', '/api/v1/days/2026-11-25', { cookie })).json()) as DaySummary
    ).widgets.map((w) => w.widgetType);

  it('lists all widgets, visible by default', async () => {
    const list = await widgets();
    expect(list.length).toBe(9);
    expect(list.every((w) => w.hidden === false)).toBe(true);
    expect((await ctx.request('GET', '/api/v1/dashboard')).status).toBe(401);
  });

  it('reorders and hides widgets; the dashboard only shows visible ones', async () => {
    const list = await widgets();
    const reordered = [list[2]!, list[0]!, ...list.slice(3), list[1]!].map((w) => ({
      id: w.id,
      hidden: w.widgetType === 'meals.today',
    }));
    const res = await save(reordered);
    expect(res.status).toBe(200);
    const saved = ((await res.json()) as { widgets: Widget[] }).widgets;
    expect(saved.map((w) => w.id)).toEqual(reordered.map((w) => w.id));
    expect(saved.find((w) => w.widgetType === 'meals.today')?.hidden).toBe(true);

    const visible = await dayWidgets();
    expect(visible[0]).toBe('sleep.last_night');
    expect(visible.at(-1)).toBe('mood.today');
    expect(visible).not.toContain('meals.today');
    expect(visible).toHaveLength(8);
  });

  it('rejects incomplete or unknown layouts', async () => {
    const list = await widgets();
    const items = list.map((w) => ({ id: w.id, hidden: false }));
    expect((await save(items.slice(1))).status).toBe(409);
    expect((await save([...items.slice(1), { id: 'unknown', hidden: false }])).status).toBe(409);
    expect((await save([...items, items[0]!])).status).toBe(400);
  });

  it('keeps hidden widgets hidden when a tracker is archived and drops its widget from the layout', async () => {
    const trackers = (await (
      await ctx.request('GET', '/api/v1/trackers', { cookie })
    ).json()) as Tracker[];
    const created = await ctx.request('POST', '/api/v1/trackers', {
      cookie,
      body: { module: 'measurement', name: 'Blutdruck', config: { unit: 'mmHg' } },
    });
    expect(created.status).toBe(201);
    // Measurement trackers share one overview widget; archiving one must not break the layout.
    const pulse = trackers.find((t) => t.key === 'resting-pulse')!;
    await ctx.request('POST', `/api/v1/trackers/${pulse.id}/archive`, { cookie });
    const list = await widgets();
    expect((await save(list.map((w) => ({ id: w.id, hidden: false })))).status).toBe(200);
  });
});
