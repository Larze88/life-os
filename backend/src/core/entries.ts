import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm';
import type {
  entryUpsertSchema} from '@lifeos/shared';
import {
  addDays,
  computeLocalDate,
  isUuidV7,
  type Entry,
  type EntryQuery,
  type ModuleRegistry,
} from '@lifeos/shared';
import type { z } from 'zod';
import type { Db } from '../db/client.ts';
import { entries } from '../db/schema.ts';
import { problems, zodErrorsToRecord } from '../lib/problem.ts';
import { getSettings } from './settings.ts';
import { getTrackerRow, prefix } from './trackers.ts';

type EntryRow = typeof entries.$inferSelect;
type EntryUpsertParsed = z.output<typeof entryUpsertSchema>;

const MAX_RANGE_DAYS = 366;

export function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    trackerId: row.trackerId,
    occurredAt: row.occurredAt,
    endsAt: row.endsAt,
    localDate: row.localDate,
    tzOffsetMin: row.tzOffsetMin,
    value: row.value,
    data: (row.data ?? {}) as Record<string, unknown>,
    note: row.note,
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Creates or updates an entry under a client-generated id (idempotent, ADR-004).
 * The module validates value and payload; the server computes the logical day.
 */
export function upsertEntry(
  db: Db,
  registry: ModuleRegistry,
  id: string,
  input: EntryUpsertParsed,
): { entry: Entry; created: boolean } {
  if (!isUuidV7(id)) throw problems.badRequest('Entry ids must be UUIDv7');

  const tracker = getTrackerRow(db, input.trackerId);
  if (!tracker || tracker.archivedAt) {
    throw problems.badRequest('Validation failed', { trackerId: ['Unbekannter Tracker'] });
  }
  const module = registry.require(tracker.module);

  const errors: Record<string, string[]> = {};
  const value = module.valueSchema.safeParse(input.value);
  if (!value.success) Object.assign(errors, prefix('value', zodErrorsToRecord(value.error)));
  const data = module.dataSchema.safeParse(input.data);
  if (!data.success) Object.assign(errors, prefix('data', zodErrorsToRecord(data.error)));

  const occurredAt = new Date(input.occurredAt).toISOString();
  let endsAt: string | null = null;
  if (module.entryKind === 'span') {
    if (!input.endsAt) errors.endsAt = ['Ende fehlt'];
    else if (Date.parse(input.endsAt) <= Date.parse(occurredAt))
      errors.endsAt = ['Ende muss nach dem Beginn liegen'];
    else endsAt = new Date(input.endsAt).toISOString();
  }
  if (Object.keys(errors).length > 0 || !value.success || !data.success) {
    throw problems.badRequest('Validation failed', errors);
  }

  const { dayStart } = getSettings(db);
  const dayInstant = module.dayAssignment === 'end' && endsAt ? endsAt : occurredAt;
  const localDate = computeLocalDate({
    instant: dayInstant,
    tzOffsetMin: input.tzOffsetMin,
    dayStart,
  });
  const now = new Date().toISOString();

  const fields = {
    trackerId: input.trackerId,
    occurredAt,
    endsAt,
    localDate,
    tzOffsetMin: input.tzOffsetMin,
    value: value.data,
    data: data.data as Record<string, unknown>,
    dataVersion: module.version,
    note: input.note || null,
    updatedAt: now,
  };

  return db.transaction((tx) => {
    const existing = tx.select().from(entries).where(eq(entries.id, id)).get();
    if (existing) {
      if (existing.deletedAt) throw problems.conflict('Der Eintrag wurde gelöscht.');
      if (existing.trackerId !== input.trackerId)
        throw problems.conflict('Der Tracker eines Eintrags kann nicht geändert werden.');
      tx.update(entries).set(fields).where(eq(entries.id, id)).run();
      return { entry: toEntry({ ...existing, ...fields }), created: false };
    }
    const row: EntryRow = {
      id,
      ...fields,
      source: input.source,
      sourceRef: null,
      createdAt: now,
      deletedAt: null,
    };
    tx.insert(entries).values(row).run();
    return { entry: toEntry(row), created: true };
  });
}

export function softDeleteEntry(db: Db, id: string): void {
  const now = new Date().toISOString();
  const result = db
    .update(entries)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(entries.id, id), isNull(entries.deletedAt)))
    .run();
  if (result.changes === 0) throw problems.notFound();
}

export function listEntries(db: Db, query: EntryQuery): Entry[] {
  if (query.from > query.to) throw problems.badRequest('`from` must not be after `to`');
  if (addDays(query.from, MAX_RANGE_DAYS) < query.to)
    throw problems.badRequest(`Range exceeds ${MAX_RANGE_DAYS} days`);
  const conditions = [
    isNull(entries.deletedAt),
    gte(entries.localDate, query.from),
    lte(entries.localDate, query.to),
  ];
  if (query.trackerId) conditions.push(eq(entries.trackerId, query.trackerId));
  return db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(asc(entries.occurredAt))
    .all()
    .map(toEntry);
}
