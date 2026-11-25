import type { StatsDay } from '@lifeos/shared';

export interface ChartPoint {
  /** First day of the bucket. */
  date: string;
  /** Last day of the bucket (same as date for daily points). */
  end: string;
  value: number | null;
}

export type Granularity = 'day' | 'week' | 'month';

export function granularityFor(days: number): Granularity {
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

/**
 * Groups daily values into weeks/months as "average per day". For zero-when-missing
 * modules, empty tracked days count as 0 (tracking starts with the first day with data);
 * otherwise only days with data are averaged.
 */
export function toChartPoints(
  days: StatsDay[],
  granularity: Granularity,
  zeroWhenMissing: boolean,
): ChartPoint[] {
  if (granularity === 'day')
    return days.map((d) => ({ date: d.date, end: d.date, value: d.value }));
  const firstTracked = days.find((d) => d.value !== null)?.date;
  const groups = new Map<string, StatsDay[]>();
  for (const d of days) {
    const key = granularity === 'month' ? d.date.slice(0, 7) : weekKey(d.date);
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return [...groups.values()].map((group) => {
    const considered = zeroWhenMissing
      ? group
          .filter((d) => firstTracked !== undefined && d.date >= firstTracked)
          .map((d) => d.value ?? 0)
      : group.filter((d) => d.value !== null).map((d) => d.value!);
    const value = considered.length
      ? considered.reduce((a, b) => a + b, 0) / considered.length
      : null;
    return { date: group[0]!.date, end: group.at(-1)!.date, value };
  });
}

/** Monday of the ISO week of a YYYY-MM-DD date. */
function weekKey(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (weekday - 1));
  return d.toISOString().slice(0, 10);
}
