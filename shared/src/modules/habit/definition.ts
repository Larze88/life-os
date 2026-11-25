import { z } from 'zod';
import { isoWeekday, type LocalDate } from '../../time/index.ts';
import type { ModuleDefinition } from '../types.ts';

/**
 * Habits. Every habit is its own tracker (created by the user); each completion is one
 * entry with value 1. A habit can be due daily or on selected weekdays, optionally
 * several times per day.
 */

export const habitScheduleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('daily') }),
  z.object({
    type: z.literal('weekdays'),
    /** ISO weekdays: Monday = 1 … Sunday = 7 */
    days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  }),
]);
export type HabitSchedule = z.infer<typeof habitScheduleSchema>;

export const habitConfigSchema = z.object({
  schedule: habitScheduleSchema.default({ type: 'daily' }),
  targetPerDay: z.number().int().min(1).max(20).default(1),
});
export type HabitConfig = z.infer<typeof habitConfigSchema>;

export const habitDataSchema = z.object({});
export type HabitData = z.infer<typeof habitDataSchema>;

export function isHabitDue(config: HabitConfig, date: LocalDate): boolean {
  return config.schedule.type === 'daily' || config.schedule.days.includes(isoWeekday(date));
}

export const habitModule: ModuleDefinition<HabitConfig, HabitData> = {
  id: 'habit',
  version: 1,
  configSchema: habitConfigSchema,
  dataSchema: habitDataSchema,
  valueSchema: z.literal(1),
  fields: [],
  entryKind: 'instant',
  dayAssignment: 'start',
  primaryValue: { label: 'Erledigt', aggregate: 'count' },
  userTrackers: true,
  defaultWidgets: [{ type: 'habits.today', size: 'md' }],
};
