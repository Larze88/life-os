import { describe, expect, it } from 'vitest';
import {
  customBehaviour,
  customConfigSchema,
  nextFieldKey,
  validateCustomConfigChange,
  type CustomConfig,
} from './definition.ts';
import { isZeroWhenMissing } from '../../stats/zero-fill.ts';
import { customModule } from './definition.ts';

const coffee = customConfigSchema.parse({
  fields: [
    { key: 'f1', label: 'Tassen', type: 'number', min: 0, unit: 'Tassen', required: true },
    { key: 'f2', label: 'Art', type: 'select', options: ['Kaffee', 'Espresso'] },
  ],
  primaryField: 'f1',
  aggregate: 'sum',
});

describe('custom trackers', () => {
  it('validates the configuration', () => {
    expect(customConfigSchema.safeParse({ fields: [] }).success).toBe(false);
    // Text cannot be the primary value.
    expect(
      customConfigSchema.safeParse({
        fields: [{ key: 'f1', label: 'Notiz', type: 'text' }],
        primaryField: 'f1',
        aggregate: 'sum',
      }).success,
    ).toBe(false);
    // Without primary value only counting makes sense.
    expect(
      customConfigSchema.safeParse({
        fields: [{ key: 'f1', label: 'Notiz', type: 'text' }],
        aggregate: 'avg',
      }).success,
    ).toBe(false);
    expect(
      customConfigSchema.safeParse({ fields: [{ key: 'f1', label: 'Notiz', type: 'text' }] })
        .success,
    ).toBe(true);
    expect(
      customConfigSchema.safeParse({
        fields: [{ key: 'f1', label: 'A', type: 'select', options: ['x', 'x'] }],
      }).success,
    ).toBe(false);
  });

  it('validates entries against the tracker fields and derives the primary value', () => {
    const b = customBehaviour(coffee);
    expect(b.dataSchema!.safeParse({ f1: 2, f2: 'Espresso' }).success).toBe(true);
    expect(b.dataSchema!.safeParse({ f2: 'Kaffee' }).success).toBe(false); // required
    expect(b.dataSchema!.safeParse({ f1: 1, f2: 'Tee' }).success).toBe(false); // unknown option
    expect(b.deriveValue!({ occurredAt: '', endsAt: null, data: { f1: 3 } })).toBe(3);
    expect(b.aggregate).toBe('sum');
  });

  it('counts yes/no as 1/0', () => {
    const config = customConfigSchema.parse({
      fields: [{ key: 'f1', label: 'Genommen', type: 'boolean', required: true }],
      primaryField: 'f1',
      aggregate: 'max',
    });
    const b = customBehaviour(config);
    expect(b.deriveValue!({ occurredAt: '', endsAt: null, data: { f1: true } })).toBe(1);
    expect(b.deriveValue!({ occurredAt: '', endsAt: null, data: { f1: false } })).toBe(0);
  });

  it('protects existing entries when the configuration changes', () => {
    const withField = (fields: CustomConfig['fields']): CustomConfig => ({ ...coffee, fields });
    expect(
      validateCustomConfigChange(
        coffee,
        withField([
          ...coffee.fields,
          { key: 'f3', label: 'Uhrzeit', type: 'time', required: false, deprecated: false },
        ]),
      ),
    ).toBeNull();
    expect(validateCustomConfigChange(coffee, withField([coffee.fields[0]!]))).toMatch(
      /nicht gelöscht/,
    );
    expect(
      validateCustomConfigChange(
        coffee,
        withField([{ ...coffee.fields[0]!, label: 'Becher' }, coffee.fields[1]!]),
      ),
    ).toBeNull();
    expect(
      validateCustomConfigChange(
        coffee,
        withField([
          coffee.fields[0]!,
          {
            key: 'f2',
            label: 'Art',
            type: 'select',
            options: ['Kaffee'],
            required: false,
            deprecated: false,
          },
        ]),
      ),
    ).toMatch(/nur ergänzt/);
    expect(
      validateCustomConfigChange(
        coffee,
        withField([
          coffee.fields[0]!,
          {
            key: 'f2',
            label: 'Art',
            type: 'text',
            maxLength: 50,
            multiline: false,
            required: false,
            deprecated: false,
          },
        ]),
      ),
    ).toMatch(/Typ/);
    expect(
      validateCustomConfigChange(coffee, {
        ...coffee,
        primaryField: undefined,
        aggregate: 'count',
      }),
    ).toMatch(/Hauptwert/);
  });

  it('generates unique, never reused field keys', () => {
    expect(nextFieldKey([])).toBe('f1');
    expect(nextFieldKey([{ key: 'f1' }, { key: 'f4' }])).toBe('f5');
  });

  it('treats missing days per tracker aggregate', () => {
    expect(isZeroWhenMissing(customModule, coffee)).toBe(true);
    expect(isZeroWhenMissing(customModule, { ...coffee, aggregate: 'avg' })).toBe(false);
  });
});
