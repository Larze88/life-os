import { z } from 'zod';
import type { ModuleDefinition } from '../types.ts';

/** Meals. One entry per meal; no primary value (the day counts meals). */

export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Frühstück' },
  { value: 'lunch', label: 'Mittagessen' },
  { value: 'dinner', label: 'Abendessen' },
  { value: 'snack', label: 'Snack' },
] as const;

export const mealConfigSchema = z.object({
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(30)
    .default(['selbst gekocht', 'auswärts', 'Fast Food', 'vegetarisch', 'viel Gemüse', 'süß']),
});
export type MealConfig = z.infer<typeof mealConfigSchema>;

export const mealDataSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  description: z.string().trim().max(200).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});
export type MealData = z.infer<typeof mealDataSchema>;

export const mealModule: ModuleDefinition<MealConfig, MealData> = {
  id: 'meal',
  version: 1,
  configSchema: mealConfigSchema,
  dataSchema: mealDataSchema,
  valueSchema: z.null(),
  fields: [],
  entryKind: 'instant',
  dayAssignment: 'start',
  primaryValue: { label: 'Mahlzeiten', aggregate: 'count' },
  defaultTrackers: [
    {
      key: 'meals',
      name: 'Ernährung',
      icon: 'utensils',
      color: 'meal',
      config: mealConfigSchema.parse({}),
      widgets: [{ type: 'meals.today', size: 'md' }],
    },
  ],
};
