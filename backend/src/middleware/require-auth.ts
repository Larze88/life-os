import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { SESSION_COOKIE } from '../auth/session-store.ts';
import { problems } from '../lib/problem.ts';
import type { AppEnv } from '../types.ts';

export function requireAuth(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const session = c.var.services.sessions.validate(getCookie(c, SESSION_COOKIE));
    if (!session) throw problems.unauthorized();
    c.set('session', session);
    return next();
  };
}
