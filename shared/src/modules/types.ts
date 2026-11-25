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
  /** Validates `entries.value` (the primary value). Use `.nullable()` if a module has none. */
  valueSchema: z.ZodType<number | null>;
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
  /**
   * Computes the primary value on the server from the entry itself (e.g. sleep duration
   * from start and end). If present, a value sent by the client is ignored.
   */
  deriveValue?: (entry: { occurredAt: string; endsAt: string | null; data: Data }) => number | null;
  /**
   * Per-day completion rule for modules without goals (e.g. habits): whether the tracker
   * is due on a day and how many entries complete it. Used for "met" days and streaks.
   */
  dailyCompletion?: (config: Config, date: string) => { due: boolean; target: number };
  /** Whether the user can create own trackers of this module (e.g. habits). */
  userTrackers?: boolean;
  /** Dashboard widgets not bound to one tracker (e.g. all habits), seeded once per type. */
  defaultWidgets?: readonly WidgetSeed[];
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
  /** Goals created together with the tracker (valid for all history). */
  goals?: readonly GoalSeed[];
  /** Dashboard widgets created together with the tracker. */
  widgets?: readonly WidgetSeed[];
}

export interface GoalSeed {
  metric: 'sum' | 'count' | 'avg' | 'last' | 'duration';
  period: 'day' | 'week' | 'month';
  comparator: 'gte' | 'lte' | 'between';
  target: number;
  targetMax?: number;
}

export interface WidgetSeed {
  /** Widget type, resolved by the frontend widget registry (e.g. 'water.progress'). */
  type: string;
  size: 'sm' | 'md' | 'lg';
}

// Accepts definitions with any concrete Config/Data types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous registry
export type AnyModuleDefinition = ModuleDefinition<any, any>;
