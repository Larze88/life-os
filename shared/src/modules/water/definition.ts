import { z } from 'zod';
import type { ModuleDefinition } from '../types.ts';

/** Water intake. One entry per drink; `value` is the amount in ml. */

export const WATER_MAX_ENTRY_ML = 5000;

export const waterConfigSchema = z.object({
  unit: z.literal('ml').default('ml'),
  /** Buttons shown on the dashboard, e.g. [250, 500]. */
  quickAmounts: z.array(z.number().int().min(10).max(2000)).min(1).max(4).default([250, 500]),
});
export type WaterConfig = z.infer<typeof waterConfigSchema>;

export const waterDataSchema = z.object({
  /** Optional beverage, reserved for later (tea, coffee, …). */
  beverage: z.string().max(40).optional(),
});
export type WaterData = z.infer<typeof waterDataSchema>;

export const waterModule: ModuleDefinition<WaterConfig, WaterData> = {
  id: 'water',
  version: 1,
  configSchema: waterConfigSchema,
  dataSchema: waterDataSchema,
  valueSchema: z.number().int('Ganze Milliliter').min(1).max(WATER_MAX_ENTRY_ML),
  fields: [],
  entryKind: 'instant',
  dayAssignment: 'start',
  primaryValue: { label: 'Menge', unit: 'ml', aggregate: 'sum' },
  defaultTrackers: [
    {
      key: 'water',
      name: 'Wasser',
      icon: 'droplet',
      color: 'water',
      config: { unit: 'ml', quickAmounts: [250, 500] },
      goals: [{ metric: 'sum', period: 'day', comparator: 'gte', target: 2000 }],
      widgets: [{ type: 'water.progress', size: 'md' }],
    },
  ],
};
