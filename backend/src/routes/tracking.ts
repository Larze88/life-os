import { Hono } from 'hono';
import { z } from 'zod';
import {
  entryQuerySchema,
  entryUpsertSchema,
  goalUpdateSchema,
  settingsSchema,
  trackerCreateSchema,
  trackerUpdateSchema,
} from '@lifeos/shared';
import { getDaySummary } from '../core/days.ts';
import { listEntries, softDeleteEntry, upsertEntry } from '../core/entries.ts';
import { dailyGoalOn, setDailyGoalTarget } from '../core/goals.ts';
import { getSettings, updateSettings } from '../core/settings.ts';
import {
  archiveTracker,
  createTracker,
  getTrackerRow,
  listActiveTrackers,
  toTracker,
  updateTracker,
} from '../core/trackers.ts';
import { problems } from '../lib/problem.ts';
import { validate } from '../lib/validate.ts';
import { requireAuth } from '../middleware/require-auth.ts';
import type { AppEnv } from '../types.ts';

const dateParam = z.object({ date: z.iso.date() });

export const settingsRoutes = new Hono<AppEnv>()
  .use(requireAuth())
  .get('/', (c) => c.json(getSettings(c.var.services.db)))
  .put('/', validate('json', settingsSchema), (c) =>
    c.json(updateSettings(c.var.services.db, c.req.valid('json'))),
  );

export const trackerRoutes = new Hono<AppEnv>()
  .use(requireAuth())
  .get('/', (c) => c.json(listActiveTrackers(c.var.services.db).map(toTracker)))
  .post('/', validate('json', trackerCreateSchema), (c) => {
    const { db, modules } = c.var.services;
    return c.json(createTracker(db, modules, c.req.valid('json')), 201);
  })
  .post('/:id/archive', (c) => {
    const { db, modules } = c.var.services;
    archiveTracker(db, modules, c.req.param('id'));
    return c.body(null, 204);
  })
  .patch('/:id', validate('json', trackerUpdateSchema), (c) => {
    const { db, modules } = c.var.services;
    return c.json(updateTracker(db, modules, c.req.param('id'), c.req.valid('json')));
  })
  .put('/:id/goal', validate('json', goalUpdateSchema), (c) => {
    const { db } = c.var.services;
    const id = c.req.param('id');
    const tracker = getTrackerRow(db, id);
    if (!tracker || tracker.archivedAt) throw problems.notFound();
    const { target, effectiveFrom } = c.req.valid('json');
    const template = dailyGoalOn(db, id, effectiveFrom) ?? {
      metric: 'sum' as const,
      comparator: 'gte' as const,
    };
    return c.json(setDailyGoalTarget(db, id, template, target, effectiveFrom));
  });

export const entryRoutes = new Hono<AppEnv>()
  .use(requireAuth())
  .get('/', validate('query', entryQuerySchema), (c) =>
    c.json(listEntries(c.var.services.db, c.req.valid('query'))),
  )
  .put('/:id', validate('json', entryUpsertSchema), (c) => {
    const { db, modules } = c.var.services;
    const { entry, created } = upsertEntry(db, modules, c.req.param('id'), c.req.valid('json'));
    return c.json(entry, created ? 201 : 200);
  })
  .delete('/:id', (c) => {
    softDeleteEntry(c.var.services.db, c.req.param('id'));
    return c.body(null, 204);
  });

export const dayRoutes = new Hono<AppEnv>()
  .use(requireAuth())
  .get('/:date', validate('param', dateParam), (c) => {
    const { db, modules } = c.var.services;
    c.header('Cache-Control', 'no-store');
    return c.json(getDaySummary(db, modules, c.req.valid('param').date));
  });
