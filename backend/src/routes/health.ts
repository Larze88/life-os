import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { Health } from '@lifeos/shared';
import type { AppEnv } from '../types.ts';

/** Unauthenticated liveness check for the Home Assistant watchdog. Reveals no data. */
export const healthRoutes = new Hono<AppEnv>().get('/', (c) => {
  c.var.services.db.run(sql`SELECT 1`);
  const body: Health = { status: 'ok', version: c.var.services.config.version };
  c.header('Cache-Control', 'no-store');
  return c.json(body);
});
