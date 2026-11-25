import { z } from 'zod';
import type { ModuleDefinition } from '../types.ts';

/** Focus and productivity. One entry per focus session; `value` is the duration in minutes. */

const scale = z.number().int().min(1).max(5);

export const focusConfigSchema = z.object({});
export type FocusConfig = z.infer<typeof focusConfigSchema>;

export const focusDataSchema = z.object({
  concentration: scale.optional(),
  productivity: scale.optional(),
  task: z.string().trim().max(100).optional(),
});
export type FocusData = z.infer<typeof focusDataSchema>;

export const focusModule: ModuleDefinition<FocusConfig, FocusData> = {
  id: 'focus',
  version: 1,
  configSchema: focusConfigSchema,
  dataSchema: focusDataSchema,
  valueSchema: z
    .number()
    .int()
    .min(1)
    .max(16 * 60),
  fields: [],
  entryKind: 'instant',
  dayAssignment: 'start',
  primaryValue: { label: 'Fokuszeit', unit: 'min', aggregate: 'sum' },
  defaultTrackers: [
    {
      key: 'focus',
      name: 'Fokus',
      icon: 'target',
      color: 'focus',
      config: {},
      widgets: [{ type: 'focus.today', size: 'md' }],
    },
  ],
};
