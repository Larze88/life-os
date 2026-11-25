import { and, asc, eq, gte, isNull, lte, max, min } from 'drizzle-orm';
import {
  CORRELATION_MIN_DAYS,
  STATS_MAX_DAYS,
  addDays,
  isZeroWhenMissing,
  spearman,
  type Correlation,
  type ModuleRegistry,
  type StatsDay,
  type StatsSeries,
} from '@lifeos/shared';
import type { Db } from '../db/client.ts';
import { entries, goals } from '../db/schema.ts';
import { problems } from '../lib/problem.ts';
import { aggregateValues } from './aggregate.ts';
import { getTrackerRow } from './trackers.ts';

type GoalRow = typeof goals.$inferSelect;

function dateRange(from: string, to: string): string[] {
  if (from > to) throw problems.badRequest('`from` must not be after `to`');
  if (addDays(from, STATS_MAX_DAYS - 1) < to)
    throw problems.badRequest(`Range exceeds ${STATS_MAX_DAYS} days`);
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

function goalMet(goal: GoalRow, value: number): boolean {
  if (goal.comparator === 'gte') return value >= goal.target;
  if (goal.comparator === 'lte') return value <= goal.target;
  return value >= goal.target && value <= (goal.targetMax ?? Number.POSITIVE_INFINITY);
}

/** Consecutive met days. The last day may still be running: a "not yet met" there is ignored. */
function streaks(days: StatsDay[]): { current: number; longest: number } | null {
  const evaluated = days.filter((d) => d.met !== null);
  if (evaluated.length === 0) return null;
  let longest = 0;
  let run = 0;
  for (const d of evaluated) {
    run = d.met ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  for (let i = evaluated.length - 1; i >= 0; i--) {
    const d = evaluated[i]!;
    if (d.met) current++;
    else if (i === evaluated.length - 1 && d.date === days.at(-1)?.date) continue;
    else break;
  }
  return { current, longest };
}

function entrySpan(db: Db, trackerId: string): { first: string | null; last: string | null } {
  const row = db
    .select({ first: min(entries.localDate), last: max(entries.localDate) })
    .from(entries)
    .where(and(eq(entries.trackerId, trackerId), isNull(entries.deletedAt)))
    .get();
  return { first: row?.first ?? null, last: row?.last ?? null };
}

/** First logical day with an entry for the tracker (tracking start), or null. */
function firstEntryDate(db: Db, trackerId: string): string | null {
  return entrySpan(db, trackerId).first;
}

function zeroWhenMissingFor(registry: ModuleRegistry, moduleId: string): boolean {
  return isZeroWhenMissing(registry.require(moduleId));
}

/**
 * Daily series of one tracker: aggregated value per day, goal/completion per day,
 * summary and streaks. Days before the first ever entry are not counted as "missed".
 */
export function getStatsSeries(
  db: Db,
  registry: ModuleRegistry,
  trackerId: string,
  from: string,
  to: string,
): StatsSeries {
  const dates = dateRange(from, to);
  const tracker = getTrackerRow(db, trackerId);
  if (!tracker) throw problems.notFound();
  const module = registry.require(tracker.module);
  const aggregate = module.primaryValue.aggregate;
  // A missing day means "zero" only for additive point-in-time modules (no water = 0 ml).
  // For periods like sleep a missing night means "not recorded", not 0 hours.
  const zeroWhenMissing = zeroWhenMissingFor(registry, tracker.module);
  const start = firstEntryDate(db, trackerId);

  const rows = db
    .select({ localDate: entries.localDate, value: entries.value })
    .from(entries)
    .where(
      and(
        eq(entries.trackerId, trackerId),
        isNull(entries.deletedAt),
        gte(entries.localDate, from),
        lte(entries.localDate, to),
      ),
    )
    .orderBy(asc(entries.occurredAt))
    .all();
  const byDate = new Map<string, (number | null)[]>();
  for (const r of rows) byDate.set(r.localDate, [...(byDate.get(r.localDate) ?? []), r.value]);

  const dailyGoals = db
    .select()
    .from(goals)
    .where(and(eq(goals.trackerId, trackerId), eq(goals.period, 'day')))
    .all();
  const goalOn = (date: string) =>
    dailyGoals
      .filter((g) => g.validFrom <= date && (g.validTo === null || g.validTo >= date))
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];

  const days: StatsDay[] = dates.map((date) => {
    const values = byDate.get(date) ?? [];
    const count = values.length;
    const value = count > 0 ? aggregateValues(aggregate, values) : null;
    let met: boolean | null = null;
    const tracking = start !== null && date >= start;
    if (tracking && module.dailyCompletion) {
      const rule = module.dailyCompletion(tracker.config, date);
      met = rule.due ? count >= rule.target : null;
    } else if (tracking) {
      const goal = goalOn(date);
      const v = value ?? (zeroWhenMissing ? 0 : null);
      met = goal && v !== null ? goalMet(goal, v) : null;
    }
    return { date, value, count, met };
  });

  const withData = days.filter((d) => d.value !== null).map((d) => d.value!);
  const additive = aggregate === 'sum' || aggregate === 'count';
  const total = additive ? withData.reduce((a, b) => a + b, 0) : null;
  // Zero-when-missing values average over all tracked days (a day without water counts as 0).
  const trackedDays = start === null ? 0 : days.filter((d) => d.date >= start).length;
  const average = zeroWhenMissing
    ? trackedDays > 0
      ? total! / trackedDays
      : null
    : withData.length > 0
      ? withData.reduce((a, b) => a + b, 0) / withData.length
      : null;
  const evaluated = days.filter((d) => d.met !== null);

  const lastDay = dates.at(-1)!;
  const goalTarget = module.dailyCompletion
    ? module.dailyCompletion(tracker.config, lastDay).target
    : (goalOn(lastDay)?.target ?? null);

  return {
    trackerId,
    aggregate,
    goalTarget,
    days,
    summary: {
      average,
      min: withData.length ? Math.min(...withData) : null,
      max: withData.length ? Math.max(...withData) : null,
      total,
      daysWithData: withData.length,
      goal: evaluated.length
        ? { met: evaluated.filter((d) => d.met).length, evaluated: evaluated.length }
        : null,
    },
    streak: streaks(days),
  };
}

/** Daily values for correlation: additive trackers count missing tracked days as 0. */
function correlationValues(
  db: Db,
  registry: ModuleRegistry,
  trackerId: string,
  from: string,
  to: string,
): Map<string, number> {
  const series = getStatsSeries(db, registry, trackerId, from, to);
  const tracker = getTrackerRow(db, trackerId)!;
  const zeroWhenMissing = zeroWhenMissingFor(registry, tracker.module);
  // Gaps are filled with 0 only between the first and the last entry (active tracking).
  const { first, last } = entrySpan(db, trackerId);
  const result = new Map<string, number>();
  for (const d of series.days) {
    if (d.value !== null) result.set(d.date, d.value);
    else if (
      zeroWhenMissing &&
      first !== null &&
      last !== null &&
      d.date >= first &&
      d.date <= last
    )
      result.set(d.date, 0);
  }
  return result;
}

/** Descriptive Spearman correlation between two trackers' daily values (optional 1-day lag). */
export function getCorrelation(
  db: Db,
  registry: ModuleRegistry,
  query: { a: string; b: string; from: string; to: string; lag: number },
): Correlation {
  const a = correlationValues(db, registry, query.a, query.from, query.to);
  const b = correlationValues(db, registry, query.b, query.from, addDays(query.to, query.lag));
  const pairs: Correlation['pairs'] = [];
  for (const [date, av] of a) {
    const bv = b.get(addDays(date, query.lag));
    if (bv !== undefined) pairs.push({ date, a: av, b: bv });
  }
  pairs.sort((x, y) => x.date.localeCompare(y.date));
  const rho =
    pairs.length >= CORRELATION_MIN_DAYS
      ? spearman(
          pairs.map((p) => p.a),
          pairs.map((p) => p.b),
        )
      : null;
  return { n: pairs.length, rho, pairs };
}
