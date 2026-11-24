import { describe, expect, it } from 'vitest';
import { entryMomentFor } from './entry-time';

describe('entryMomentFor', () => {
  const now = new Date(2026, 10, 24, 9, 30); // local time

  it('uses the current moment for today', () => {
    const { occurredAt } = entryMomentFor('2026-11-24', '00:00', now);
    expect(occurredAt).toBe(now.toISOString());
  });

  it('uses local noon for other days', () => {
    const { occurredAt } = entryMomentFor('2026-11-20', '00:00', now);
    expect(new Date(occurredAt).getHours()).toBe(12);
    expect(new Date(occurredAt).getDate()).toBe(20);
  });

  it('treats early morning as the previous day with a later day start', () => {
    const early = new Date(2026, 10, 25, 2, 0);
    expect(entryMomentFor('2026-11-24', '04:00', early).occurredAt).toBe(early.toISOString());
  });
});
