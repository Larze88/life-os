import { z } from 'zod';

/** Statistics API (phase 4). All series are per logical day (`local_date`). */

const localDate = z.iso.date();

export const STATS_MAX_DAYS = 366;
/** Minimum number of shared days before a correlation coefficient is shown. */
export const CORRELATION_MIN_DAYS = 14;

export const statsSeriesQuerySchema = z.object({
  trackerId: z.string().min(1),
  from: localDate,
  to: localDate,
});

export const statsDaySchema = z.object({
  date: localDate,
  /** Aggregated value of the day (module aggregate), null without entries. */
  value: z.number().nullable(),
  count: z.number().int(),
  /** Whether the day's goal/completion was met; null if not applicable (no goal, not due, no data). */
  met: z.boolean().nullable(),
});
export type StatsDay = z.infer<typeof statsDaySchema>;

export const statsSeriesSchema = z.object({
  trackerId: z.string(),
  aggregate: z.enum(['sum', 'avg', 'last', 'count', 'max']),
  /** Daily target valid on the last day (goal or habit completion), for the goal line. */
  goalTarget: z.number().nullable(),
  days: z.array(statsDaySchema),
  summary: z.object({
    /** Mean per day: for sum/count over all days of the period, otherwise over days with data. */
    average: z.number().nullable(),
    min: z.number().nullable(),
    max: z.number().nullable(),
    total: z.number().nullable(),
    daysWithData: z.number().int(),
    goal: z.object({ met: z.number().int(), evaluated: z.number().int() }).nullable(),
  }),
  streak: z.object({ current: z.number().int(), longest: z.number().int() }).nullable(),
});
export type StatsSeries = z.infer<typeof statsSeriesSchema>;

export const correlationQuerySchema = z.object({
  a: z.string().min(1),
  b: z.string().min(1),
  from: localDate,
  to: localDate,
  /** Pair A on day d with B on day d + lag (e.g. exercise today → sleep the next night). */
  lag: z.coerce.number().int().min(0).max(1).default(0),
});

export const correlationSchema = z.object({
  n: z.number().int(),
  /** Spearman rank correlation, null below CORRELATION_MIN_DAYS or without variance. */
  rho: z.number().nullable(),
  pairs: z.array(z.object({ date: localDate, a: z.number(), b: z.number() })),
});
export type Correlation = z.infer<typeof correlationSchema>;
