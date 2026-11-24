import { z } from 'zod';

export const API_PREFIX = '/api/v1';

/** RFC 9457 problem details, as returned by every API error. */
export const problemSchema = z.object({
  type: z.string().default('about:blank'),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  /** Field-level validation messages, keyed by dotted path. */
  errors: z.record(z.string(), z.array(z.string())).optional(),
});
export type Problem = z.infer<typeof problemSchema>;

export const healthSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
});
export type Health = z.infer<typeof healthSchema>;
