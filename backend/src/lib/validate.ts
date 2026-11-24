import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { z } from 'zod';
import { problems, zodErrorsToRecord } from './problem.ts';

/** Zod validation that fails with an RFC 9457 problem (400) instead of Hono's default. */
export function validate<T extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      throw problems.badRequest('Validation failed', zodErrorsToRecord(result.error));
    }
  });
}
