import { z } from 'zod';
import type { ModuleDefinition } from '../types.ts';

/**
 * Body values. Every measured quantity is its own tracker with a unit (weight, resting
 * pulse, blood pressure, …). `value` is the measurement; an optional second value covers
 * paired measurements such as diastolic blood pressure.
 */

export const measurementConfigSchema = z.object({
  unit: z.string().trim().min(1).max(15),
  decimals: z.number().int().min(0).max(2).default(0),
  /** Label of an optional second value, e.g. "diastolisch". */
  secondaryLabel: z.string().trim().min(1).max(30).optional(),
});
export type MeasurementConfig = z.infer<typeof measurementConfigSchema>;

export const measurementDataSchema = z.object({
  secondary: z.number().finite().optional(),
});
export type MeasurementData = z.infer<typeof measurementDataSchema>;

export const measurementModule: ModuleDefinition<MeasurementConfig, MeasurementData> = {
  id: 'measurement',
  version: 1,
  configSchema: measurementConfigSchema,
  dataSchema: measurementDataSchema,
  valueSchema: z.number().finite().min(-1_000_000).max(1_000_000),
  fields: [],
  entryKind: 'instant',
  dayAssignment: 'start',
  primaryValue: { label: 'Wert', aggregate: 'last' },
  userTrackers: true,
  defaultWidgets: [{ type: 'measurements.overview', size: 'md' }],
  defaultTrackers: [
    {
      key: 'weight',
      name: 'Gewicht',
      icon: 'scale',
      color: 'measurement',
      config: { unit: 'kg', decimals: 1 },
    },
    {
      key: 'resting-pulse',
      name: 'Ruhepuls',
      icon: 'heart-pulse',
      color: 'measurement',
      config: { unit: 'bpm', decimals: 0 },
    },
  ],
};
