import { describe, expect, it } from 'vitest';
import { activityConfigSchema, activityModule } from './activity/definition.ts';
import { focusModule } from './focus/definition.ts';
import { mealModule } from './meal/definition.ts';
import { measurementConfigSchema, measurementModule } from './measurement/definition.ts';
import { moduleRegistry } from './registry.ts';
import { symptomModule } from './symptom/definition.ts';

describe('phase 3b modules', () => {
  it('registers all modules with unique ids', () => {
    expect(moduleRegistry.all.map((m) => m.id)).toEqual([
      'water',
      'mood',
      'sleep',
      'habit',
      'activity',
      'meal',
      'measurement',
      'symptom',
      'focus',
    ]);
  });

  it('activity: duration, type and intensity', () => {
    expect(activityModule.valueSchema.safeParse(30).success).toBe(true);
    expect(activityModule.valueSchema.safeParse(0).success).toBe(false);
    expect(
      activityModule.dataSchema.safeParse({ type: 'Laufen', intensity: 2, distanceKm: 5.2 })
        .success,
    ).toBe(true);
    expect(activityModule.dataSchema.safeParse({ type: 'Laufen', intensity: 4 }).success).toBe(
      false,
    );
    expect(activityModule.dataSchema.safeParse({ intensity: 2 }).success).toBe(false);
    expect(activityConfigSchema.parse({}).types).toContain('Laufen');
  });

  it('measurement: free values, unit config and optional second value', () => {
    expect(measurementModule.valueSchema.safeParse(78.4).success).toBe(true);
    expect(measurementModule.valueSchema.safeParse(Number.NaN).success).toBe(false);
    expect(
      measurementConfigSchema.safeParse({ unit: 'mmHg', secondaryLabel: 'diastolisch' }).success,
    ).toBe(true);
    expect(measurementConfigSchema.safeParse({ unit: '' }).success).toBe(false);
    expect(measurementModule.userTrackers).toBe(true);
    expect(measurementModule.defaultTrackers?.map((t) => t.key)).toEqual([
      'weight',
      'resting-pulse',
    ]);
  });

  it('symptom: intensity 1–10 and a named symptom', () => {
    expect(symptomModule.valueSchema.safeParse(10).success).toBe(true);
    expect(symptomModule.valueSchema.safeParse(0).success).toBe(false);
    expect(symptomModule.dataSchema.safeParse({ symptom: '' }).success).toBe(false);
    expect(symptomModule.primaryValue.aggregate).toBe('max');
  });

  it('focus: duration with optional ratings', () => {
    expect(focusModule.valueSchema.safeParse(25).success).toBe(true);
    expect(focusModule.dataSchema.safeParse({ concentration: 4, task: 'Steuer' }).success).toBe(
      true,
    );
    expect(focusModule.dataSchema.safeParse({ productivity: 6 }).success).toBe(false);
  });

  it('meal: no primary value, typed meals', () => {
    expect(mealModule.valueSchema.safeParse(null).success).toBe(true);
    expect(mealModule.valueSchema.safeParse(1).success).toBe(false);
    expect(
      mealModule.dataSchema.safeParse({ mealType: 'lunch', tags: ['selbst gekocht'] }).success,
    ).toBe(true);
    expect(mealModule.dataSchema.safeParse({ mealType: 'brunch' }).success).toBe(false);
  });
});
