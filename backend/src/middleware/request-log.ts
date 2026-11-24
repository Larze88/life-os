import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.ts';

/** Logs method, path, status and duration only — never query strings, bodies or headers. */
export function requestLog(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const start = performance.now();
    await next();
    const ms = Math.round(performance.now() - start);
    const level = c.res.status >= 500 ? 'error' : 'debug';
    c.var.services.logger[level](
      { method: c.req.method, path: c.req.path, status: c.res.status, ms },
      'request',
    );
  };
}
