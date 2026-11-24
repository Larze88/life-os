import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Context } from 'hono';
import {
  changePasswordRequestSchema,
  loginRequestSchema,
  setupRequestSchema,
  type AuthStatus,
  type SessionInfo,
} from '@lifeos/shared';
import { SESSION_COOKIE, SESSION_TTL_MS, deviceLabelFromUserAgent } from '../auth/session-store.ts';
import { problems } from '../lib/problem.ts';
import { validate } from '../lib/validate.ts';
import { requireAuth } from '../middleware/require-auth.ts';
import type { AppEnv } from '../types.ts';

function startSession(c: Context<AppEnv>): void {
  const { sessions, config } = c.var.services;
  const { token } = sessions.create(deviceLabelFromUserAgent(c.req.header('user-agent')));
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export const authRoutes = new Hono<AppEnv>()
  .get('/status', (c) => {
    const { credentials, sessions } = c.var.services;
    const body: AuthStatus = {
      setupRequired: !credentials.isSetUp(),
      authenticated: sessions.validate(getCookie(c, SESSION_COOKIE)) !== null,
    };
    c.header('Cache-Control', 'no-store');
    return c.json(body);
  })

  .post('/setup', validate('json', setupRequestSchema), async (c) => {
    const { credentials, logger } = c.var.services;
    const created = await credentials.setInitial(c.req.valid('json').password);
    if (!created) throw problems.conflict('Ein Passwort ist bereits eingerichtet.');
    logger.info('initial password set');
    startSession(c);
    return c.body(null, 204);
  })

  .post('/login', validate('json', loginRequestSchema), async (c) => {
    const { credentials, loginLimiter, logger } = c.var.services;
    const retryAfter = loginLimiter.retryAfterSeconds();
    if (retryAfter > 0) throw problems.tooManyRequests(retryAfter);

    const ok = await credentials.verify(c.req.valid('json').password);
    if (!ok) {
      loginLimiter.recordFailure();
      logger.warn('failed login attempt');
      throw problems.unauthorized();
    }
    loginLimiter.reset();
    startSession(c);
    return c.body(null, 204);
  })

  .post('/logout', (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) c.var.services.sessions.revokeByToken(token);
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.body(null, 204);
  })

  .get('/sessions', requireAuth(), (c) => {
    const current = c.var.session.id;
    // Session IDs are hashes of the tokens; exposing them does not allow hijacking.
    const body: SessionInfo[] = c.var.services.sessions
      .list()
      .map((s) => ({ ...s, current: s.id === current }));
    return c.json(body);
  })

  .delete('/sessions/:id', requireAuth(), (c) => {
    if (!c.var.services.sessions.revoke(c.req.param('id'))) throw problems.notFound();
    return c.body(null, 204);
  })

  .post('/password', requireAuth(), validate('json', changePasswordRequestSchema), async (c) => {
    const { credentials, sessions, logger } = c.var.services;
    const { currentPassword, newPassword } = c.req.valid('json');
    if (!(await credentials.verify(currentPassword))) {
      throw problems.badRequest('Validation failed', { currentPassword: ['Passwort ist falsch'] });
    }
    await credentials.change(newPassword);
    // Sign out everywhere, then keep this device signed in.
    sessions.revokeAll();
    startSession(c);
    logger.info('password changed, all other sessions revoked');
    return c.body(null, 204);
  });
