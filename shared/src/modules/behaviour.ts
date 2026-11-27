import type { Aggregate, AnyModuleDefinition } from './types.ts';

/** Daily aggregate of a tracker: per-tracker override (custom trackers) or the module default. */
export function resolveAggregate(module: AnyModuleDefinition, config: unknown): Aggregate {
  return module.forTracker?.(config)?.aggregate ?? module.primaryValue.aggregate;
}
