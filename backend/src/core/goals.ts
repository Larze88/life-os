import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { addDays, uuidv7, type Goal } from '@lifeos/shared';
import type { Db } from '../db/client.ts';
import { goals } from '../db/schema.ts';

type GoalRow = typeof goals.$inferSelect;

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    trackerId: row.trackerId,
    metric: row.metric,
    period: row.period,
    comparator: row.comparator,
    target: row.target,
    targetMax: row.targetMax,
    validFrom: row.validFrom,
    validTo: row.validTo,
  };
}

/** The daily goal that applied on a given logical day (goals are historized, ADR in DATA_MODEL §2). */
export function dailyGoalOn(db: Db, trackerId: string, date: string): Goal | null {
  const row = db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.trackerId, trackerId),
        eq(goals.period, 'day'),
        lte(goals.validFrom, date),
        or(isNull(goals.validTo), gte(goals.validTo, date)),
      ),
    )
    .orderBy(desc(goals.validFrom))
    .get();
  return row ? toGoal(row) : null;
}

/**
 * Sets a new daily target from `effectiveFrom` on. The previous goal is closed the day
 * before, so past days keep being evaluated against the target that applied back then.
 */
export function setDailyGoalTarget(
  db: Db,
  trackerId: string,
  template: Pick<Goal, 'metric' | 'comparator'>,
  target: number,
  effectiveFrom: string,
): Goal {
  return db.transaction((tx) => {
    const current = tx
      .select()
      .from(goals)
      .where(and(eq(goals.trackerId, trackerId), eq(goals.period, 'day'), isNull(goals.validTo)))
      .orderBy(desc(goals.validFrom))
      .get();
    const now = new Date().toISOString();

    if (current && current.validFrom >= effectiveFrom) {
      // Same day (or earlier) as the current goal started: just correct its target.
      tx.update(goals).set({ target, updatedAt: now }).where(eq(goals.id, current.id)).run();
      return toGoal({ ...current, target });
    }
    if (current) {
      tx.update(goals)
        .set({ validTo: addDays(effectiveFrom, -1), updatedAt: now })
        .where(eq(goals.id, current.id))
        .run();
    }
    const row: GoalRow = {
      id: uuidv7(),
      trackerId,
      metric: current?.metric ?? template.metric,
      period: 'day',
      comparator: current?.comparator ?? template.comparator,
      target,
      targetMax: null,
      validFrom: effectiveFrom,
      validTo: null,
      createdAt: now,
      updatedAt: now,
    };
    tx.insert(goals).values(row).run();
    return toGoal(row);
  });
}
