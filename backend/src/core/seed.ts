import { eq, sql } from 'drizzle-orm';
import { uuidv7, type ModuleRegistry } from '@lifeos/shared';
import type { Db } from '../db/client.ts';
import { dashboardWidgets, goals, trackers } from '../db/schema.ts';

/** Goals created by the seed apply to all history. */
export const SEED_GOAL_VALID_FROM = '2000-01-01';

/**
 * Creates the default trackers (with goals and widgets) of all registered modules.
 * Idempotent: a tracker key that already exists is never touched again — even if the
 * user renamed or archived it.
 */
export function seedModules(db: Db, registry: ModuleRegistry): string[] {
  const created: string[] = [];
  db.transaction((tx) => {
    for (const module of registry.all) {
      for (const seed of module.defaultTrackers ?? []) {
        const exists = tx
          .select({ id: trackers.id })
          .from(trackers)
          .where(eq(trackers.key, seed.key))
          .get();
        if (exists) continue;

        const trackerCount =
          tx
            .select({ n: sql<number>`count(*)` })
            .from(trackers)
            .get()?.n ?? 0;
        const trackerId = uuidv7();
        tx.insert(trackers)
          .values({
            id: trackerId,
            key: seed.key,
            module: module.id,
            name: seed.name,
            icon: seed.icon ?? null,
            color: seed.color ?? null,
            config: module.configSchema.parse(seed.config),
            sortOrder: trackerCount,
          })
          .run();

        for (const goal of seed.goals ?? []) {
          tx.insert(goals)
            .values({
              id: uuidv7(),
              trackerId,
              metric: goal.metric,
              period: goal.period,
              comparator: goal.comparator,
              target: goal.target,
              targetMax: goal.targetMax ?? null,
              validFrom: SEED_GOAL_VALID_FROM,
            })
            .run();
        }

        for (const widget of seed.widgets ?? []) {
          const maxPos =
            tx
              .select({ n: sql<number | null>`max(${dashboardWidgets.position})` })
              .from(dashboardWidgets)
              .get()?.n ?? -1;
          tx.insert(dashboardWidgets)
            .values({
              id: uuidv7(),
              widgetType: widget.type,
              trackerId,
              size: widget.size,
              position: maxPos + 1,
            })
            .run();
        }
        created.push(seed.key);
      }

      // Widgets spanning several trackers of a module (e.g. all habits): one per type.
      for (const widget of module.defaultWidgets ?? []) {
        const exists = tx
          .select({ id: dashboardWidgets.id })
          .from(dashboardWidgets)
          .where(eq(dashboardWidgets.widgetType, widget.type))
          .get();
        if (exists) continue;
        const maxPos =
          tx
            .select({ n: sql<number | null>`max(${dashboardWidgets.position})` })
            .from(dashboardWidgets)
            .get()?.n ?? -1;
        tx.insert(dashboardWidgets)
          .values({
            id: uuidv7(),
            widgetType: widget.type,
            trackerId: null,
            size: widget.size,
            position: maxPos + 1,
          })
          .run();
        created.push(`widget:${widget.type}`);
      }
    }
  });
  return created;
}
