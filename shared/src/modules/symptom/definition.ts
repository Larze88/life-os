import { z } from 'zod';
import type { ModuleDefinition } from '../types.ts';

/**
 * Health complaints and symptoms. `value` is the subjective intensity 1–10.
 * Purely descriptive — no medical interpretation (CLAUDE.md rule 8).
 */

export const symptomConfigSchema = z.object({
  catalog: z
    .array(z.string().trim().min(1).max(60))
    .max(50)
    .default([
      'Kopfschmerzen',
      'Rückenschmerzen',
      'Bauchschmerzen',
      'Müdigkeit',
      'Übelkeit',
      'Erkältung',
    ]),
});
export type SymptomConfig = z.infer<typeof symptomConfigSchema>;

export const symptomDataSchema = z.object({
  symptom: z.string().trim().min(1).max(60),
});
export type SymptomData = z.infer<typeof symptomDataSchema>;

export const symptomModule: ModuleDefinition<SymptomConfig, SymptomData> = {
  id: 'symptom',
  version: 1,
  configSchema: symptomConfigSchema,
  dataSchema: symptomDataSchema,
  valueSchema: z.number().int().min(1).max(10),
  fields: [],
  entryKind: 'instant',
  dayAssignment: 'start',
  primaryValue: { label: 'Stärkste Beschwerde', aggregate: 'max' },
  defaultTrackers: [
    {
      key: 'symptoms',
      name: 'Beschwerden',
      icon: 'stethoscope',
      color: 'symptom',
      config: symptomConfigSchema.parse({}),
      widgets: [{ type: 'symptoms.today', size: 'md' }],
    },
  ],
};
