import { z } from 'zod';
import {
  buildDataSchema,
  fieldDefinitionSchema,
  fieldKeySchema,
  type FieldDefinition,
} from '../../fields/index.ts';
import type { ModuleDefinition, TrackerBehaviour } from '../types.ts';

/**
 * User-defined trackers ("Eigene Tracker"). Each tracker brings its own fields (field
 * system, docs/DATA_MODEL.md §5); one numeric field can be the primary value, which is
 * aggregated per day as configured. ADR-041.
 */

/** Field types that can serve as the primary (numeric) value. */
export const PRIMARY_FIELD_TYPES = ['number', 'scale', 'duration', 'boolean'] as const;

export const CUSTOM_AGGREGATES = ['sum', 'avg', 'last', 'max', 'count'] as const;

export const customConfigSchema = z
  .object({
    fields: z.array(fieldDefinitionSchema).min(1).max(12),
    /** Field whose value becomes `entries.value`; none = only the number of entries counts. */
    primaryField: fieldKeySchema.optional(),
    aggregate: z.enum(CUSTOM_AGGREGATES).default('count'),
  })
  .superRefine((config, ctx) => {
    const keys = new Set<string>();
    for (const field of config.fields) {
      if (keys.has(field.key))
        ctx.addIssue({
          code: 'custom',
          message: `Doppelter Feldschlüssel: ${field.key}`,
          path: ['fields'],
        });
      keys.add(field.key);
      if (
        (field.type === 'select' || field.type === 'multiselect') &&
        new Set(field.options).size !== field.options.length
      ) {
        ctx.addIssue({
          code: 'custom',
          message: `Doppelte Auswahlmöglichkeit in „${field.label}“`,
          path: ['fields'],
        });
      }
      if (field.type === 'scale' && field.min >= field.max) {
        ctx.addIssue({
          code: 'custom',
          message: `Ungültige Skala in „${field.label}“`,
          path: ['fields'],
        });
      }
    }
    if (config.primaryField) {
      const primary = config.fields.find((f) => f.key === config.primaryField);
      if (!primary || !(PRIMARY_FIELD_TYPES as readonly string[]).includes(primary.type)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Der Hauptwert muss ein Zahl-, Skala-, Dauer- oder Ja/Nein-Feld sein',
          path: ['primaryField'],
        });
      }
    } else if (config.aggregate !== 'count') {
      ctx.addIssue({
        code: 'custom',
        message: 'Ohne Hauptwert kann nur die Anzahl der Einträge gezählt werden',
        path: ['aggregate'],
      });
    }
  });
export type CustomConfig = z.infer<typeof customConfigSchema>;

/** Primary value of an entry: numbers as they are, Ja/Nein as 1/0, missing as null. */
export function customPrimaryValue(
  config: CustomConfig,
  data: Record<string, unknown>,
): number | null {
  if (!config.primaryField) return null;
  const v = data[config.primaryField];
  if (typeof v === 'boolean') return v ? 1 : 0;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function customBehaviour(config: CustomConfig): TrackerBehaviour {
  return {
    dataSchema: buildDataSchema(config.fields),
    deriveValue: ({ data }) => customPrimaryValue(config, data),
    aggregate: config.aggregate,
  };
}

/**
 * Existing entries must stay valid (CLAUDE.md rule 4): fields are never removed or
 * retyped, choices are only added, scales keep their range, the primary field is fixed.
 */
export function validateCustomConfigChange(
  previous: CustomConfig,
  next: CustomConfig,
): string | null {
  for (const old of previous.fields) {
    const now = next.fields.find((f) => f.key === old.key);
    if (!now)
      return `Das Feld „${old.label}“ kann nicht gelöscht werden – blende es stattdessen aus.`;
    if (now.type !== old.type)
      return `Der Typ des Feldes „${old.label}“ kann nicht geändert werden.`;
    if (
      (old.type === 'select' || old.type === 'multiselect') &&
      (now.type === 'select' || now.type === 'multiselect')
    ) {
      const missing = old.options.filter((o) => !now.options.includes(o));
      if (missing.length)
        return `Auswahlmöglichkeiten von „${old.label}“ können nur ergänzt werden (fehlt: ${missing.join(', ')}).`;
    }
    if (
      old.type === 'scale' &&
      now.type === 'scale' &&
      (old.min !== now.min || old.max !== now.max)
    ) {
      return `Der Bereich der Skala „${old.label}“ kann nicht geändert werden.`;
    }
  }
  if (previous.primaryField !== next.primaryField)
    return 'Der Hauptwert kann nachträglich nicht geändert werden.';
  return null;
}

/** Next unused field key ("f1", "f2", …); keys are never reused. */
export function nextFieldKey(fields: readonly Pick<FieldDefinition, 'key'>[]): string {
  const used = fields.map((f) => Number(/^f(\d+)$/.exec(f.key)?.[1] ?? 0));
  return `f${Math.max(0, ...used) + 1}`;
}

export const customModule: ModuleDefinition<CustomConfig, Record<string, unknown>> = {
  id: 'custom',
  version: 1,
  configSchema: customConfigSchema,
  // Real validation happens per tracker (forTracker); this is the generic fallback.
  dataSchema: z.record(z.string(), z.unknown()),
  valueSchema: z.number().finite().nullable(),
  fields: [],
  entryKind: 'instant',
  dayAssignment: 'start',
  primaryValue: { label: 'Wert', aggregate: 'count' },
  userTrackers: true,
  userTrackerWidget: { type: 'custom.tracker', size: 'md' },
  forTracker: customBehaviour,
  validateConfigChange: validateCustomConfigChange,
};
