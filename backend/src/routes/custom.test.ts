import {
  uuidv7,
  type DaySummary,
  type Entry,
  type StatsSeries,
  type Tracker,
  type Widget,
} from '@lifeos/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, signedIn, type TestContext } from '../test/test-app.ts';

const coffeeConfig = {
  fields: [
    { key: 'f1', label: 'Tassen', type: 'number', min: 0, unit: 'Tassen', required: true },
    { key: 'f2', label: 'Art', type: 'select', options: ['Kaffee', 'Espresso'] },
  ],
  primaryField: 'f1',
  aggregate: 'sum',
};

describe('custom trackers', () => {
  let ctx: TestContext;
  let cookie: string;
  beforeEach(async () => {
    ctx = await createTestContext();
    cookie = await signedIn(ctx);
  });
  afterEach(() => ctx.cleanup());

  const create = async (name: string, config: unknown) =>
    ctx.request('POST', '/api/v1/trackers', { cookie, body: { module: 'custom', name, config } });
  const put = (trackerId: string, data: Record<string, unknown>, date = '2026-11-27') =>
    ctx.request('PUT', `/api/v1/entries/${uuidv7()}`, {
      cookie,
      body: { trackerId, occurredAt: `${date}T09:00:00Z`, tzOffsetMin: 60, value: 999, data },
    });
  const day = async () =>
    (await (await ctx.request('GET', '/api/v1/days/2026-11-27', { cookie })).json()) as DaySummary;

  it('creates a tracker with its own dashboard widget', async () => {
    const res = await create('Koffein', coffeeConfig);
    expect(res.status).toBe(201);
    const tracker = (await res.json()) as Tracker;
    expect(tracker.key).toMatch(/^custom-koffein-/);
    const widgets = (
      (await (await ctx.request('GET', '/api/v1/dashboard', { cookie })).json()) as {
        widgets: Widget[];
      }
    ).widgets;
    expect(widgets.at(-1)).toMatchObject({
      widgetType: 'custom.tracker',
      trackerId: tracker.id,
      hidden: false,
    });
  });

  it('validates entries against the tracker fields and derives the value from the primary field', async () => {
    const tracker = (await (await create('Koffein', coffeeConfig)).json()) as Tracker;
    const ok = await put(tracker.id, { f1: 2, f2: 'Espresso', ignored: 'x' });
    expect(ok.status).toBe(201);
    const entry = (await ok.json()) as Entry;
    expect(entry.value).toBe(2); // client value 999 ignored
    expect(entry.data).toEqual({ f1: 2, f2: 'Espresso' });
    expect((await put(tracker.id, { f2: 'Kaffee' })).status).toBe(400); // required field missing
    expect((await put(tracker.id, { f1: 1, f2: 'Tee' })).status).toBe(400); // unknown option
    expect((await put(tracker.id, { f1: -1 })).status).toBe(400); // below min
    await put(tracker.id, { f1: 1 });
    expect((await day()).trackers.find((t) => t.tracker.id === tracker.id)).toMatchObject({
      value: 3,
      count: 2,
    });
  });

  it('aggregates per tracker configuration in statistics', async () => {
    const tracker = (await (
      await create('Konzentration', {
        fields: [{ key: 'f1', label: 'Wert', type: 'scale', min: 1, max: 10, required: true }],
        primaryField: 'f1',
        aggregate: 'avg',
      })
    ).json()) as Tracker;
    await put(tracker.id, { f1: 4 }, '2026-11-26');
    await put(tracker.id, { f1: 8 }, '2026-11-26');
    const s = (await (
      await ctx.request(
        'GET',
        `/api/v1/stats/series?trackerId=${tracker.id}&from=2026-11-25&to=2026-11-27`,
        { cookie },
      )
    ).json()) as StatsSeries;
    expect(s.aggregate).toBe('avg');
    expect(s.days.map((d) => d.value)).toEqual([null, 6, null]);
    expect(s.summary.average).toBe(6); // averages over days with data, not zero-filled
  });

  it('counts entries for trackers without a primary value', async () => {
    const tracker = (await (
      await create('Notizen', { fields: [{ key: 'f1', label: 'Text', type: 'text' }] })
    ).json()) as Tracker;
    expect((await put(tracker.id, { f1: 'Hallo' })).status).toBe(201);
    expect((await put(tracker.id, {})).status).toBe(201);
    expect((await day()).trackers.find((t) => t.tracker.id === tracker.id)).toMatchObject({
      value: 2,
      count: 2,
    });
  });

  it('rejects invalid configurations and changes that would break existing entries', async () => {
    expect((await create('Leer', { fields: [] })).status).toBe(400);
    const tracker = (await (await create('Koffein', coffeeConfig)).json()) as Tracker;
    const patch = (config: unknown) =>
      ctx.request('PATCH', `/api/v1/trackers/${tracker.id}`, { cookie, body: { config } });

    // Allowed: rename a label, add an option, add a field, hide a field.
    const extended = {
      ...coffeeConfig,
      fields: [
        { ...coffeeConfig.fields[0], label: 'Becher' },
        {
          ...coffeeConfig.fields[1],
          options: ['Kaffee', 'Espresso', 'Cappuccino'],
          deprecated: true,
        },
        { key: 'f3', label: 'Zucker', type: 'boolean' },
      ],
    };
    expect((await patch(extended)).status).toBe(200);
    // Not allowed: removing a field or an option, changing the primary field.
    const removed = await patch({ ...extended, fields: [extended.fields[0], extended.fields[2]] });
    expect(removed.status).toBe(400);
    expect(((await removed.json()) as { detail: string }).detail).toMatch(/nicht gelöscht/);
    expect(
      (
        await patch({
          ...extended,
          fields: [
            extended.fields[0],
            { ...extended.fields[1], options: ['Kaffee'] },
            extended.fields[2],
          ],
        })
      ).status,
    ).toBe(400);
    expect((await patch({ ...extended, primaryField: undefined, aggregate: 'count' })).status).toBe(
      400,
    );
  });

  it('archiving removes the tracker and its widget from the dashboard', async () => {
    const tracker = (await (await create('Koffein', coffeeConfig)).json()) as Tracker;
    expect(
      (await ctx.request('POST', `/api/v1/trackers/${tracker.id}/archive`, { cookie })).status,
    ).toBe(204);
    const summary = await day();
    expect(summary.trackers.some((t) => t.tracker.id === tracker.id)).toBe(false);
    expect(summary.widgets.some((w) => w.trackerId === tracker.id)).toBe(false);
  });
});
