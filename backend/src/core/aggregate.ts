import type { ModuleDefinition } from '@lifeos/shared';

type Aggregate = ModuleDefinition['primaryValue']['aggregate'];

/** Aggregates the primary values of one day. Entries must be sorted by occurredAt. */
export function aggregateValues(
  aggregate: Aggregate,
  values: readonly (number | null)[],
): number | null {
  const numbers = values.filter((v): v is number => v !== null);
  if (aggregate === 'count') return values.length;
  if (numbers.length === 0) return null;
  switch (aggregate) {
    case 'sum':
      return numbers.reduce((a, b) => a + b, 0);
    case 'avg':
      return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    case 'max':
      return Math.max(...numbers);
    case 'last':
      return numbers[numbers.length - 1]!;
  }
}
