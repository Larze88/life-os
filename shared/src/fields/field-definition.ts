import { z } from 'zod';

/**
 * Declarative field system shared by built-in modules and custom trackers.
 * The frontend renders forms from it, the backend derives validation schemas.
 * Field keys are immutable once used (CLAUDE.md rule 4).
 */

export const fieldKeySchema = z
  .string()
  .regex(
    /^[a-z][a-zA-Z0-9]{0,39}$/,
    'Field keys are camelCase, start with a letter, max. 40 chars',
  );

const baseField = {
  key: fieldKeySchema,
  label: z.string().min(1).max(60),
  required: z.boolean().default(false),
  help: z.string().max(200).optional(),
  /** Hidden in forms, existing data stays valid. Never delete fields. */
  deprecated: z.boolean().default(false),
};

const optionsSchema = z.array(z.string().min(1).max(60)).min(1).max(50);

export const fieldDefinitionSchema = z.discriminatedUnion('type', [
  z.object({
    ...baseField,
    type: z.literal('number'),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    unit: z.string().max(20).optional(),
  }),
  z.object({
    ...baseField,
    type: z.literal('scale'),
    min: z.number().int(),
    max: z.number().int(),
    labels: z.record(z.string(), z.string()).optional(),
  }),
  z.object({ ...baseField, type: z.literal('boolean') }),
  z.object({ ...baseField, type: z.literal('select'), options: optionsSchema }),
  z.object({ ...baseField, type: z.literal('multiselect'), options: optionsSchema }),
  z.object({
    ...baseField,
    type: z.literal('text'),
    maxLength: z.number().int().positive().max(5000).default(500),
    multiline: z.boolean().default(false),
  }),
  z.object({ ...baseField, type: z.literal('date') }),
  z.object({ ...baseField, type: z.literal('time') }),
  z.object({
    ...baseField,
    type: z.literal('duration'),
    maxMinutes: z.number().int().positive().optional(),
  }),
]);

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;
export type FieldDefinitionInput = z.input<typeof fieldDefinitionSchema>;
export type FieldType = FieldDefinition['type'];

export const fieldListSchema = z
  .array(fieldDefinitionSchema)
  .max(30)
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    for (const field of fields) {
      if (seen.has(field.key)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate field key: ${field.key}` });
      }
      seen.add(field.key);
    }
  });

function valueSchemaFor(field: FieldDefinition): z.ZodType {
  switch (field.type) {
    case 'number': {
      let schema = z.number().finite();
      if (field.min !== undefined) schema = schema.min(field.min);
      if (field.max !== undefined) schema = schema.max(field.max);
      return schema;
    }
    case 'scale':
      return z.number().int().min(field.min).max(field.max);
    case 'boolean':
      return z.boolean();
    case 'select':
      return z.enum(field.options as [string, ...string[]]);
    case 'multiselect':
      return z.array(z.enum(field.options as [string, ...string[]]));
    case 'text':
      return z.string().max(field.maxLength);
    case 'date':
      return z.iso.date();
    case 'time':
      return z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
    case 'duration': {
      const schema = z.number().int().min(0);
      return field.maxMinutes === undefined ? schema : schema.max(field.maxMinutes);
    }
  }
}

/**
 * Builds the validation schema for an entry payload from a field list.
 * Unknown keys are stripped; deprecated fields stay optional so old data remains valid.
 */
export function buildDataSchema(fields: readonly FieldDefinition[]) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    const value = valueSchemaFor(field);
    shape[field.key] = field.required && !field.deprecated ? value : value.optional();
  }
  return z.object(shape);
}
