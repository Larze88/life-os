import type { ComponentType } from 'react';

/**
 * Frontend side of the module system (docs/ARCHITECTURE.md §4). Each module contributes
 * UI pieces; the shared ModuleDefinition (validation, fields) lives in @lifeos/shared.
 * Empty in phase 1 — water, mood, habits and sleep follow in phase 3.
 */
export interface FrontendModule {
  /** Must match the id in @lifeos/shared's module registry. */
  id: string;
  label: string;
  /** Tailwind color token, e.g. 'water' → bg-water / text-water. */
  color: string;
  Widget?: ComponentType<{ trackerId: string }>;
  QuickActions?: ComponentType<{ trackerId: string }>;
  EntryForm?: ComponentType<{ trackerId: string; onDone: () => void }>;
  DetailView?: ComponentType<{ trackerId: string }>;
}

export const frontendModules: readonly FrontendModule[] = [];

export function getFrontendModule(id: string): FrontendModule | undefined {
  return frontendModules.find((m) => m.id === id);
}
