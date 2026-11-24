import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createModuleRegistry, upgradeEntryData } from './registry.ts';
import type { ModuleDefinition } from './types.ts';

function makeModule(overrides: Partial<ModuleDefinition> = {}): ModuleDefinition {
  return {
    id: 'example',
    version: 1,
    configSchema: z.object({}),
    dataSchema: z.object({}),
    valueSchema: z.number().nullable(),
    fields: [],
    entryKind: 'instant',
    dayAssignment: 'start',
    primaryValue: { label: 'Wert', aggregate: 'sum' },
    ...overrides,
  };
}

describe('module registry', () => {
  it('looks up modules by id', () => {
    const registry = createModuleRegistry([makeModule()]);
    expect(registry.get('example')?.id).toBe('example');
    expect(registry.get('missing')).toBeUndefined();
    expect(() => registry.require('missing')).toThrow('Unknown module');
  });

  it('rejects duplicate and malformed ids', () => {
    expect(() => createModuleRegistry([makeModule(), makeModule()])).toThrow('Duplicate');
    expect(() => createModuleRegistry([makeModule({ id: 'Bad Id' })])).toThrow('Invalid module id');
  });

  it('requires a complete upgrade chain', () => {
    expect(() => createModuleRegistry([makeModule({ version: 2 })])).toThrow(
      'missing upgrade step 1',
    );
  });

  it('upgrades stored payloads step by step', () => {
    const def = makeModule({
      version: 3,
      upgrade: {
        1: (d) => ({ ...(d as object), b: 1 }),
        2: (d) => ({ ...(d as object), c: 2 }),
      },
    });
    expect(upgradeEntryData(def, { a: 0 }, 1)).toEqual({ a: 0, b: 1, c: 2 });
    expect(upgradeEntryData(def, { a: 0 }, 3)).toEqual({ a: 0 });
    expect(() => upgradeEntryData(def, {}, 4)).toThrow('newer');
  });
});
