import { Hono } from 'hono';
import { correlationQuerySchema, historyQuerySchema, statsSeriesQuerySchema } from '@lifeos/shared';
import { getHistory } from '../core/history.ts';
import { getCorrelation, getStatsSeries } from '../core/stats.ts';
import { validate } from '../lib/validate.ts';
import { requireAuth } from '../middleware/require-auth.ts';
import type { AppEnv } from '../types.ts';

export const statsRoutes = new Hono<AppEnv>()
  .use(requireAuth())
  .get('/series', validate('query', statsSeriesQuerySchema), (c) => {
    const { db, modules } = c.var.services;
    const { trackerId, from, to } = c.req.valid('query');
    c.header('Cache-Control', 'no-store');
    return c.json(getStatsSeries(db, modules, trackerId, from, to));
  })
  .get('/correlation', validate('query', correlationQuerySchema), (c) => {
    const { db, modules } = c.var.services;
    c.header('Cache-Control', 'no-store');
    return c.json(getCorrelation(db, modules, c.req.valid('query')));
  });

export const historyRoutes = new Hono<AppEnv>()
  .use(requireAuth())
  .get('/', validate('query', historyQuerySchema), (c) => {
    const { db, modules } = c.var.services;
    const { from, to } = c.req.valid('query');
    c.header('Cache-Control', 'no-store');
    return c.json(getHistory(db, modules, from, to));
  });
