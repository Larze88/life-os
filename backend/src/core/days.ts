import { and, asc, eq, isNull } from 'drizzle-orm';
import type { DaySummary, ModuleRegistry, Widget } from '@lifeos/shared';
import type { Db } from '../db/client.ts';
import { dashboardWidgets, entries } from '../db/schema.ts';
import { aggregateValues } from './aggregate.ts';
import { dailyGoalOn } from './goals.ts';
import { listActiveTrackers, toTracker } from './trackers.ts';

/** Everything the dashboard needs for one logical day, in a single request. */
export function getDaySummary(db: Db, registry: ModuleRegistry, date: string): DaySummary {
  const trackerRows = listActiveTrackers(db).filter((t) => registry.get(t.module));
  const dayEntries = db
    .select({ trackerId: entries.trackerId, value: entries.value })
    .from(entries)
    .where(and(eq(entries.localDate, date), isNull(entries.deletedAt)))
    .orderBy(asc(entries.occurredAt))
    .all();

  const trackers = trackerRows.map((row) => {
    const values = dayEntries.filter((e) => e.trackerId === row.id).map((e) => e.value);
    const module = registry.require(row.module);
    return {
      tracker: toTracker(row),
      value: aggregateValues(module.primaryValue.aggregate, values),
      count: values.length,
      goal: dailyGoalOn(db, row.id, date),
    };
  });

  const activeIds = new Set(trackerRows.map((t) => t.id));
  const widgets: Widget[] = db
    .select()
    .from(dashboardWidgets)
    .orderBy(asc(dashboardWidgets.position))
    .all()
    .filter((w) => w.trackerId === null || activeIds.has(w.trackerId))
    .map((w) => ({
      id: w.id,
      widgetType: w.widgetType,
      trackerId: w.trackerId,
      position: w.position,
      size: w.size,
      config: w.config,
    }));

  return { date, trackers, widgets };
}
