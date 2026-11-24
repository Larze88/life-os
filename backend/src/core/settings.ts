import { eq } from 'drizzle-orm';
import { settingsSchema, type Settings } from '@lifeos/shared';
import type { Db } from '../db/client.ts';
import { settings } from '../db/schema.ts';

const DEFAULTS: Settings = { dayStart: '00:00' };
const KEYS = { dayStart: 'day_start_time' } as const satisfies Record<keyof Settings, string>;

export function getSettings(db: Db): Settings {
  const rows = db.select().from(settings).all();
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const merged = { ...DEFAULTS };
  for (const [field, key] of Object.entries(KEYS) as [keyof Settings, string][]) {
    if (stored.has(key)) merged[field] = stored.get(key) as Settings[typeof field];
  }
  // Fall back to defaults if something unexpected was stored.
  return settingsSchema.safeParse(merged).success ? merged : DEFAULTS;
}

/**
 * Note: changing dayStart does not recompute `local_date` of existing entries
 * (docs/DATA_MODEL.md §3 — needs an explicit recalculation step).
 */
export function updateSettings(db: Db, update: Settings): Settings {
  const now = new Date().toISOString();
  db.transaction((tx) => {
    for (const [field, key] of Object.entries(KEYS) as [keyof Settings, string][]) {
      tx.insert(settings)
        .values({ key, value: update[field], updatedAt: now })
        .onConflictDoUpdate({ target: settings.key, set: { value: update[field], updatedAt: now } })
        .run();
    }
  });
  return getSettings(db);
}

export function deleteSetting(db: Db, key: string): void {
  db.delete(settings).where(eq(settings.key, key)).run();
}
