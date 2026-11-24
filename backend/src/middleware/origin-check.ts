import type { MiddlewareHandler } from 'hono';
import { problems } from '../lib/problem.ts';
import type { AppEnv } from '../types.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection in addition to SameSite cookies (docs/ARCHITECTURE.md §8).
 * State-changing requests must come from our own origin: either the browser says so
 * via Sec-Fetch-Site (cannot be set by scripts), or Origin matches the Host /
 * X-Forwarded-Host header (relevant behind `tailscale serve` and the Vite proxy).
 */
export function originCheck(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) return next();

    if (c.req.header('sec-fetch-site') === 'same-origin') return next();

    const origin = c.req.header('origin');
    if (!origin) throw problems.forbidden('Missing Origin header');
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw problems.forbidden('Invalid Origin header');
    }
    const allowedHosts = [c.req.header('host'), c.req.header('x-forwarded-host')].filter(Boolean);
    if (!allowedHosts.includes(originHost))
      throw problems.forbidden('Cross-origin request rejected');
    return next();
  };
}
