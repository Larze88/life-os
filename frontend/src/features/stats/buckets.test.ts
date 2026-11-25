import { describe, expect, it } from 'vitest';
import { granularityFor, toChartPoints } from './buckets';

const day = (date: string, value: number | null) => ({
  date,
  value,
  count: value === null ? 0 : 1,
  met: null,
});

describe('chart buckets', () => {
  it('chooses daily, weekly or monthly points by period length', () => {
    expect(granularityFor(7)).toBe('day');
    expect(granularityFor(30)).toBe('day');
    expect(granularityFor(90)).toBe('week');
    expect(granularityFor(365)).toBe('month');
  });

  it('averages per day; missing days count as 0 only for zero-when-missing modules', () => {
    // Mon 23 – Sun 29 Nov 2026 is one ISO week.
    const days = [
      day('2026-11-22', null),
      day('2026-11-23', 1000),
      day('2026-11-24', null),
      day('2026-11-25', 2000),
    ];
    const water = toChartPoints(days, 'week', true);
    // 22 Nov is before the first value → not counted; 23–25 Nov: (1000 + 0 + 2000) / 3
    expect(water.map((p) => [p.date, p.value])).toEqual([
      ['2026-11-22', null],
      ['2026-11-23', 1000],
    ]);
    const sleep = toChartPoints(days, 'week', false);
    expect(sleep.at(-1)?.value).toBe(1500);
  });

  it('groups by calendar month', () => {
    const points = toChartPoints(
      [day('2026-10-31', 3), day('2026-11-01', 5), day('2026-11-02', 4)],
      'month',
      false,
    );
    expect(points.map((p) => [p.date, p.end, p.value])).toEqual([
      ['2026-10-31', '2026-10-31', 3],
      ['2026-11-01', '2026-11-02', 4.5],
    ]);
  });
});
