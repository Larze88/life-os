import { describe, expect, it } from 'vitest';
import { habitConfigSchema, habitModule, isHabitDue } from './habit/definition.ts';
import { moodModule } from './mood/definition.ts';
import { moduleRegistry } from './registry.ts';
import { sleepDurationMinutes, sleepModule } from './sleep/definition.ts';

describe('mood module', () => {
  it('validates the 1–5 scale and optional details', () => {
    expect(moodModule.valueSchema.safeParse(3).success).toBe(true);
    expect(moodModule.valueSchema.safeParse(0).success).toBe(false);
    expect(moodModule.valueSchema.safeParse(6).success).toBe(false);
    expect(moodModule.dataSchema.safeParse({ energy: 4, stress: 2 }).success).toBe(true);
    expect(moodModule.dataSchema.safeParse({ energy: 9 }).success).toBe(false);
  });
});

describe('sleep module', () => {
  it('derives the duration in minutes', () => {
    expect(sleepDurationMinutes('2026-11-24T22:30:00Z', '2026-11-25T06:15:00Z')).toBe(465);
    expect(
      sleepModule.deriveValue?.({
        occurredAt: '2026-11-24T22:30:00Z',
        endsAt: '2026-11-25T06:00:00Z',
        data: { quality: 4 },
      }),
    ).toBe(450);
  });

  it('requires a quality rating and limits the duration', () => {
    expect(sleepModule.dataSchema.safeParse({}).success).toBe(false);
    expect(sleepModule.dataSchema.safeParse({ quality: 4 }).success).toBe(true);
    expect(sleepModule.valueSchema.safeParse(21 * 60).success).toBe(false);
  });

  it('counts for the wake-up day', () => {
    expect(sleepModule.entryKind).toBe('span');
    expect(sleepModule.dayAssignment).toBe('end');
  });
});

describe('habit module', () => {
  it('defaults to once daily', () => {
    expect(habitConfigSchema.parse({})).toEqual({ schedule: { type: 'daily' }, targetPerDay: 1 });
  });

  it('knows on which days a habit is due', () => {
    const weekdays = habitConfigSchema.parse({ schedule: { type: 'weekdays', days: [1, 3, 5] } });
    expect(isHabitDue(weekdays, '2026-11-23')).toBe(true); // Monday
    expect(isHabitDue(weekdays, '2026-11-24')).toBe(false); // Tuesday
    expect(isHabitDue(habitConfigSchema.parse({}), '2026-11-24')).toBe(true);
  });

  it('accepts only completions with value 1 and user-created trackers', () => {
    expect(habitModule.valueSchema.safeParse(1).success).toBe(true);
    expect(habitModule.valueSchema.safeParse(2).success).toBe(false);
    expect(habitModule.userTrackers).toBe(true);
    expect(habitConfigSchema.safeParse({ schedule: { type: 'weekdays', days: [] } }).success).toBe(
      false,
    );
  });
});

describe('registry', () => {
  it('contains all phase 3a modules', () => {
    expect(moduleRegistry.all.map((m) => m.id)).toEqual(['water', 'mood', 'sleep', 'habit']);
  });
});
