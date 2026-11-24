import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from './test/test-app.ts';

describe('app', () => {
  let ctx: TestContext;
  beforeEach(async () => {
    ctx = await createTestContext();
  });
  afterEach(() => ctx.cleanup());

  it('serves an unauthenticated health check', async () => {
    const res = await ctx.request('GET', '/api/v1/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', version: ctx.config.version });
  });

  it('returns problem+json for unknown API routes', async () => {
    const res = await ctx.request('GET', '/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await ctx.app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        host: 'localhost:5173',
        origin: 'http://localhost:5173',
        'content-type': 'application/json',
      },
      body: '{not json',
    });
    expect(res.status).toBe(400);
  });

  it('sets security headers', async () => {
    const res = await ctx.request('GET', '/api/v1/health');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  describe('origin check', () => {
    const body = { password: 'irrelevant-passwort' };

    it('rejects state-changing requests without Origin', async () => {
      const res = await ctx.request('POST', '/api/v1/auth/login', {
        body,
        headers: { origin: '' },
      });
      expect(res.status).toBe(403);
    });

    it('rejects cross-origin requests', async () => {
      const res = await ctx.request('POST', '/api/v1/auth/login', {
        body,
        headers: { origin: 'https://evil.example' },
      });
      expect(res.status).toBe(403);
    });

    it('accepts same-origin requests via Sec-Fetch-Site', async () => {
      const res = await ctx.request('POST', '/api/v1/auth/login', {
        body,
        headers: { origin: '', 'sec-fetch-site': 'same-origin' },
      });
      expect(res.status).not.toBe(403);
    });

    it('accepts the forwarded host behind a proxy', async () => {
      const res = await ctx.request('POST', '/api/v1/auth/login', {
        body,
        headers: {
          host: '127.0.0.1:8080',
          origin: 'https://lifeos.example.ts.net',
          'x-forwarded-host': 'lifeos.example.ts.net',
        },
      });
      expect(res.status).not.toBe(403);
    });
  });
});

describe('static files', () => {
  let ctx: TestContext;
  let dir: string;
  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-static-'));
    fs.mkdirSync(path.join(dir, 'assets'));
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Life OS</title>');
    fs.writeFileSync(path.join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
    ctx = await createTestContext({ staticDir: dir });
  });
  afterEach(() => {
    ctx.cleanup();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('serves index.html for client-side routes without caching', async () => {
    const res = await ctx.request('GET', '/einstellungen');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  it('serves hashed assets as immutable', async () => {
    const res = await ctx.request('GET', '/assets/app-abc123.js');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('immutable');
  });

  it('does not fall back for missing files and blocks traversal', async () => {
    expect((await ctx.request('GET', '/assets/missing.js')).status).toBe(404);
    expect((await ctx.request('GET', '/..%2f..%2fetc%2fpasswd')).status).toBe(404);
  });

  it('never serves the SPA for API paths', async () => {
    expect((await ctx.request('GET', '/api/v1/unknown')).status).toBe(404);
  });
});
