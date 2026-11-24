import { vi } from 'vitest';

export type MockHandler = (url: URL, init: RequestInit | undefined) => Response | Promise<Response>;

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/**
 * Stubs fetch. Routes are "METHOD /path" with optional trailing "*" as prefix wildcard,
 * e.g. "GET /api/v1/days/*". Unmatched requests return 404 problem+json.
 */
export function mockApi(routes: Record<string, MockHandler>) {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    const method = init?.method ?? 'GET';
    for (const [pattern, handler] of Object.entries(routes)) {
      const [m, p] = pattern.split(' ') as [string, string];
      if (m !== method) continue;
      if (p.endsWith('*') ? url.pathname.startsWith(p.slice(0, -1)) : url.pathname === p)
        return handler(url, init);
    }
    return json({ title: 'Not Found', status: 404 }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
