import { z } from 'zod';
import type { ModuleDefinition } from '../types.ts';

/**
 * Sleep. One entry per sleep period (start = bedtime, end = wake-up). The period counts
 * for the wake-up day ("last night"); `value` is the duration in minutes, computed by
 * the server from start and end.
 */

export const SLEEP_MAX_MINUTES = 20 * 60;

export const sleepConfigSchema = z.object({});
export type SleepConfig = z.infer<typeof sleepConfigSchema>;

export const sleepDataSchema = z.object({
  quality: z.number().int().min(1).max(5),
  rested: z.number().int().min(1).max(5).optional(),
});
export type SleepData = z.infer<typeof sleepDataSchema>;

export function sleepDurationMinutes(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 60_000);
}

export const sleepModule: ModuleDefinition<SleepConfig, SleepData> = {
  id: 'sleep',
  version: 1,
  configSchema: sleepConfigSchema,
  dataSchema: sleepDataSchema,
  valueSchema: z.number().int().min(1).max(SLEEP_MAX_MINUTES, 'Höchstens 20 Stunden'),
  deriveValue: ({ occurredAt, endsAt }) =>
    endsAt ? sleepDurationMinutes(occurredAt, endsAt) : null,
  fields: [
    {
      key: 'quality',
      label: 'Schlafqualität',
      type: 'scale',
      min: 1,
      max: 5,
      required: true,
      deprecated: false,
    },
    {
      key: 'rested',
      label: 'Ausgeruht',
      type: 'scale',
      min: 1,
      max: 5,
      required: false,
      deprecated: false,
    },
  ],
  entryKind: 'span',
  dayAssignment: 'end',
  primaryValue: { label: 'Schlafdauer', unit: 'min', aggregate: 'sum' },
  defaultTrackers: [
    {
      key: 'sleep',
      name: 'Schlaf',
      icon: 'moon',
      color: 'sleep',
      config: {},
      goals: [{ metric: 'sum', period: 'day', comparator: 'gte', target: 7 * 60 }],
      widgets: [{ type: 'sleep.last_night', size: 'md' }],
    },
  ],
};
