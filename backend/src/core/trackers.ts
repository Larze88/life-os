import { asc, eq, isNull } from 'drizzle-orm';
import type { ModuleRegistry, Tracker, TrackerUpdate } from '@lifeos/shared';
import type { Db } from '../db/client.ts';
import { trackers } from '../db/schema.ts';
import { problems, zodErrorsToRecord } from '../lib/problem.ts';

type TrackerRow = typeof trackers.$inferSelect;

export function toTracker(row: TrackerRow): Tracker {
  return {
    id: row.id,
    key: row.key,
    module: row.module,
    name: row.name,
    icon: row.icon,
    color: row.color,
    config: row.config,
    sortOrder: row.sortOrder,
  };
}

export function listActiveTrackers(db: Db): TrackerRow[] {
  return db
    .select()
    .from(trackers)
    .where(isNull(trackers.archivedAt))
    .orderBy(asc(trackers.sortOrder))
    .all();
}

export function getTrackerRow(db: Db, id: string): TrackerRow | undefined {
  return db.select().from(trackers).where(eq(trackers.id, id)).get();
}

export function updateTracker(
  db: Db,
  registry: ModuleRegistry,
  id: string,
  update: TrackerUpdate,
): Tracker {
  const row = getTrackerRow(db, id);
  if (!row || row.archivedAt) throw problems.notFound();
  const module = registry.require(row.module);

  const changes: Partial<TrackerRow> = { updatedAt: new Date().toISOString() };
  if (update.name !== undefined) changes.name = update.name;
  if (update.config !== undefined) {
    const parsed = module.configSchema.safeParse(update.config);
    if (!parsed.success)
      throw problems.badRequest(
        'Invalid tracker config',
        prefix('config', zodErrorsToRecord(parsed.error)),
      );
    changes.config = parsed.data;
  }
  db.update(trackers).set(changes).where(eq(trackers.id, id)).run();
  return toTracker({ ...row, ...changes });
}

export function prefix(name: string, errors: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(errors).map(([k, v]) => [k === '_' ? name : `${name}.${k}`, v]),
  );
}
