import { describe, expect, it } from 'vitest';
import { correlationStrength, ranks, spearman } from './spearman.ts';

describe('spearman', () => {
  it('averages tied ranks', () => {
    expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
  });

  it('is 1 for monotonic and -1 for inverse relations', () => {
    expect(spearman([1, 2, 3, 4], [10, 40, 90, 160])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [9, 7, 3, 1])).toBeCloseTo(-1);
  });

  it('returns null without variance', () => {
    expect(spearman([1, 1, 1], [1, 2, 3])).toBeNull();
  });

  it('matches a known textbook example', () => {
    const iq = [106, 100, 86, 101, 99, 103, 97, 113, 112, 110];
    const tv = [7, 27, 2, 50, 28, 29, 20, 12, 6, 17];
    expect(spearman(iq, tv)).toBeCloseTo(-0.17575757, 6);
  });

  it('describes strength', () => {
    expect(correlationStrength(0.1)).toBe('none');
    expect(correlationStrength(-0.3)).toBe('weak');
    expect(correlationStrength(0.5)).toBe('moderate');
    expect(correlationStrength(-0.8)).toBe('strong');
  });
});
