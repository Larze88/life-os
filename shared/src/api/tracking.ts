import { z } from 'zod';

/** Schemas for trackers, entries, goals, settings and the day summary (docs/ARCHITECTURE.md §5). */

const localDateSchema = z.iso.date();

export const settingsSchema = z.object({
  /** Start of the logical day, HH:mm (docs/DATA_MODEL.md §3). */
  dayStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
export type Settings = z.infer<typeof settingsSchema>;

export const trackerSchema = z.object({
  id: z.string(),
  key: z.string(),
  module: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  config: z.unknown(),
  sortOrder: z.number().int(),
});
export type Tracker = z.infer<typeof trackerSchema>;

export const trackerUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    config: z.unknown().optional(),
  })
  .refine((v) => v.name !== undefined || v.config !== undefined, 'Nothing to update');
export type TrackerUpdate = z.infer<typeof trackerUpdateSchema>;

export const goalSchema = z.object({
  id: z.string(),
  trackerId: z.string(),
  metric: z.enum(['sum', 'count', 'avg', 'last', 'duration']),
  period: z.enum(['day', 'week', 'month']),
  comparator: z.enum(['gte', 'lte', 'between']),
  target: z.number(),
  targetMax: z.number().nullable(),
  validFrom: localDateSchema,
  validTo: localDateSchema.nullable(),
});
export type Goal = z.infer<typeof goalSchema>;

export const goalUpdateSchema = z.object({
  target: z.number().positive().max(1_000_000),
  /** First logical day the new goal applies to; earlier days keep their old goal. */
  effectiveFrom: localDateSchema,
});
export type GoalUpdate = z.infer<typeof goalUpdateSchema>;

export const entrySourceSchema = z.enum(['manual', 'quick_action']);

export const entryUpsertSchema = z.object({
  trackerId: z.string().min(1),
  occurredAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }).nullable().default(null),
  /** Offset of the recording device in minutes east of UTC. */
  tzOffsetMin: z.number().int().min(-840).max(840),
  value: z.number().finite().nullable().default(null),
  data: z.record(z.string(), z.unknown()).default({}),
  note: z.string().trim().max(2000).nullable().default(null),
  source: entrySourceSchema.default('manual'),
});
export type EntryUpsert = z.input<typeof entryUpsertSchema>;

export const entrySchema = z.object({
  id: z.string(),
  trackerId: z.string(),
  occurredAt: z.string(),
  endsAt: z.string().nullable(),
  localDate: localDateSchema,
  tzOffsetMin: z.number().int(),
  value: z.number().nullable(),
  data: z.record(z.string(), z.unknown()),
  note: z.string().nullable(),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Entry = z.infer<typeof entrySchema>;

export const entryQuerySchema = z.object({
  trackerId: z.string().min(1).optional(),
  from: localDateSchema,
  to: localDateSchema,
});
export type EntryQuery = z.infer<typeof entryQuerySchema>;

export const widgetSchema = z.object({
  id: z.string(),
  widgetType: z.string(),
  trackerId: z.string().nullable(),
  position: z.number().int(),
  size: z.enum(['sm', 'md', 'lg']),
  config: z.unknown(),
});
export type Widget = z.infer<typeof widgetSchema>;

export const trackerDaySchema = z.object({
  tracker: trackerSchema,
  /** Aggregated primary value for the day (module's aggregate), null without entries. */
  value: z.number().nullable(),
  count: z.number().int(),
  /** Daily goal valid on that day, if any. */
  goal: goalSchema.nullable(),
});
export type TrackerDay = z.infer<typeof trackerDaySchema>;

export const daySummarySchema = z.object({
  date: localDateSchema,
  trackers: z.array(trackerDaySchema),
  widgets: z.array(widgetSchema),
});
export type DaySummary = z.infer<typeof daySummarySchema>;
