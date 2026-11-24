import { describe, expect, it } from 'vitest';
import { waterConfigSchema, waterModule } from './definition.ts';

describe('water module', () => {
  it('accepts sensible amounts and rejects nonsense', () => {
    expect(waterModule.valueSchema.safeParse(250).success).toBe(true);
    expect(waterModule.valueSchema.safeParse(0).success).toBe(false);
    expect(waterModule.valueSchema.safeParse(-100).success).toBe(false);
    expect(waterModule.valueSchema.safeParse(12.5).success).toBe(false);
    expect(waterModule.valueSchema.safeParse(10_000).success).toBe(false);
    expect(waterModule.valueSchema.safeParse(null).success).toBe(false);
  });

  it('validates quick amounts', () => {
    expect(waterConfigSchema.parse({})).toEqual({ unit: 'ml', quickAmounts: [250, 500] });
    expect(waterConfigSchema.safeParse({ quickAmounts: [] }).success).toBe(false);
    expect(waterConfigSchema.safeParse({ quickAmounts: [1, 2, 3, 4, 5] }).success).toBe(false);
  });

  it('ships a default tracker with a daily goal and a widget', () => {
    const seed = waterModule.defaultTrackers?.[0];
    expect(seed?.key).toBe('water');
    expect(waterConfigSchema.safeParse(seed?.config).success).toBe(true);
    expect(seed?.goals?.[0]).toMatchObject({ metric: 'sum', period: 'day', target: 2000 });
    expect(seed?.widgets?.[0]?.type).toBe('water.progress');
  });
});
