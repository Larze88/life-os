import { and, asc, gte, inArray, isNull, lt, lte } from 'drizzle-orm';
import {
  STATS_MAX_DAYS,
  addDays,
  resolveAggregate,
  type History,
  type ModuleRegistry,
} from '@lifeos/shared';
import type { Db } from '../db/client.ts';
import { entries } from '../db/schema.ts';
import { problems } from '../lib/problem.ts';
import { aggregateValues } from './aggregate.ts';
import { listActiveTrackers } from './trackers.ts';

/**
 * Days with entries in a range (newest first), aggregated per tracker with the module's
 * aggregate. Only active trackers are included, in their dashboard order.
 */
export function getHistory(db: Db, registry: ModuleRegistry, from: string, to: string): History {
  if (from > to) throw problems.badRequest('`from` must not be after `to`');
  if (addDays(from, STATS_MAX_DAYS - 1) < to)
    throw problems.badRequest(`Range exceeds ${STATS_MAX_DAYS} days`);

  const trackers = listActiveTrackers(db).filter((t) => registry.get(t.module));
  const ids = trackers.map((t) => t.id);
  if (ids.length === 0) return { days: [], hasMoreBefore: false };

  const rows = db
    .select({ trackerId: entries.trackerId, localDate: entries.localDate, value: entries.value })
    .from(entries)
    .where(
      and(
        inArray(entries.trackerId, ids),
        isNull(entries.deletedAt),
        gte(entries.localDate, from),
        lte(entries.localDate, to),
      ),
    )
    .orderBy(asc(entries.occurredAt))
    .all();

  const byDate = new Map<string, Map<string, (number | null)[]>>();
  for (const r of rows) {
    const day = byDate.get(r.localDate) ?? new Map<string, (number | null)[]>();
    day.set(r.trackerId, [...(day.get(r.trackerId) ?? []), r.value]);
    byDate.set(r.localDate, day);
  }

  const days = [...byDate.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const day = byDate.get(date)!;
      return {
        date,
        trackers: trackers
          .filter((t) => day.has(t.id))
          .map((t) => {
            const values = day.get(t.id)!;
            return {
              trackerId: t.id,
              value: aggregateValues(
                resolveAggregate(registry.require(t.module), t.config),
                values,
              ),
              count: values.length,
            };
          }),
      };
    });

  const older = db
    .select({ id: entries.id })
    .from(entries)
    .where(
      and(inArray(entries.trackerId, ids), isNull(entries.deletedAt), lt(entries.localDate, from)),
    )
    .limit(1)
    .get();

  return { days, hasMoreBefore: older !== undefined };
}
