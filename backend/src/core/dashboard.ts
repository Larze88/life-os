import { asc, eq } from 'drizzle-orm';
import type { DashboardLayout, Widget } from '@lifeos/shared';
import type { Db } from '../db/client.ts';
import { dashboardWidgets, trackers } from '../db/schema.ts';
import { problems } from '../lib/problem.ts';

type WidgetRow = typeof dashboardWidgets.$inferSelect;

export function toWidget(row: WidgetRow): Widget {
  return {
    id: row.id,
    widgetType: row.widgetType,
    trackerId: row.trackerId,
    position: row.position,
    size: row.size,
    config: row.config,
    hidden: row.hidden,
  };
}

/** All widgets in display order, including hidden ones; widgets of archived trackers are left out. */
export function listWidgets(db: Db): Widget[] {
  const archived = new Set(
    db
      .select({ id: trackers.id, archivedAt: trackers.archivedAt })
      .from(trackers)
      .all()
      .filter((t) => t.archivedAt !== null)
      .map((t) => t.id),
  );
  return db
    .select()
    .from(dashboardWidgets)
    .orderBy(asc(dashboardWidgets.position))
    .all()
    .filter((w) => w.trackerId === null || !archived.has(w.trackerId))
    .map(toWidget);
}

/**
 * Saves order and visibility. The list must contain exactly the current widgets
 * (so a stale client cannot silently drop newly added ones).
 */
export function saveLayout(db: Db, layout: DashboardLayout): Widget[] {
  const current = listWidgets(db);
  const known = new Set(current.map((w) => w.id));
  const sent = new Set(layout.widgets.map((w) => w.id));
  if (layout.widgets.some((w) => !known.has(w.id)) || current.some((w) => !sent.has(w.id))) {
    throw problems.conflict('Das Dashboard hat sich geändert. Bitte neu laden.');
  }
  const now = new Date().toISOString();
  db.transaction((tx) => {
    layout.widgets.forEach((w, position) => {
      tx.update(dashboardWidgets)
        .set({ position, hidden: w.hidden, updatedAt: now })
        .where(eq(dashboardWidgets.id, w.id))
        .run();
    });
  });
  return listWidgets(db);
}
