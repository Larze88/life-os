import { z } from 'zod';
import type { ModuleDefinition } from '../types.ts';

/** Exercise and movement. One entry per activity; `value` is the duration in minutes. */

export const ACTIVITY_INTENSITIES = [
  { value: 1, label: 'Leicht' },
  { value: 2, label: 'Mittel' },
  { value: 3, label: 'Intensiv' },
] as const;

export const activityConfigSchema = z.object({
  types: z
    .array(z.string().trim().min(1).max(40))
    .min(1)
    .max(30)
    .default(['Gehen', 'Laufen', 'Radfahren', 'Krafttraining', 'Yoga', 'Schwimmen', 'Sonstiges']),
});
export type ActivityConfig = z.infer<typeof activityConfigSchema>;

export const activityDataSchema = z.object({
  type: z.string().trim().min(1).max(40),
  intensity: z.number().int().min(1).max(3),
  distanceKm: z.number().positive().max(1000).optional(),
});
export type ActivityData = z.infer<typeof activityDataSchema>;

export const activityModule: ModuleDefinition<ActivityConfig, ActivityData> = {
  id: 'activity',
  version: 1,
  configSchema: activityConfigSchema,
  dataSchema: activityDataSchema,
  valueSchema: z
    .number()
    .int()
    .min(1)
    .max(24 * 60),
  fields: [],
  entryKind: 'instant',
  dayAssignment: 'start',
  primaryValue: { label: 'Dauer', unit: 'min', aggregate: 'sum' },
  defaultTrackers: [
    {
      key: 'activity',
      name: 'Bewegung',
      icon: 'activity',
      color: 'activity',
      config: activityConfigSchema.parse({}),
      goals: [{ metric: 'sum', period: 'day', comparator: 'gte', target: 30 }],
      widgets: [{ type: 'activity.today', size: 'md' }],
    },
  ],
};
