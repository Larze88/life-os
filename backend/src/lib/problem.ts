import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Problem } from '@lifeos/shared';
import type { $ZodError } from 'zod/v4/core';

/** Error that is rendered as an RFC 9457 problem response. */
export class HttpProblem extends Error {
  readonly status: ContentfulStatusCode;
  readonly title: string;
  readonly detail: string | undefined;
  readonly errors: Record<string, string[]> | undefined;
  readonly headers: Record<string, string> | undefined;

  constructor(
    status: ContentfulStatusCode,
    title: string,
    options: {
      detail?: string;
      errors?: Record<string, string[]>;
      headers?: Record<string, string>;
    } = {},
  ) {
    super(title);
    this.status = status;
    this.title = title;
    this.detail = options.detail;
    this.errors = options.errors;
    this.headers = options.headers;
  }
}

export function problemResponse(c: Context, problem: HttpProblem): Response {
  const body: Problem = {
    type: 'about:blank',
    title: problem.title,
    status: problem.status,
    ...(problem.detail ? { detail: problem.detail } : {}),
    ...(problem.errors ? { errors: problem.errors } : {}),
  };
  for (const [name, value] of Object.entries(problem.headers ?? {})) c.header(name, value);
  c.header('Content-Type', 'application/problem+json');
  return c.body(JSON.stringify(body), problem.status);
}

/** Converts Zod issues into `{ "path.to.field": ["message"] }`. */
export function zodErrorsToRecord(error: $ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

export const problems = {
  badRequest: (detail?: string, errors?: Record<string, string[]>) =>
    new HttpProblem(400, 'Bad Request', {
      ...(detail ? { detail } : {}),
      ...(errors ? { errors } : {}),
    }),
  unauthorized: () => new HttpProblem(401, 'Unauthorized'),
  forbidden: (detail?: string) => new HttpProblem(403, 'Forbidden', detail ? { detail } : {}),
  notFound: () => new HttpProblem(404, 'Not Found'),
  conflict: (detail?: string) => new HttpProblem(409, 'Conflict', detail ? { detail } : {}),
  tooManyRequests: (retryAfterSeconds: number) =>
    new HttpProblem(429, 'Too Many Requests', {
      detail: 'Zu viele Versuche. Bitte später erneut versuchen.',
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }),
};
