import { resolveAggregate } from '../modules/behaviour.ts';
import type { AnyModuleDefinition } from '../modules/types.ts';

/**
 * Whether a day without entries means "0" for a tracker (ADR-036): only for additive,
 * point-in-time trackers (no water = 0 ml). For periods such as sleep a missing night
 * means "not recorded", not 0 hours. `config` matters for custom trackers (ADR-041).
 */
export function isZeroWhenMissing(module: AnyModuleDefinition, config?: unknown): boolean {
  const aggregate = resolveAggregate(module, config);
  return (aggregate === 'sum' || aggregate === 'count') && module.entryKind === 'instant';
}
