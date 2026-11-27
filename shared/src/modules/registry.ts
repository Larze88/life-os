import type { AnyModuleDefinition } from './types.ts';
import { activityModule } from './activity/definition.ts';
import { customModule } from './custom/definition.ts';
import { focusModule } from './focus/definition.ts';
import { habitModule } from './habit/definition.ts';
import { mealModule } from './meal/definition.ts';
import { measurementModule } from './measurement/definition.ts';
import { symptomModule } from './symptom/definition.ts';
import { moodModule } from './mood/definition.ts';
import { sleepModule } from './sleep/definition.ts';
import { waterModule } from './water/definition.ts';

export const MODULE_ID_RE = /^[a-z][a-z0-9-]{1,31}$/;

export interface ModuleRegistry {
  readonly all: readonly AnyModuleDefinition[];
  get(id: string): AnyModuleDefinition | undefined;
  require(id: string): AnyModuleDefinition;
}

/** Creates a registry and fails fast on duplicate or malformed module IDs. */
export function createModuleRegistry(definitions: readonly AnyModuleDefinition[]): ModuleRegistry {
  const byId = new Map<string, AnyModuleDefinition>();
  for (const def of definitions) {
    if (!MODULE_ID_RE.test(def.id)) throw new Error(`Invalid module id: ${def.id}`);
    if (byId.has(def.id)) throw new Error(`Duplicate module id: ${def.id}`);
    if (!Number.isInteger(def.version) || def.version < 1) {
      throw new Error(`Invalid version for module ${def.id}`);
    }
    for (let v = 1; v < def.version; v++) {
      if (!def.upgrade?.[v])
        throw new Error(`Module ${def.id} is missing upgrade step ${v} → ${v + 1}`);
    }
    byId.set(def.id, def);
  }
  return {
    all: [...byId.values()],
    get: (id) => byId.get(id),
    require(id) {
      const def = byId.get(id);
      if (!def) throw new Error(`Unknown module: ${id}`);
      return def;
    },
  };
}

/** Brings a stored payload up to the module's current version. */
export function upgradeEntryData(
  def: AnyModuleDefinition,
  data: unknown,
  fromVersion: number,
): unknown {
  if (fromVersion > def.version) {
    throw new Error(`Entry version ${fromVersion} is newer than module ${def.id} v${def.version}`);
  }
  let current = data;
  for (let v = fromVersion; v < def.version; v++) {
    const step = def.upgrade?.[v];
    if (!step) throw new Error(`Module ${def.id} is missing upgrade step ${v} → ${v + 1}`);
    current = step(current);
  }
  return current;
}

/**
 * The registered modules. Add new modules here (one line) —
 * see CLAUDE.md "Neues Modul hinzufügen".
 */
export const moduleRegistry = createModuleRegistry([
  waterModule,
  moodModule,
  sleepModule,
  habitModule,
  activityModule,
  mealModule,
  measurementModule,
  symptomModule,
  focusModule,
  customModule,
]);
