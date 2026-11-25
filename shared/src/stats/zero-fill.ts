import type { AnyModuleDefinition } from '../modules/types.ts';

/**
 * Whether a day without entries means "0" for a module (ADR-036): only for additive,
 * point-in-time modules (no water = 0 ml). For periods such as sleep a missing night
 * means "not recorded", not 0 hours.
 */
export function isZeroWhenMissing(module: AnyModuleDefinition): boolean {
  const { aggregate } = module.primaryValue;
  return (aggregate === 'sum' || aggregate === 'count') && module.entryKind === 'instant';
}
