import { API_PREFIX, problemSchema, type Problem } from '@lifeos/shared';

/** Error for non-2xx API responses, carrying the RFC 9457 problem details. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem;
  readonly retryAfterSeconds: number | undefined;

  constructor(status: number, problem: Problem, retryAfterSeconds?: number) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  fieldErrors(field: string): string[] {
    return this.problem.errors?.[field] ?? [];
  }
}

/** The server could not be reached at all (offline, Tailscale down, server stopped). */
export class NetworkError extends Error {
  constructor() {
    super('Network request failed');
    this.name = 'NetworkError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T = void>(
  path: string,
  { method = 'GET', body, signal }: RequestOptions = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_PREFIX}${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new NetworkError();
  }

  if (!res.ok) {
    let problem: Problem = {
      type: 'about:blank',
      title: res.statusText || 'Error',
      status: res.status,
    };
    try {
      const parsed = problemSchema.safeParse(await res.json());
      if (parsed.success) problem = parsed.data;
    } catch {
      // Non-JSON error body (e.g. proxy error page) — keep the generic problem.
    }
    const retryAfter = Number(res.headers.get('retry-after'));
    throw new ApiError(
      res.status,
      problem,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
