import { uuidv7, type DaySummary, type Tracker } from '@lifeos/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, signedIn, type TestContext } from '../test/test-app.ts';

describe('phase 3b modules', () => {
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
  const put = (body: Record<string, unknown>) =>
    ctx.request('PUT', `/api/v1/entries/${uuidv7()}`, {
      cookie,
      body: { occurredAt: '2026-11-25T10:00:00Z', tzOffsetMin: 60, ...body },
    });
  const dayOf = async (key: string) => {
    const day = (await (
      await ctx.request('GET', '/api/v1/days/2026-11-25', { cookie })
    ).json()) as DaySummary;
    return day.trackers.find((t) => t.tracker.key === key);
  };

  it('activity: sums minutes against the 30-minute goal', async () => {
    const trackerId = byKey('activity').id;
    expect(
      (await put({ trackerId, value: 25, data: { type: 'Laufen', intensity: 3, distanceKm: 4.5 } }))
        .status,
    ).toBe(201);
    expect(
      (await put({ trackerId, value: 20, data: { type: 'Gehen', intensity: 1 } })).status,
    ).toBe(201);
    expect((await put({ trackerId, value: 20, data: { intensity: 1 } })).status).toBe(400);
    const day = await dayOf('activity');
    expect(day).toMatchObject({ value: 45, count: 2 });
    expect(day?.goal?.target).toBe(30);
  });

  it('measurements: last value of the day, second value, custom and archivable trackers', async () => {
    const weight = byKey('weight');
    expect(weight.config).toEqual({ unit: 'kg', decimals: 1 });
    await put({ trackerId: weight.id, value: 80.2, occurredAt: '2026-11-25T06:00:00Z' });
    await put({ trackerId: weight.id, value: 79.8, occurredAt: '2026-11-25T20:00:00Z' });
    expect(await dayOf('weight')).toMatchObject({ value: 79.8, count: 2 });

    const created = await ctx.request('POST', '/api/v1/trackers', {
      cookie,
      body: {
        module: 'measurement',
        name: 'Blutdruck',
        config: { unit: 'mmHg', secondaryLabel: 'diastolisch' },
      },
    });
    expect(created.status).toBe(201);
    const bp = (await created.json()) as Tracker;
    expect((await put({ trackerId: bp.id, value: 120, data: { secondary: 80 } })).status).toBe(201);
    expect(
      (
        await ctx.request('POST', '/api/v1/trackers', {
          cookie,
          body: { module: 'measurement', name: 'X', config: {} },
        })
      ).status,
    ).toBe(400);

    // Default measurement trackers can be archived and are not re-created by the seed.
    expect(
      (
        await ctx.request('POST', `/api/v1/trackers/${byKey('resting-pulse').id}/archive`, {
          cookie,
        })
      ).status,
    ).toBe(204);
    expect(await dayOf('resting-pulse')).toBeUndefined();
  });

  it('symptoms: strongest complaint of the day, catalog can be extended', async () => {
    const symptoms = byKey('symptoms');
    await put({ trackerId: symptoms.id, value: 3, data: { symptom: 'Kopfschmerzen' } });
    await put({ trackerId: symptoms.id, value: 6, data: { symptom: 'Rückenschmerzen' } });
    expect((await put({ trackerId: symptoms.id, value: 11, data: { symptom: 'X' } })).status).toBe(
      400,
    );
    expect(await dayOf('symptoms')).toMatchObject({ value: 6, count: 2 });

    const config = symptoms.config as { catalog: string[] };
    const res = await ctx.request('PATCH', `/api/v1/trackers/${symptoms.id}`, {
      cookie,
      body: { config: { catalog: [...config.catalog, 'Heuschnupfen'] } },
    });
    expect(((await res.json()) as Tracker).config).toMatchObject({
      catalog: expect.arrayContaining(['Heuschnupfen']),
    });
  });

  it('focus: sums session minutes', async () => {
    const trackerId = byKey('focus').id;
    await put({
      trackerId,
      value: 50,
      data: { concentration: 4, productivity: 5, task: 'Bericht' },
    });
    await put({ trackerId, value: 25, data: {} });
    expect(await dayOf('focus')).toMatchObject({ value: 75, count: 2 });
  });

  it('meals: counted, no primary value allowed', async () => {
    const trackerId = byKey('meals').id;
    expect((await put({ trackerId, data: { mealType: 'breakfast' } })).status).toBe(201);
    expect(
      (
        await put({
          trackerId,
          data: { mealType: 'lunch', description: 'Linsensuppe', tags: ['selbst gekocht'] },
        })
      ).status,
    ).toBe(201);
    expect((await put({ trackerId, value: 3, data: { mealType: 'snack' } })).status).toBe(400);
    expect(await dayOf('meals')).toMatchObject({ value: 2, count: 2 });
  });
});
