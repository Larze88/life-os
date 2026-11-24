import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, NetworkError, api } from './api';

function mockFetch(response: Response | Error) {
  const fn = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('prefixes the API path and sends JSON', async () => {
    const fetchMock = mockFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await expect(api('/x', { method: 'POST', body: { a: 1 } })).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/x');
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('returns undefined for 204', async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(api('/x')).resolves.toBeUndefined();
  });

  it('parses problem details and Retry-After', async () => {
    mockFetch(
      new Response(
        JSON.stringify({ title: 'Too Many Requests', status: 429, errors: { password: ['x'] } }),
        {
          status: 429,
          headers: { 'retry-after': '120' },
        },
      ),
    );
    const err = await api('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(429);
    expect((err as ApiError).retryAfterSeconds).toBe(120);
    expect((err as ApiError).fieldErrors('password')).toEqual(['x']);
  });

  it('copes with non-JSON error bodies', async () => {
    mockFetch(new Response('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' }));
    const err = (await api('/x').catch((e: unknown) => e)) as ApiError;
    expect(err.status).toBe(502);
    expect(err.problem.title).toBe('Bad Gateway');
  });

  it('maps connection failures to NetworkError', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    await expect(api('/x')).rejects.toBeInstanceOf(NetworkError);
  });
});
