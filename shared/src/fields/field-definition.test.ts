import { describe, expect, it } from 'vitest';
import { buildDataSchema, fieldListSchema, type FieldDefinitionInput } from './field-definition.ts';

const fields: FieldDefinitionInput[] = [
  { key: 'cups', label: 'Tassen', type: 'number', min: 0, required: true },
  { key: 'kind', label: 'Art', type: 'select', options: ['Kaffee', 'Tee'] },
  { key: 'mood', label: 'Stimmung', type: 'scale', min: 1, max: 5 },
  { key: 'old', label: 'Alt', type: 'boolean', required: true, deprecated: true },
];

describe('field system', () => {
  const parsed = fieldListSchema.parse(fields);
  const schema = buildDataSchema(parsed);

  it('applies defaults when parsing definitions', () => {
    expect(parsed[1]?.required).toBe(false);
  });

  it('accepts valid payloads and strips unknown keys', () => {
    expect(schema.parse({ cups: 2, kind: 'Tee', extra: 1 })).toEqual({ cups: 2, kind: 'Tee' });
  });

  it('enforces required fields, ranges and options', () => {
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ cups: -1 }).success).toBe(false);
    expect(schema.safeParse({ cups: 1, kind: 'Saft' }).success).toBe(false);
    expect(schema.safeParse({ cups: 1, mood: 6 }).success).toBe(false);
    expect(schema.safeParse({ cups: 1, mood: 2.5 }).success).toBe(false);
  });

  it('keeps deprecated fields optional', () => {
    expect(schema.safeParse({ cups: 1 }).success).toBe(true);
  });

  it('rejects duplicate and malformed keys', () => {
    expect(fieldListSchema.safeParse([fields[0], fields[0]]).success).toBe(false);
    expect(
      fieldListSchema.safeParse([{ key: 'Bad Key', label: 'x', type: 'boolean' }]).success,
    ).toBe(false);
  });
});
