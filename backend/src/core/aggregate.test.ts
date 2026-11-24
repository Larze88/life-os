import { describe, expect, it } from 'vitest';
import { aggregateValues } from './aggregate.ts';

describe('aggregateValues', () => {
  const values = [250, null, 500, 100];
  it.each([
    ['sum', 850],
    ['avg', 850 / 3],
    ['max', 500],
    ['last', 100],
    ['count', 4],
  ] as const)('%s', (aggregate, expected) => {
    expect(aggregateValues(aggregate, values)).toBeCloseTo(expected);
  });

  it('returns null without values (except count)', () => {
    expect(aggregateValues('sum', [])).toBeNull();
    expect(aggregateValues('count', [])).toBe(0);
  });
});
