import { asc, eq, isNull, sql } from 'drizzle-orm';
import {
  uuidv7,
  type ModuleRegistry,
  type Tracker,
  type TrackerCreate,
  type TrackerUpdate,
} from '@lifeos/shared';
import type { Db } from '../db/client.ts';
import { dashboardWidgets, trackers } from '../db/schema.ts';
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
  if (update.icon !== undefined) changes.icon = update.icon || null;
  if (update.config !== undefined) {
    const parsed = module.configSchema.safeParse(update.config);
    if (!parsed.success)
      throw problems.badRequest(
        'Invalid tracker config',
        prefix('config', zodErrorsToRecord(parsed.error)),
      );
    // Existing entries must stay valid (e.g. custom tracker fields), ADR-041.
    const conflict = module.validateConfigChange?.(
      module.configSchema.parse(row.config),
      parsed.data,
    );
    if (conflict) throw problems.badRequest(conflict, { config: [conflict] });
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

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30) || 'tracker'
  );
}

/** Creates a user-defined tracker (only for modules that allow it, e.g. habits). */
export function createTracker(
  db: Db,
  registry: ModuleRegistry,
  input: Required<Pick<TrackerCreate, 'module' | 'name'>> & {
    icon: string | null;
    config: unknown;
  },
): Tracker {
  const module = registry.get(input.module);
  if (!module?.userTrackers) {
    throw problems.badRequest('Validation failed', {
      module: ['Für dieses Modul können keine eigenen Tracker angelegt werden'],
    });
  }
  const config = module.configSchema.safeParse(input.config);
  if (!config.success)
    throw problems.badRequest(
      'Invalid tracker config',
      prefix('config', zodErrorsToRecord(config.error)),
    );

  const id = uuidv7();
  // Immutable key: module + readable slug + unique suffix (never reused, CLAUDE.md rule 4).
  const key = `${module.id}-${slugify(input.name)}-${id.slice(-6)}`;
  const maxSort =
    db
      .select({ n: sql<number | null>`max(${trackers.sortOrder})` })
      .from(trackers)
      .get()?.n ?? -1;
  const row = {
    id,
    key,
    module: module.id,
    name: input.name,
    icon: input.icon,
    color: module.id,
    config: config.data,
    configVersion: 1,
    sortOrder: maxSort + 1,
  };
  db.transaction((tx) => {
    tx.insert(trackers).values(row).run();
    // Modules like custom trackers give every new tracker its own dashboard widget.
    if (module.userTrackerWidget) {
      const maxPos =
        tx
          .select({ n: sql<number | null>`max(${dashboardWidgets.position})` })
          .from(dashboardWidgets)
          .get()?.n ?? -1;
      tx.insert(dashboardWidgets)
        .values({
          id: uuidv7(),
          widgetType: module.userTrackerWidget.type,
          trackerId: id,
          size: module.userTrackerWidget.size,
          position: maxPos + 1,
        })
        .run();
    }
  });
  return toTracker({ ...row, archivedAt: null, createdAt: '', updatedAt: '' });
}

/** Archives a user-defined tracker. Its entries stay in the database (history, export). */
export function archiveTracker(db: Db, registry: ModuleRegistry, id: string): void {
  const row = getTrackerRow(db, id);
  if (!row || row.archivedAt) throw problems.notFound();
  if (!registry.get(row.module)?.userTrackers) {
    throw problems.badRequest('Eingebaute Tracker können nicht archiviert werden.');
  }
  const now = new Date().toISOString();
  db.update(trackers).set({ archivedAt: now, updatedAt: now }).where(eq(trackers.id, id)).run();
}
