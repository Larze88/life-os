import type { z } from 'zod';
import type { FieldDefinition } from '../fields/index.ts';

/**
 * Contract every tracking module implements ("modules are code, trackers are data",
 * ADR-003). See docs/ARCHITECTURE.md §4 and the checklist in CLAUDE.md.
 */
export interface ModuleDefinition<Config = unknown, Data = unknown> {
  /** Stable identifier, never renamed (e.g. 'water'). */
  id: string;
  /** Version of the entry payload schema; bump together with an `upgrade` step. */
  version: number;
  /** Validates `trackers.config`. */
  configSchema: z.ZodType<Config>;
  /** Validates `entries.data` (current version). */
  dataSchema: z.ZodType<Data>;
  /** Declarative fields for generic forms. */
  fields: readonly FieldDefinition[];
  /** 'instant' = single moment, 'span' = period with start and end (sleep, workouts, focus). */
  entryKind: 'instant' | 'span';
  /** Which moment determines the logical day of a span entry; sleep uses 'end'. */
  dayAssignment: 'start' | 'end';
  /** Meaning of `entries.value` and how it aggregates per day. */
  primaryValue: {
    label: string;
    unit?: string;
    aggregate: 'sum' | 'avg' | 'last' | 'count' | 'max';
  };
  /** Upgrade functions: upgrade[n] converts a payload from version n to n + 1. */
  upgrade?: Readonly<Record<number, (data: unknown) => unknown>>;
  /** Trackers created on first start (idempotent seed). */
  defaultTrackers?: readonly TrackerSeed<Config>[];
}

export interface TrackerSeed<Config = unknown> {
  key: string;
  name: string;
  icon?: string;
  color?: string;
  config: Config;
}

// Accepts definitions with any concrete Config/Data types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous registry
export type AnyModuleDefinition = ModuleDefinition<any, any>;
