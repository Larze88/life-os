import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, sessionCookie, type TestContext } from '../test/test-app.ts';

const PASSWORD = 'ein-sicheres-passwort';

describe('auth API', () => {
  let ctx: TestContext;
  beforeEach(async () => {
    ctx = await createTestContext();
  });
  afterEach(() => ctx.cleanup());

  async function setup(): Promise<string> {
    const res = await ctx.request('POST', '/api/v1/auth/setup', { body: { password: PASSWORD } });
    expect(res.status).toBe(204);
    const cookie = sessionCookie(res);
    expect(cookie).toBeDefined();
    return cookie!;
  }

  it('reports setup required on a fresh database', async () => {
    const res = await ctx.request('GET', '/api/v1/auth/status');
    expect(await res.json()).toEqual({ setupRequired: true, authenticated: false });
  });

  it('sets the initial password once and signs in', async () => {
    const cookie = await setup();
    const status = await ctx.request('GET', '/api/v1/auth/status', { cookie });
    expect(await status.json()).toEqual({ setupRequired: false, authenticated: true });

    const again = await ctx.request('POST', '/api/v1/auth/setup', {
      body: { password: 'anderes-passwort' },
    });
    expect(again.status).toBe(409);
  });

  it('sets a hardened session cookie', async () => {
    const res = await ctx.request('POST', '/api/v1/auth/setup', { body: { password: PASSWORD } });
    const header = res.headers.get('set-cookie') ?? '';
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=Lax/i);
    expect(header).toMatch(/Path=\//);
  });

  it('rejects weak initial passwords with a problem response', async () => {
    const res = await ctx.request('POST', '/api/v1/auth/setup', { body: { password: 'kurz' } });
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    const body = (await res.json()) as { errors: Record<string, string[]> };
    expect(body.errors.password).toBeDefined();
  });

  it('logs in and out', async () => {
    await setup();
    const wrong = await ctx.request('POST', '/api/v1/auth/login', { body: { password: 'falsch' } });
    expect(wrong.status).toBe(401);

    const ok = await ctx.request('POST', '/api/v1/auth/login', { body: { password: PASSWORD } });
    expect(ok.status).toBe(204);
    const cookie = sessionCookie(ok)!;

    const out = await ctx.request('POST', '/api/v1/auth/logout', { cookie });
    expect(out.status).toBe(204);
    const status = await ctx.request('GET', '/api/v1/auth/status', { cookie });
    expect(((await status.json()) as { authenticated: boolean }).authenticated).toBe(false);
  });

  it('rate-limits failed logins', async () => {
    await setup();
    for (let i = 0; i < 5; i++) {
      await ctx.request('POST', '/api/v1/auth/login', { body: { password: 'falsch' } });
    }
    const blocked = await ctx.request('POST', '/api/v1/auth/login', {
      body: { password: PASSWORD },
    });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('protects session management', async () => {
    expect((await ctx.request('GET', '/api/v1/auth/sessions')).status).toBe(401);

    const cookie = await setup();
    const second = sessionCookie(
      await ctx.request('POST', '/api/v1/auth/login', { body: { password: PASSWORD } }),
    )!;
    const res = await ctx.request('GET', '/api/v1/auth/sessions', { cookie });
    const list = (await res.json()) as { id: string; current: boolean }[];
    expect(list).toHaveLength(2);
    expect(list.filter((s) => s.current)).toHaveLength(1);

    const other = list.find((s) => !s.current)!;
    expect(
      (await ctx.request('DELETE', `/api/v1/auth/sessions/${other.id}`, { cookie })).status,
    ).toBe(204);
    const status = await ctx.request('GET', '/api/v1/auth/status', { cookie: second });
    expect(((await status.json()) as { authenticated: boolean }).authenticated).toBe(false);
  });

  it('changes the password and revokes other sessions', async () => {
    const cookie = await setup();
    const other = sessionCookie(
      await ctx.request('POST', '/api/v1/auth/login', { body: { password: PASSWORD } }),
    )!;

    const wrong = await ctx.request('POST', '/api/v1/auth/password', {
      cookie,
      body: { currentPassword: 'falsch', newPassword: 'neues-sicheres-passwort' },
    });
    expect(wrong.status).toBe(400);

    const res = await ctx.request('POST', '/api/v1/auth/password', {
      cookie,
      body: { currentPassword: PASSWORD, newPassword: 'neues-sicheres-passwort' },
    });
    expect(res.status).toBe(204);
    const newCookie = sessionCookie(res)!;

    const otherStatus = await ctx.request('GET', '/api/v1/auth/status', { cookie: other });
    expect(((await otherStatus.json()) as { authenticated: boolean }).authenticated).toBe(false);
    const ownStatus = await ctx.request('GET', '/api/v1/auth/status', { cookie: newCookie });
    expect(((await ownStatus.json()) as { authenticated: boolean }).authenticated).toBe(true);

    const login = await ctx.request('POST', '/api/v1/auth/login', {
      body: { password: 'neues-sicheres-passwort' },
    });
    expect(login.status).toBe(204);
  });
});
