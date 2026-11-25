import { describe, expect, it } from 'vitest';
import { sleepPeriod } from './sleep-times';

describe('sleepPeriod', () => {
  it('puts a late bedtime on the evening before', () => {
    const p = sleepPeriod('2026-11-25', '23:30', '07:15');
    expect(new Date(p.occurredAt).getDate()).toBe(24);
    expect(new Date(p.endsAt).getDate()).toBe(25);
    expect(p.minutes).toBe(465);
  });

  it('keeps an after-midnight bedtime on the same day', () => {
    const p = sleepPeriod('2026-11-25', '00:45', '08:00');
    expect(new Date(p.occurredAt).getDate()).toBe(25);
    expect(p.minutes).toBe(435);
  });

  it('handles naps during the day', () => {
    expect(sleepPeriod('2026-11-25', '13:00', '13:30').minutes).toBe(30);
  });
});
